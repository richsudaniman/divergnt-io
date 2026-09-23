
import React, { useState, useEffect, useCallback } from 'react';
import { TaskPhase } from '@/entities/TaskPhase'; 
import { TaskStep } from '@/entities/TaskStep';
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
import { updateUserProgress } from '@/functions/updateUserProgress';
import TemplateSelector from './TemplateSelector'; // New import

export default function TaskProgressiveView({ task, onClose }) {
  const [currentView, setCurrentView] = useState('task'); // 'task', 'phases', 'steps'
  const [phases, setPhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStepForTemplate, setSelectedStepForTemplate] = useState(null); // New state for template selector

  const loadTaskData = useCallback(async () => {
    setLoading(true);
    try {
      // Load phases
      const phaseData = await TaskPhase.filter({ taskId: task.id });
      const sortedPhases = phaseData.sort((a, b) => a.phaseOrder - b.phaseOrder);
      
      // Load all steps for all phases
      const allSteps = await TaskStep.filter({ taskId: task.id });
      
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
    } finally {
      setLoading(false);
    }
  }, [task.id]);

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
      
      // Track progress for Academic Weapon score
      if (newCompletedStatus) {
        try {
          await updateUserProgress({
            activityType: 'step_completed',
            metadata: {}
          });
        } catch (progressError) {
          console.log('Progress tracking failed (non-critical):', progressError);
        }
      }
      
      // Reload data to update progress
      await loadTaskData();
      
      // Check if we should auto-advance to next phase
      if (newCompletedStatus && currentPhase) {
        // Find the updated current phase from the new phases state
        const updatedPhase = phases.find(p => p.id === currentPhase.id); 
        if (updatedPhase && updatedPhase.isCompleted) {
          // Track phase completion
          try {
            await updateUserProgress({
              activityType: 'phase_completed',
              metadata: {}
            });
          } catch (progressError) {
            console.log('Progress tracking failed (non-critical):', progressError);
          }
          
          // Find next incomplete phase
          const nextPhase = phases.find(p => p.phaseOrder > updatedPhase.phaseOrder && !p.isCompleted);
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

  // New function to determine if step needs document creation
  const stepNeedsDocumentCreation = (step) => {
    const keywords = [
      'write', 'draft', 'essay', 'paper', 'report', 'outline', 'document', 
      'presentation', 'slides', 'lab report', 'research', 'analysis', 
      'summary', 'reflection', 'proposal', 'memo', 'letter', 'create document',
      'type up', 'compose', 'structure', 'organize thoughts'
    ];
    
    const stepText = (step.title + ' ' + step.description).toLowerCase();
    return keywords.some(keyword => stepText.includes(keyword));
  };

  // New function to handle Go button click
  const handleGoButtonClick = async (step) => {
    setSelectedStepForTemplate(step);
    
    // Mark step as in progress if not already completed
    if (!step.isCompleted) {
      try {
        // No direct "inProgress" field on TaskStep, we just trigger the modal
        // If there was a status field like 'pending', 'inProgress', 'completed', this would be the place to update it.
        // For now, the action of clicking 'Go' implies starting work.
        // If we wanted to, we could add a `status` field to TaskStep and update it here.
        // Example: await TaskStep.update(step.id, { status: 'inProgress' });
        // Then, loadTaskData() would refresh the view to show this status.
      } catch (error) {
        console.error('Error marking step as in progress:', error);
      }
    }
  };

  // New function to handle template selection
  const handleTemplateCreated = () => {
    setSelectedStepForTemplate(null);
    // Optionally reload task data to reflect any status changes (e.g., if step status was updated upon template creation)
    loadTaskData();
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading task details...</p>
      </div>
    );
  }

  return (
    <>
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
                  <Button variant="ghost" onClick={onClose}>
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
                    className={`transition-all ${
                      step.isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : 'hover:shadow-md border-slate-200'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 cursor-pointer" onClick={() => handleStepToggle(step)}>
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
                        
                        {/* Go Button for document creation steps */}
                        {stepNeedsDocumentCreation(step) && !step.isCompleted && (
                          <Button
                            onClick={() => handleGoButtonClick(step)}
                            size="sm"
                            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all duration-200 font-semibold"
                          >
                            Go →
                          </Button>
                        )}
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

      {/* Template Selector Modal */}
      {selectedStepForTemplate && (
        <TemplateSelector
          step={selectedStepForTemplate}
          task={task}
          onClose={() => setSelectedStepForTemplate(null)}
          onTemplateCreated={handleTemplateCreated}
        />
      )}
    </>
  );
}
