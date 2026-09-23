import React, { useState, useEffect } from 'react';
import { StudyNotesSection } from '@/entities/StudyNotesSection';
import { InvokeLLM } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  BookOpen,
  Target,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PracticeExam({ examId, examName, onExamComplete }) {
  const [examState, setExamState] = useState('setup'); // 'setup', 'active', 'completed', 'review'
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes default
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [examSettings, setExamSettings] = useState({
    duration: 60, // minutes
    questionCount: 20,
    includeAllSections: true
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let interval = null;
    if (isTimerActive && timeRemaining > 0 && examState === 'active') {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            handleTimeUp();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, examState]);

  const generateExamQuestions = async () => {
    setLoading(true);
    try {
      // Get all note sections for this exam
      const sections = await StudyNotesSection.filter({ examId: examId }, 'sectionOrder');
      
      if (sections.length === 0) {
        throw new Error("No study sections found for this exam");
      }

      // Generate questions from all sections
      const allQuestions = [];
      for (const section of sections) {
        const questionsPerSection = Math.ceil(examSettings.questionCount / sections.length);
        
        const prompt = `Create ${questionsPerSection} multiple-choice questions based on this study material for a practice exam.

Section: ${section.title}
Content: "${section.content.substring(0, 2000)}..."

Requirements:
- Mix of difficulty levels (easy, medium, hard)
- Clear, unambiguous questions
- 4 answer choices each (A, B, C, D)
- Questions should test understanding, not just memorization
- Include some application and analysis questions

Return ONLY valid JSON.`;

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

        const sectionQuestions = result.questions?.map(q => ({
          ...q,
          sectionTitle: section.title,
          sectionId: section.id
        })) || [];

        allQuestions.push(...sectionQuestions);
      }

      // Shuffle and limit questions
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const examQuestions = shuffled.slice(0, examSettings.questionCount);
      
      setQuestions(examQuestions);
      setTimeRemaining(examSettings.duration * 60);
    } catch (error) {
      console.error("Error generating exam questions:", error);
      // Fallback questions
      setQuestions([{
        questionText: "This is a sample question. What is the main topic of your exam?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option A",
        explanation: "This is a sample explanation.",
        difficulty: "easy",
        sectionTitle: "Sample Section"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    await generateExamQuestions();
    setExamState('active');
    setIsTimerActive(true);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
  };

  const handleAnswerSelect = (questionIndex, selectedAnswer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedAnswer
    }));
  };

  const handleTimeUp = () => {
    setIsTimerActive(false);
    finishExam();
  };

  const finishExam = () => {
    setIsTimerActive(false);
    setExamState('completed');
    calculateResults();
  };

  const calculateResults = () => {
    let correct = 0;
    let total = questions.length;
    const detailed = [];

    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correct++;

      detailed.push({
        question: question.questionText,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
        sectionTitle: question.sectionTitle,
        difficulty: question.difficulty
      });
    });

    const percentage = Math.round((correct / total) * 100);
    const results = {
      correct,
      total,
      percentage,
      grade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F',
      timeUsed: (examSettings.duration * 60) - timeRemaining,
      detailed
    };

    setResults(results);
    
    // Mark exam-related study bursts as completed if score is good
    if (percentage >= 70 && onExamComplete) {
      onExamComplete('practice_exam', results);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const resetExam = () => {
    setExamState('setup');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeRemaining(examSettings.duration * 60);
    setIsTimerActive(false);
    setResults(null);
    setQuestions([]);
  };

  // Setup Phase
  if (examState === 'setup') {
    return (
      <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-[var(--focus-purple-light)] to-[var(--dopamine-blue-light)] p-8 rounded-t-3xl">
          <CardTitle className="text-3xl font-bold text-[var(--focus-purple-dark)] flex items-center gap-4">
            <Trophy className="w-8 h-8" />
            Practice Exam: {examName}
          </CardTitle>
          <p className="text-lg text-[var(--focus-purple-dark)]/80 mt-2">
            Test your knowledge with a comprehensive practice exam
          </p>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 text-center border-2 border-[var(--border)]">
              <Clock className="w-12 h-12 mx-auto mb-4 text-[var(--dopamine-blue-main)]" />
              <h3 className="text-xl font-bold mb-2">Duration</h3>
              <div className="space-y-2">
                <select
                  value={examSettings.duration}
                  onChange={(e) => setExamSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </Card>

            <Card className="p-6 text-center border-2 border-[var(--border)]">
              <Target className="w-12 h-12 mx-auto mb-4 text-[var(--serotonin-green-main)]" />
              <h3 className="text-xl font-bold mb-2">Questions</h3>
              <div className="space-y-2">
                <select
                  value={examSettings.questionCount}
                  onChange={(e) => setExamSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                  <option value={20}>20 questions</option>
                  <option value={25}>25 questions</option>
                  <option value={30}>30 questions</option>
                </select>
              </div>
            </Card>

            <Card className="p-6 text-center border-2 border-[var(--border)]">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-[var(--novelty-accent-main)]" />
              <h3 className="text-xl font-bold mb-2">Coverage</h3>
              <Badge variant="secondary" className="text-sm">
                All Sections
              </Badge>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={startExam}
              disabled={loading}
              className="bg-gradient-to-r from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)] hover:opacity-90 text-white h-16 px-12 text-xl font-bold rounded-2xl shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Preparing Questions...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-3" />
                  Start Practice Exam
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active Exam Phase
  if (examState === 'active') {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-[var(--focus-purple-light)] to-[var(--dopamine-blue-light)] p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[var(--focus-purple-dark)]">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <Badge variant="secondary" className="mt-2">
                {currentQuestion?.sectionTitle}
              </Badge>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-[var(--dopamine-blue-dark)]'}`}>
                {formatTime(timeRemaining)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTimerActive(!isTimerActive)}
                className="mt-2"
              >
                {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-3 mt-4" />
        </CardHeader>

        <CardContent className="p-8">
          {currentQuestion && (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold mb-6 leading-relaxed">
                  {currentQuestion.questionText}
                </h3>
                
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, optionIndex) => (
                    <Button
                      key={optionIndex}
                      variant={userAnswers[currentQuestionIndex] === option ? "default" : "outline"}
                      onClick={() => handleAnswerSelect(currentQuestionIndex, option)}
                      className="w-full h-auto p-4 text-left justify-start rounded-xl"
                    >
                      <span className="font-semibold mr-3 text-lg">
                        {String.fromCharCode(65 + optionIndex)}.
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                
                <div className="flex gap-3">
                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={finishExam}
                      className="bg-[var(--serotonin-green-main)] hover:bg-[var(--serotonin-green-dark)] text-white px-8"
                    >
                      Finish Exam
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                      className="bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Results Phase
  if (examState === 'completed' && results) {
    const getGradeColor = (grade) => {
      const colors = {
        'A': 'text-green-600 bg-green-50',
        'B': 'text-blue-600 bg-blue-50',
        'C': 'text-yellow-600 bg-yellow-50',
        'D': 'text-orange-600 bg-orange-50',
        'F': 'text-red-600 bg-red-50'
      };
      return colors[grade] || 'text-gray-600 bg-gray-50';
    };

    return (
      <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-[var(--serotonin-green-light)] to-[var(--info-cyan-light)] p-8 rounded-t-3xl text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-[var(--serotonin-green-main)]" />
          <CardTitle className="text-3xl font-bold text-[var(--serotonin-green-dark)]">
            Practice Exam Complete!
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <div className={`text-4xl font-bold mb-2 ${getGradeColor(results.grade)}`}>
                {results.grade}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Grade</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-[var(--dopamine-blue-main)] mb-2">
                {results.percentage}%
              </div>
              <p className="text-sm text-[var(--text-muted)]">Score</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-[var(--focus-purple-main)] mb-2">
                {results.correct}/{results.total}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Correct</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-[var(--novelty-accent-main)] mb-2">
                {formatTime(results.timeUsed)}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Time Used</p>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Question Review</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.detailed.map((item, index) => (
                <Card key={index} className={`p-4 border-l-4 ${item.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    {item.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">{item.question}</p>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Your answer:</span> {item.userAnswer || 'Not answered'}</p>
                        <p><span className="font-medium">Correct answer:</span> {item.correctAnswer}</p>
                        {!item.isCorrect && (
                          <p className="text-gray-600"><span className="font-medium">Explanation:</span> {item.explanation}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {item.sectionTitle}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={resetExam}
              variant="outline"
              className="px-8 py-3"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake Exam
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}