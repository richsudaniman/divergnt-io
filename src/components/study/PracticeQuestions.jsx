import React, { useState, useEffect } from 'react';
import { StudyQuestion } from '@/entities/StudyQuestion';
import { InvokeLLM } from '@/integrations/Core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Loader2,
  Coffee,
  RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PracticeQuestions({ examId, sectionId, sectionTitle, sectionContent, onActivityComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBreakMessage, setShowBreakMessage] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      generateQuestions();
    }
  }, [examId, sectionId]);

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Based on this study material, create 8-10 multiple choice practice questions.

Material: "${sectionContent}"

Create questions that test understanding of key concepts. Each question should have 4 options with only one correct answer. Include an explanation for the correct answer.`;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  questionText: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correctAnswer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
                }
              }
            }
          }
        }
      });

      const generatedQuestions = result.questions || [];
      
      // Save to database
      const questionsToCreate = generatedQuestions.map(q => ({
        examId,
        topic: sectionTitle,
        questionType: 'multiple_choice',
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium'
      }));

      const savedQuestions = await StudyQuestion.bulkCreate(questionsToCreate);
      setQuestions(savedQuestions);
    } catch (error) {
      console.error("Error generating questions:", error);
      // Fallback questions
      setQuestions([{
        id: 'fallback-1',
        questionText: `What is the main topic of: ${sectionTitle}?`,
        options: ['Option A', 'Option B', 'Option C', 'Review the material'],
        correctAnswer: 'Review the material',
        explanation: 'This is a fallback question. Please review the section material.',
        difficulty: 'medium'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) return;
    
    const question = questions[currentIndex];
    const correct = selectedAnswer === question.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    
    const newStats = {
      correct: sessionStats.correct + (correct ? 1 : 0),
      total: sessionStats.total + 1
    };
    setSessionStats(newStats);

    // Update question stats
    if (question.id !== 'fallback-1') {
      await StudyQuestion.update(question.id, {
        timesAttempted: (question.timesAttempted || 0) + 1,
        timesCorrect: (question.timesCorrect || 0) + (correct ? 1 : 0),
        lastAttempted: new Date().toISOString()
      });
    }

    // Check if we've completed enough for a break
    if (newStats.total >= 5) {
      setShowBreakMessage(true);
      // Notify parent component of activity completion
      if (onActivityComplete) {
        onActivityComplete('questions', newStats.total);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of questions - restart
      setCurrentIndex(0);
    }
    setSelectedAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, total: 0 });
    setCurrentIndex(0);
    setSelectedAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    setShowBreakMessage(false);
  };

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--dopamine-blue-main)] mx-auto mb-4" />
        <p className="text-lg text-[var(--text-muted)]">Generating practice questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">No practice questions available for this section.</p>
      </div>
    );
  }

  if (showBreakMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl border border-purple-200"
      >
        <Coffee className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h3 className="text-2xl font-bold text-purple-800 mb-3">Excellent Work! Break Time 🎉</h3>
        <p className="text-lg text-purple-700 mb-6">
          You've answered {sessionStats.total} questions! You got {sessionStats.correct} correct ({Math.round((sessionStats.correct/sessionStats.total) * 100)}%).
          Time to let your brain process this information.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={resetSession} variant="outline" className="rounded-xl">
            Continue Practice
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress and Stats */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <HelpCircle className="w-4 h-4 mr-2" />
            Question {currentIndex + 1} of {questions.length}
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

      {/* Question Card */}
      <Card className="bg-white border-2 border-slate-200 rounded-3xl shadow-lg">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-6">
            {currentQuestion.questionText}
          </h3>

          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={showResult}
            className="space-y-4"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className={`text-base cursor-pointer flex-1 p-3 rounded-lg transition-colors ${
                    showResult
                      ? option === currentQuestion.correctAnswer
                        ? 'bg-green-100 text-green-800 font-semibold'
                        : option === selectedAnswer && !isCorrect
                        ? 'bg-red-100 text-red-800'
                        : 'text-gray-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-lg ${
                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}

          <div className="mt-8 flex justify-end">
            {!showResult ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white rounded-xl"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="bg-[var(--focus-purple-main)] hover:bg-[var(--focus-purple-dark)] text-white rounded-xl"
              >
                Next Question
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}