import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/entities/Task';
import { TaskPhase } from '@/entities/TaskPhase'; 
import { TaskStep } from '@/entities/TaskStep';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskProgressiveViewPage() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('task'); // 'task', 'phases', 'steps'
  const [task, setTask] = useState(null);
  const [phases, setPhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTaskData = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    
    if (!taskId) {
      navigate(createPageUrl('HomeDashboard'));
      return;
    }

    setLoading(true);
    try {
      // Load task
      const tasks = await Task.filter({ id: taskId });
      if (tasks.length === 0) {
        navigate(createPageUrl('HomeDashboard'));
        return;
      }
      setTask(tasks[0]);

      // Load phases
      const phaseData = await TaskPhase.filter({ taskId });
      const sortedPhases = phaseData.sort((a, b) => a.phaseOrder - b.phaseOrder);
      
      // Load all steps for all phases
      const allSteps = await TaskStep.filter({ taskId });
      
      // Calculate completion status for each phase
      const phasesWithProgress = sortedPhases.map(phase => {
        const phaseSteps = allSteps.filter(step => step.phaseId === phase.id);
        const completedSteps = phaseSteps.filter(step => step.isCompleted);
        const progress = phaseSteps.length > 0 ? (completedSteps.length / phaseSteps.length) * 100 : 0;
        const isCompleted = progress === 100 && phaseSteps.length > 0;
        
        return {
          ...phase,
          steps: phaseSteps.sort((a, b) => a.stepOrder - b.stepOrder),
          progress,
          isCompleted
        };
      });
      
      setPhases(phasesWithProgress);
    } catch (error) {
      console.error('Error loading task data:', error);
      navigate(createPageUrl('HomeDashboard'));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  const handlePhaseClick = (phase) => {
    setCurrentPhase(phase);
    setSteps(phase.steps);
    setCurrentView('steps');
  };

  const handleStepToggle = async (step) => {
    try {
      const newCompletedStatus = !step.isCompleted;
      await TaskStep.update(step.id, {
        isCompleted: newCompletedStatus,
        completedAt: newCompletedStatus ? new Date().toISOString() : null
      });
      
      // Reload data to update progress
      await loadTaskData();
      
      // Check if we should auto-advance to next phase
      if (newCompletedStatus && currentPhase) {
        const updatedPhases = phases.map(p => {
          if (p.id === currentPhase.id) {
            const updatedSteps = p.steps.map(s => 
              s.id === step.id ? { ...s, isCompleted: newCompletedStatus } : s
            );
            const completedSteps = updatedSteps.filter(s => s.isCompleted);
            const progress = updatedSteps.length > 0 ? (completedSteps.length / updatedSteps.length) * 100 : 0;
            const isCompleted = progress === 100;
            return { ...p, steps: updatedSteps, progress, isCompleted };
          }
          return p;
        });
        
        const updatedCurrentPhase = updatedPhases.find(p => p.id === currentPhase.id);
        if (updatedCurrentPhase && updatedCurrentPhase.isCompleted) {
          // Find next incomplete phase
          const nextPhase = updatedPhases.find(p => p.phaseOrder > updatedCurrentPhase.phaseOrder && !p.isCompleted);
          if (nextPhase) {
            setTimeout(() => {
              handlePhaseClick(nextPhase);
            }, 1000); // Brief delay to show completion
          }
        }
      }
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const calculateOverallProgress = () => {
    if (phases.length === 0) return 0;
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
    return Math.round(totalProgress / phases.length);
  };

  const getNextPhase = () => {
    if (!currentPhase) return null;
    return phases.find(p => p.phaseOrder === currentPhase.phaseOrder + 1);
  };

  const handleBackToDashboard = () => {
    navigate(createPageUrl('HomeDashboard'));
  };

  if (loading || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Task Overview */}
          {currentView === 'task' && (
            <motion.div
              key="task"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" onClick={handleBackToDashboard}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <Badge variant="outline" className="text-sm">
                    {calculateOverallProgress()}% Complete
                  </Badge>
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{task.name}</h1>
                <Progress value={calculateOverallProgress()} className="mb-6" />
                
                <Button
                  onClick={() => setCurrentView('phases')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-6"
                >
                  View Phases ({phases.length})
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phases Overview */}
          {currentView === 'phases' && (
            <motion.div
              key="phases"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" onClick={() => setCurrentView('task')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Task
                  </Button>
                  <Badge variant="outline" className="text-sm">
                    {phases.filter(p => p.isCompleted).length}/{phases.length} Phases
                  </Badge>
                </div>
                
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Task Phases</h2>
              </div>

              <div className="space-y-4">
                {phases.map((phase, index) => (
                  <Card
                    key={phase.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handlePhaseClick(phase)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {phase.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 mb-1">
                            Phase {index + 1}: {phase.title}
                          </h3>
                          <p className="text-sm text-slate-600 mb-3">{phase.description}</p>
                          <div className="flex items-center gap-4">
                            <Progress value={phase.progress} className="flex-1 h-2" />
                            <span className="text-xs text-slate-500">
                              {phase.steps.filter(s => s.isCompleted).length}/{phase.steps.length} steps
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Steps Focus View */}
          {currentView === 'steps' && currentPhase && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" onClick={() => setCurrentView('phases')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Phases
                  </Button>
                  <Badge variant="outline" className="text-sm">
                    Phase {currentPhase.phaseOrder}/{phases.length}
                  </Badge>
                </div>
                
                <h2 className="text-xl font-semibold text-slate-900 mb-2">{currentPhase.title}</h2>
                <p className="text-slate-600 mb-4">{currentPhase.description}</p>
                <Progress value={currentPhase.progress} className="mb-6" />
                
                {/* Next Phase Preview */}
                {getNextPhase() && !currentPhase.isCompleted && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-800">
                      <Target className="w-4 h-4 inline mr-1" />
                      Next up: {getNextPhase().title}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card
                    key={step.id}
                    className={`cursor-pointer transition-all ${
                      step.isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : 'hover:shadow-md border-slate-200'
                    }`}
                    onClick={() => handleStepToggle(step)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {step.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${
                            step.isCompleted ? 'text-green-800 line-through' : 'text-slate-800'
                          }`}>
                            Step {index + 1}: {step.title}
                          </h3>
                          <p className={`text-sm ${
                            step.isCompleted ? 'text-green-700' : 'text-slate-600'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Phase Completion Message */}
              {currentPhase.isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Phase Complete!</p>
                  {getNextPhase() && (
                    <p className="text-sm text-green-700 mt-1">
                      Moving to: {getNextPhase().title}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}