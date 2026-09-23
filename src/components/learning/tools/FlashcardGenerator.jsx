import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, ArrowLeft, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Flashcard = ({ card, isFlipped, onFlip }) => {
  return (
    <div className="w-full h-64 perspective-1000" onClick={onFlip}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden' }} className="absolute w-full h-full">
          <Card className="w-full h-full flex items-center justify-center p-6 bg-white border-2 border-[var(--border)] shadow-[var(--shadow-soft)] rounded-3xl">
            <p className="text-2xl text-center font-semibold text-[var(--text-main)]">{card.question}</p>
          </Card>
        </div>
        {/* Back */}
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute w-full h-full">
          <Card className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-[var(--soft-blue-light)] to-[var(--soft-purple-light)] border-2 border-[var(--soft-blue)]/30 shadow-[var(--shadow-soft)] rounded-3xl">
            <p className="text-xl text-center font-medium text-[var(--soft-blue-dark)] leading-relaxed">{card.answer}</p>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default function FlashcardGenerator({ noteChunks }) {
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateFlashcards = async () => {
    setIsLoading(true);
    setError(null);
    setFlashcards([]);
    try {
      const content = noteChunks.map(chunk => chunk.text).join('\n\n');
      
      const prompt = `Based on the following educational text, create a set of 5-7 flashcards to help a student study. Each flashcard should have a "question" (a key term, concept, or simple question) and a concise "answer" (a definition or explanation).

Text:
---
${content}
---

Return a JSON object with a single key "flashcards" which is an array of objects, where each object has "question" and "answer" keys.`;
      
      const schema = {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              },
              required: ["question", "answer"]
            }
          }
        },
        required: ["flashcards"]
      };

      const result = await InvokeLLM({ prompt, response_json_schema: schema });
      if (result && result.flashcards && result.flashcards.length > 0) {
        setFlashcards(result.flashcards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
      } else {
        setError("Couldn't generate flashcards from this content.");
      }
    } catch (err) {
      console.error("Error generating flashcards:", err);
      setError("An error occurred while generating flashcards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
     setTimeout(() => {
        setCurrentCardIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  return (
    <div className="space-y-6">
       <div className="text-center">
        <h3 className="text-2xl font-semibold text-[var(--text-main)] mb-2">⚡ Flashcard Review</h3>
        <p className="text-[var(--text-muted)]">Generate flashcards from your notes to test your recall.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-[var(--soft-blue)] animate-spin" />
          <p className="mt-4 text-lg text-[var(--text-muted)] font-medium">Brewing up some flashcards...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="h-64 flex flex-col items-center justify-center bg-[var(--soft-pink-light)] rounded-2xl border-2 border-[var(--soft-pink)]/30">
            <p className="text-[var(--soft-pink-dark)] font-semibold">{error}</p>
            <Button onClick={generateFlashcards} variant="outline" className="mt-4 border-[var(--border)] hover:bg-[var(--accent)]">Try Again</Button>
        </div>
      )}

      <AnimatePresence>
        {!isLoading && flashcards.length > 0 && (
          <motion.div
            key="flashcard-deck"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Flashcard
              card={flashcards[currentCardIndex]}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />
            <div className="flex items-center justify-between mt-6">
              <Button onClick={handlePrev} variant="outline" className="rounded-xl border-[var(--border)] hover:bg-[var(--accent)]">
                <ArrowLeft className="w-5 h-5 mr-2" /> Prev
              </Button>
              <p className="font-semibold text-[var(--text-muted)]">
                {currentCardIndex + 1} / {flashcards.length}
              </p>
              <Button onClick={handleNext} variant="outline" className="rounded-xl border-[var(--border)] hover:bg-[var(--accent)]">
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="text-center mt-6">
                <Button onClick={generateFlashcards} variant="ghost" className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    Generate New Set
                </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && flashcards.length === 0 && !error && (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50/70 border-2 border-dashed border-slate-300 rounded-3xl">
            <Layers className="w-16 h-16 text-slate-400 mb-4"/>
            <h4 className="text-xl font-semibold text-[var(--text-main)] mb-2">Ready to review?</h4>
            <p className="text-[var(--text-muted)] mb-6 max-w-sm text-center">Click the button to generate a set of flashcards based on the notes from this video.</p>
            <Button onClick={generateFlashcards} size="lg" className="bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white font-semibold rounded-xl shadow-[var(--shadow-soft)]">
                <Sparkles className="w-5 h-5 mr-2"/>
                Generate Flashcards
            </Button>
        </div>
      )}
    </div>
  );
}