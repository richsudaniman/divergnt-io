import React, { useState } from 'react';
import { BrainDump } from '@/entities/BrainDump';
import { ProcessedVideo } from '@/entities/ProcessedVideo';
import { StudyNotesSection } from '@/entities/StudyNotesSection';
import { Exam } from '@/entities/Exam';
import { InvokeLLM } from '@/integrations/Core';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import {
  Route,
  ArrowRight,
  Clock,
  Target,
  Brain,
  Lightbulb,
  CheckCircle2,
  Play,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const StudyPathRecommender = ({ brainDumpId, userGoal }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyPath, setStudyPath] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    timeAvailable: 'moderate', // low, moderate, high
    difficulty: 'adaptive', // easy, adaptive, challenging
    focus: 'comprehensive' // focused, comprehensive, exam-prep
  });

  const generateStudyPath = async () => {
    setIsGenerating(true);
    try {
      // Load brain dump and analyze interests
      const brainDumps = await BrainDump.filter({ id: brainDumpId });
      if (brainDumps.length === 0) return;
      
      const brainDump = brainDumps[0];
      const concepts = brainDump.extracted_concepts || [];
      const interests = concepts.map(c => c.name).join(', ');

      // Load user's study ecosystem
      const [videos, exams, noteSections] = await Promise.all([
        ProcessedVideo.list('-created_date'),
        Exam.list('-created_date'),
        StudyNotesSection.list('-created_date')
      ]);

      // Generate personalized study path
      const pathResult = await InvokeLLM({
        prompt: `Create a personalized study path based on this brain dump and available materials:

        BRAIN DUMP INTERESTS: ${interests}
        USER GOAL: ${userGoal || 'General learning and mastery'}
        TIME AVAILABLE: ${userPreferences.timeAvailable}
        PREFERRED DIFFICULTY: ${userPreferences.difficulty}
        FOCUS TYPE: ${userPreferences.focus}

        AVAILABLE MATERIALS:
        - Videos: ${videos.map(v => v.title).join(', ')}
        - Exams: ${exams.map(e => e.name).join(', ')}
        - Study Sections: ${noteSections.map(n => n.title).join(', ')}

        Create a step-by-step learning path that:
        1. Builds on the user's current interests and knowledge
        2. Uses available materials effectively
        3. Progresses logically from basics to advanced
        4. Includes practical applications and assessments
        5. Is optimized for ADHD learning patterns (variety, engagement, clear progress)

        Return a structured learning path with estimated times and difficulty levels.`,
        response_json_schema: {
          type: "object",
          properties: {
            path_title: { type: "string" },
            total_estimated_time: { type: "string" },
            difficulty_level: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  activity_type: { type: "string", enum: ["watch_video", "review_notes", "practice_exam", "brain_dump", "reflection"] },
                  material_id: { type: "string" },
                  material_title: { type: "string" },
                  estimated_time: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  skills_gained: { type: "array", items: { type: "string" } },
                  prerequisites: { type: "array", items: { type: "string" } }
                }
              }
            },
            learning_outcomes: { type: "array", items: { type: "string" } },
            success_metrics: { type: "array", items: { type: "string" } }
          }
        }
      });

      setStudyPath(pathResult);
    } catch (error) {
      console.error('Failed to generate study path:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'watch_video': return Play;
      case 'review_notes': return Brain;
      case 'practice_exam': return Target;
      case 'brain_dump': return Lightbulb;
      case 'reflection': return CheckCircle2;
      default: return ArrowRight;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const startStudyStep = (step) => {
    // Navigate to appropriate page based on activity type
    switch (step.activity_type) {
      case 'watch_video':
        navigate(createPageUrl(`Results?id=${step.material_id}`));
        break;
      case 'review_notes':
        navigate(createPageUrl(`study-notes-viewer?id=${step.material_id}`));
        break;
      case 'practice_exam':
        navigate(createPageUrl(`StudyDashboard?id=${step.material_id}`));
        break;
      case 'brain_dump':
        navigate(createPageUrl('BrainDump'));
        break;
      default:
        console.log('Starting step:', step.title);
    }
  };

  return (
    <div className="space-y-6">
      {/* Path Generator */}
      {!studyPath && !isGenerating && (
        <Card className="border-2 border-dashed border-purple-200 bg-purple-50/30">
          <CardContent className="p-8 text-center">
            <Route className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-purple-900 mb-2">
              Create Your Personal Study Path
            </h3>
            <p className="text-purple-700 mb-6 max-w-md mx-auto">
              Let AI create a customized learning journey based on your interests and available materials.
            </p>
            
            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-2">
                  Time Available
                </label>
                <select
                  value={userPreferences.timeAvailable}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, timeAvailable: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-purple-200 bg-white"
                >
                  <option value="low">Limited (1-2 hrs/week)</option>
                  <option value="moderate">Moderate (3-5 hrs/week)</option>
                  <option value="high">Intensive (6+ hrs/week)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-2">
                  Difficulty
                </label>
                <select
                  value={userPreferences.difficulty}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-purple-200 bg-white"
                >
                  <option value="easy">Start Easy</option>
                  <option value="adaptive">Adaptive</option>
                  <option value="challenging">Challenge Me</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-2">
                  Focus Style
                </label>
                <select
                  value={userPreferences.focus}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, focus: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-purple-200 bg-white"
                >
                  <option value="focused">Focused Topics</option>
                  <option value="comprehensive">Comprehensive</option>
                  <option value="exam-prep">Exam Preparation</option>
                </select>
              </div>
            </div>
            
            <Button 
              onClick={generateStudyPath}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl"
            >
              <Route className="w-5 h-5 mr-2" />
              Generate My Path
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Crafting Your Personal Study Path
                </h3>
                <p className="text-purple-700">
                  Analyzing your interests and available materials...
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Study Path */}
      {studyPath && (
        <div className="space-y-6">
          {/* Path Overview */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
              <CardTitle className="text-purple-900 flex items-center gap-3">
                <Route className="w-6 h-6" />
                {studyPath.path_title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-purple-900">
                    {studyPath.total_estimated_time}
                  </div>
                  <div className="text-purple-600 text-sm">Total Time</div>
                </div>
                
                <div className="text-center p-4 bg-indigo-50 rounded-xl">
                  <Target className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-indigo-900">
                    {studyPath.steps?.length || 0} Steps
                  </div>
                  <div className="text-indigo-600 text-sm">Learning Activities</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <Brain className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-green-900 capitalize">
                    {studyPath.difficulty_level}
                  </div>
                  <div className="text-green-600 text-sm">Difficulty Level</div>
                </div>
              </div>

              {/* Learning Outcomes */}
              {studyPath.learning_outcomes && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">What You'll Learn:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {studyPath.learning_outcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{currentStep} / {studyPath.steps?.length || 0} completed</span>
                </div>
                <Progress 
                  value={(currentStep / (studyPath.steps?.length || 1)) * 100} 
                  className="h-2 bg-purple-100 [&>div]:bg-purple-500" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Study Steps */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
              <CardTitle className="text-gray-900">Your Learning Journey</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {studyPath.steps?.map((step, index) => {
                  const IconComponent = getActivityIcon(step.activity_type);
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isUpcoming = index > currentStep;

                  return (
                    <motion.div
                      key={step.step_number}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative p-4 rounded-xl border transition-all duration-200 ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : isCurrent
                          ? 'bg-blue-50 border-blue-200 shadow-md'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* Step connector line */}
                      {index < studyPath.steps.length - 1 && (
                        <div className="absolute left-8 top-16 w-0.5 h-8 bg-gray-200" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{step.title}</h4>
                            <Badge className={getDifficultyColor(step.difficulty)}>
                              {step.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {step.estimated_time}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-700 text-sm mb-3">{step.description}</p>
                          
                          {step.material_title && (
                            <div className="bg-white p-3 rounded-lg border mb-3">
                              <p className="text-sm text-gray-600 mb-1">Material:</p>
                              <p className="font-medium text-gray-900">{step.material_title}</p>
                            </div>
                          )}
                          
                          {step.skills_gained && step.skills_gained.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-600 mb-1">Skills you'll gain:</p>
                              <div className="flex flex-wrap gap-1">
                                {step.skills_gained.map((skill, skillIndex) => (
                                  <Badge key={skillIndex} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {isCurrent && (
                            <Button
                              onClick={() => startStudyStep(step)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start This Step
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudyPathRecommender;