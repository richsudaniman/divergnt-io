import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionGenerator({ sectionContent }) {
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleGenerateQuestion = async () => {
    setIsGenerating(true);
    setGeneratedQuestion(null);
    setSelectedAnswer(null);
    setFeedback(null);
    setIsAnswered(false);

    try {
      const prompt = `Based on the following text, create one simple multiple-choice question with 3-4 options (or a true/false question) to test understanding. The question should be clear and have only one correct answer.
      
      Text:
      ---
      ${sectionContent}
      ---
      
      Return a JSON object with this exact schema: { "question": "string", "options": ["string", "string"], "answer": "string" }. For true/false, use ["True", "False"] as options. The 'answer' must be one of the strings from the 'options' array.`;

      const schema = {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
        },
        required: ["question", "options", "answer"]
      };

      const result = await InvokeLLM({ prompt, response_json_schema: schema });
      if (result && result.options && result.options.length >= 2) {
        setGeneratedQuestion(result);
      }
      
    } catch (error) {
      console.error("Error generating question:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    setIsAnswered(true);
    if (selectedAnswer === generatedQuestion.answer) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };
  
  const getOptionStyle = (option) => {
    if (!isAnswered) return "border-[var(--border)] hover:bg-[var(--accent)]";
    if (option === generatedQuestion.answer) return "border-2 border-[var(--soft-green)]/70 bg-[var(--soft-green-light)] text-[var(--soft-green-dark)]";
    if (option === selectedAnswer && option !== generatedQuestion.answer) return "border-2 border-[var(--soft-pink)]/70 bg-[var(--soft-pink-light)] text-[var(--soft-pink-dark)]";
    return "border-[var(--border)] opacity-60";
  };
  
  return (
    <div className="my-8">
      <AnimatePresence mode="wait">
      {generatedQuestion ? (
        <motion.div
          key="question"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/50 border-[var(--border)] shadow-[var(--shadow-soft)] rounded-2xl">
            <CardContent className="p-6">
              <p className="font-semibold text-lg text-[var(--text-main)] mb-4">{generatedQuestion.question}</p>
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                <div className="space-y-3">
                  {generatedQuestion.options.map((option, index) => (
                    <Label
                      key={index}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${getOptionStyle(option)}`}
                    >
                      <RadioGroupItem value={option} id={`q-option-${index}`} />
                      <span className="flex-1 text-base">{option}</span>
                      {isAnswered && option === generatedQuestion.answer && <Check className="w-5 h-5 text-[var(--soft-green)]" />}
                      {isAnswered && option === selectedAnswer && option !== generatedQuestion.answer && <X className="w-5 h-5 text-[var(--soft-pink)]" />}
                    </Label>
                  ))}
                </div>
              </RadioGroup>
              <div className="mt-5">
                {!isAnswered ? (
                  <Button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="w-full rounded-xl bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white shadow-[var(--shadow-soft)]">Check Answer</Button>
                ) : (
                  <Button onClick={handleGenerateQuestion} variant="outline" className="w-full rounded-xl border-[var(--border)] hover:bg-[var(--accent)]">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Ask Another Question
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button 
            onClick={handleGenerateQuestion} 
            variant="outline"
            className="w-full h-14 text-base bg-white/50 border-[var(--border)] hover:bg-[var(--accent)] rounded-2xl"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5 text-[var(--soft-purple)]" />
            )}
            Test My Knowledge
          </Button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}