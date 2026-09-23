import React, { useState, useEffect } from 'react';
import { StudyFlashcard } from '@/entities/StudyFlashcard';
import { InvokeLLM } from '@/integrations/Core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Brain,
  Loader2,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlashcardReview({ examId, sectionId, sectionTitle, sectionContent, onActivityComplete }) {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBreakMessage, setShowBreakMessage] = useState(false);

  useEffect(() => {
    if (flashcards.length === 0) {
      generateFlashcards();
    }
  }, [examId, sectionId]);

  const generateFlashcards = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Based on this study material, create 8-10 flashcards for active recall practice.

Material: "${sectionContent}"

Create flashcards that test key concepts, definitions, and important details. Make questions clear and concise.`;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
                }
              }
            }
          }
        }
      });

      const generatedCards = result.flashcards || [];
      
      // Save to database
      const cardsToCreate = generatedCards.map(card => ({
        examId,
        topic: sectionTitle,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty || 'medium',
        needsReview: true
      }));

      const savedCards = await StudyFlashcard.bulkCreate(cardsToCreate);
      setFlashcards(savedCards);
    } catch (error) {
      console.error("Error generating flashcards:", error);
      // Fallback flashcards
      setFlashcards([{
        id: 'fallback-1',
        question: `What is the main concept covered in: ${sectionTitle}?`,
        answer: 'Review the section content to understand the key concepts.',
        difficulty: 'medium'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = async (isCorrect) => {
    const card = flashcards[currentIndex];
    const newStats = {
      correct: sessionStats.correct + (isCorrect ? 1 : 0),
      total: sessionStats.total + 1
    };
    setSessionStats(newStats);

    // Update flashcard stats
    if (card.id !== 'fallback-1') {
      await StudyFlashcard.update(card.id, {
        timesReviewed: (card.timesReviewed || 0) + 1,
        timesCorrect: (card.timesCorrect || 0) + (isCorrect ? 1 : 0),
        lastReviewed: new Date().toISOString(),
        needsReview: !isCorrect // Still needs review if answered incorrectly
      });
    }

    // Check if we've completed enough for a break
    if (newStats.total >= 5) {
      setShowBreakMessage(true);
      // Notify parent component of activity completion
      if (onActivityComplete) {
        onActivityComplete('flashcards', newStats.total);
      }
    }

    // Move to next card
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // End of deck - restart or show completion
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    }, 1000);
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, total: 0 });
    setCurrentIndex(0);
    setShowAnswer(false);
    setShowBreakMessage(false);
  };

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--dopamine-blue-main)] mx-auto mb-4" />
        <p className="text-lg text-[var(--text-muted)]">Generating flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">No flashcards available for this section.</p>
      </div>
    );
  }

  if (showBreakMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl border border-green-200"
      >
        <Coffee className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-2xl font-bold text-green-800 mb-3">Great Job! Time for a Break 🎉</h3>
        <p className="text-lg text-green-700 mb-6">
          You've completed {sessionStats.total} flashcards! You got {sessionStats.correct} correct.
          Taking breaks helps with retention.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={resetSession} variant="outline" className="rounded-xl">
            Continue Reviewing
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress and Stats */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Brain className="w-4 h-4 mr-2" />
            Card {currentIndex + 1} of {flashcards.length}
          </Badge>
          <Badge variant="outline">
            Session: {sessionStats.correct}/{sessionStats.total} correct
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={resetSession}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <Progress value={progressPercent} className="h-2 bg-slate-100" />

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${showAnswer}`}
          initial={{ opacity: 0, rotateY: showAnswer ? -90 : 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: showAnswer ? 90 : -90 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="min-h-[300px] bg-white border-2 border-slate-200 rounded-3xl shadow-lg">
            <CardContent className="p-8 flex flex-col justify-center items-center text-center h-full">
              <div className="flex-1 flex items-center justify-center">
                {!showAnswer ? (
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">Question</h3>
                    <p className="text-lg text-[var(--text-muted)] leading-relaxed">
                      {currentCard.question}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold text-green-700 mb-4">Answer</h3>
                    <p className="text-lg text-[var(--foreground)] leading-relaxed mb-6">
                      {currentCard.answer}
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => handleAnswer(false)}
                        variant="outline"
                        className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 rounded-xl"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Incorrect
                      </Button>
                      <Button
                        onClick={() => handleAnswer(true)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Correct
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {!showAnswer && (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="mt-6 bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white rounded-xl"
                >
                  Show Answer
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}