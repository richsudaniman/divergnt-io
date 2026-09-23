import React, { useState } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Target, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DynamicQA({ noteChunks }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState(null);

  const generateQuestion = async () => {
    setIsGenerating(true);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setFeedback(null);

    try {
      const randomChunk = noteChunks[Math.floor(Math.random() * noteChunks.length)];
      
      const prompt = `Based on this educational content, create a challenging multiple-choice question that tests deep understanding.

Content:
---
${randomChunk.text}
---

Create a question that:
- Tests conceptual understanding or application.
- Has 4 plausible options.
- Includes a brief explanation for why the correct answer is right and why the others are wrong.
- Has one clearly correct answer.

Return JSON with this exact schema:
{
  "question": "string",
  "options": [
    {"key": "A", "value": "string"},
    {"key": "B", "value": "string"},
    {"key": "C", "value": "string"},
    {"key": "D", "value": "string"}
  ],
  "correct_answer_key": "A",
  "explanation": "A detailed explanation of the correct answer."
}`;

      const result = await InvokeLLM({ 
        prompt, 
        response_json_schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  value: { type: "string" }
                },
                required: ["key", "value"]
              }
            },
            correct_answer_key: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["question", "options", "correct_answer_key", "explanation"]
        }
      });
      
      setCurrentQuestion(result);
      
    } catch (error) {
      console.error("Error generating question:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    
    setIsAnswered(true);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer_key;
    
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
    
    setFeedback({
      isCorrect,
      explanation: currentQuestion.explanation
    });
  };

  const getOptionStyle = (optionKey) => {
    if (!isAnswered) return "border-[var(--border)] hover:bg-[var(--accent)] cursor-pointer";
    
    if (optionKey === currentQuestion.correct_answer_key) {
      return "border-2 border-[var(--soft-green)]/70 bg-[var(--soft-green-light)] text-[var(--soft-green-dark)]";
    }
    if (optionKey === selectedAnswer && optionKey !== currentQuestion.correct_answer_key) {
      return "border-2 border-[var(--soft-pink)]/70 bg-[var(--soft-pink-light)] text-[var(--soft-pink-dark)]";
    }
    return "border-[var(--border)] opacity-60";
  };

  const accuracyPercentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-[var(--text-main)] mb-3">
          🎯 Dynamic Q&A
        </h3>
        <p className="text-[var(--text-muted)] leading-relaxed mb-6">
          Test your knowledge with auto-generated questions from your notes.
        </p>
        
        {score.total > 0 && (
          <div className="flex items-center justify-center gap-6 bg-[var(--accent)] p-4 rounded-2xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-main)]">{score.correct}/{score.total}</div>
              <div className="text-sm text-[var(--text-muted)]">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--soft-green)]">{accuracyPercentage}%</div>
              <div className="text-sm text-[var(--text-muted)]">Accuracy</div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {currentQuestion ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-soft)] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={isAnswered}>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <Label
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getOptionStyle(option.key)}`}
                      >
                        <RadioGroupItem value={option.key} id={`option-${index}`} />
                        <span className="flex-1 text-base">{option.value}</span>
                        {isAnswered && option.key === currentQuestion.correct_answer_key && (
                          <Check className="w-5 h-5 text-[var(--soft-green)]" />
                        )}
                        {isAnswered && option.key === selectedAnswer && option.key !== currentQuestion.correct_answer_key && (
                          <X className="w-5 h-5 text-[var(--soft-pink)]" />
                        )}
                      </Label>
                    ))}
                  </div>
                </RadioGroup>

                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      feedback.isCorrect 
                        ? 'bg-[var(--soft-green-light)] text-[var(--soft-green-dark)]' 
                        : 'bg-[var(--soft-pink-light)] text-[var(--soft-pink-dark)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {feedback.isCorrect ? (
                        <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="font-medium leading-relaxed">{feedback.explanation}</p>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  {!isAnswered ? (
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer}
                      className="flex-1 bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white rounded-xl shadow-[var(--shadow-soft)]"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button
                      onClick={generateQuestion}
                      className="flex-1 bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white rounded-xl shadow-[var(--shadow-soft)]"
                    >
                      Next Question
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Button
              onClick={generateQuestion}
              disabled={isGenerating}
              className="bg-[var(--soft-green)] hover:bg-[var(--soft-green-dark)] text-white px-8 py-4 text-lg rounded-2xl shadow-[var(--shadow-soft)]"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Target className="w-5 h-5 mr-2" />
              )}
              Start Quiz
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}