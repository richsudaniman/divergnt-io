
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/entities/Task';
import { TaskPhase } from '@/entities/TaskPhase';
import { TaskStep } from '@/entities/TaskStep'; // Added import for TaskStep
import { Class } from '@/entities/Class';
import { InvokeLLM } from '@/integrations/Core';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Calendar,
  Target,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskCreationPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    workStartDate: '',
    classId: ''
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [createdTask, setCreatedTask] = useState(null);
  const [createdPhases, setCreatedPhases] = useState([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const classData = await Class.list('-created_date');
      setClasses(classData);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Assignment description is required';
    }
    
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      // Step 1: Create the task
      setProcessingStep('Creating your task...');
      const newTask = await Task.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        deadline: formData.deadline,
        workStartDate: formData.workStartDate || null,
        classId: formData.classId || null,
        processingStatus: 'processing'
      });

      setCreatedTask(newTask);

      // Step 2: AI breakdown into phases and steps
      setProcessingStep('Breaking down your assignment into manageable phases and steps...');
      
      const prompt = `
        You are an expert academic coach specializing in executive function support for students with ADHD.
        
        Break down this assignment into 3-5 logical phases, and then break each phase into 2-4 micro-steps.
        
        Assignment: "${formData.name}"
        Full Description: "${formData.description}"
        Deadline: ${formData.deadline}
        
        CRITICAL: Keep ALL descriptions short and concise (maximum 1-2 sentences) to prevent overwhelm.
        
        For each phase, provide:
        1. A clear, short phase title (3-6 words)
        2. A brief description (1-2 sentences max)
        3. 2-4 micro-steps within that phase
        
        For each step, provide:
        1. A clear, actionable title (3-8 words)
        2. A concise description of exactly what to do (1-2 sentences max)
        
        Focus on breaking overwhelm into the smallest manageable pieces with minimal text.
        Make each step specific enough that a student knows exactly what to do without lengthy explanations.
      `;

      const aiResponse = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            phases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object", 
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["title", "description"]
                    }
                  }
                },
                required: ["title", "description", "steps"]
              }
            }
          },
          required: ["phases"]
        }
      });

      if (!aiResponse || !aiResponse.phases || aiResponse.phases.length === 0) {
        throw new Error('Failed to generate task phases and steps. Please try again.');
      }

      // Step 3: Create phase records
      setProcessingStep('Saving your task phases...');
      const createdPhasesList = [];
      
      for (let phaseIndex = 0; phaseIndex < aiResponse.phases.length; phaseIndex++) {
        const phase = aiResponse.phases[phaseIndex];
        const createdPhase = await TaskPhase.create({
          taskId: newTask.id,
          phaseOrder: phaseIndex + 1,
          title: phase.title,
          description: phase.description
        });
        createdPhasesList.push(createdPhase);
        
        // Step 4: Create steps for this phase
        if (phase.steps && phase.steps.length > 0) {
          const stepsToCreate = phase.steps.map((step, stepIndex) => ({
            taskId: newTask.id,
            phaseId: createdPhase.id,
            stepOrder: stepIndex + 1,
            title: step.title,
            description: step.description
          }));
          await TaskStep.bulkCreate(stepsToCreate);
        }
      }
      
      setCreatedPhases(createdPhasesList);

      // Step 5: Update task status
      await Task.update(newTask.id, { processingStatus: 'completed' });

      setProcessingStep('Task created successfully!');

    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ submit: error.message || 'Failed to create task. Please try again.' });
      
      // Update task status to error if it was created
      if (createdTask) {
        try {
          await Task.update(createdTask.id, { processingStatus: 'error' });
        } catch (updateError) {
          console.error('Error updating task status:', updateError);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate(createPageUrl('HomeDashboard'));
  };

  // Success state
  if (createdTask && createdPhases.length > 0 && !isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <Card className="bg-white shadow-lg rounded-3xl overflow-hidden border border-slate-200">
            <CardHeader className="bg-green-50 p-8 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-900">Task Created Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">"{createdTask.name}"</h3>
                <p className="text-slate-600">Broken down into {createdPhases.length} manageable phases:</p>
              </div>
              
              <div className="space-y-4">
                {createdPhases.map((phase, index) => (
                  <div key={phase.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <h4 className="font-semibold text-slate-800 mb-2">
                      Phase {index + 1}: {phase.title}
                    </h4>
                    <p className="text-slate-600 text-sm">{phase.description}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleGoToDashboard}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('TaskCreation'))}
                  variant="outline"
                  className="flex-1 rounded-xl h-12"
                >
                  Create Another Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate(createPageUrl('HomeDashboard'))}
            className="text-slate-600 hover:text-slate-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Create New Task</h1>
            <p className="text-lg text-slate-600">
              Break down overwhelming assignments into manageable phases
            </p>
          </div>
        </motion.div>

        {/* Processing Overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Processing Your Task</h3>
                <p className="text-slate-600">{processingStep}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white shadow-lg rounded-3xl border border-slate-200">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-600" />
                Task Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Task Name */}
                <div>
                  <Label htmlFor="name" className="text-base font-semibold text-slate-700">
                    Task Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Research Paper on Climate Change"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`mt-2 h-12 text-base ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Assignment Description */}
                <div>
                  <Label htmlFor="description" className="text-base font-semibold text-slate-700">
                    Assignment Description <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-slate-500 mt-1 mb-2">
                    Paste the full assignment text or provide a detailed description
                  </p>
                  <Textarea
                    id="description"
                    placeholder="Paste your full assignment description here..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className={`mt-2 h-32 text-base resize-none ${errors.description ? 'border-red-500' : ''}`}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="deadline" className="text-base font-semibold text-slate-700">
                      Deadline <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                        className={`pl-10 h-12 ${errors.deadline ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>}
                  </div>

                  <div>
                    <Label htmlFor="workStartDate" className="text-base font-semibold text-slate-700">
                      When do you want to start?
                    </Label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="workStartDate"
                        type="date"
                        value={formData.workStartDate}
                        onChange={(e) => setFormData({...formData, workStartDate: e.target.value})}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Class Selection */}
                <div>
                  <Label className="text-base font-semibold text-slate-700">
                    Associated Class (Optional)
                  </Label>
                  <Select value={formData.classId} onValueChange={(value) => setFormData({...formData, classId: value})}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Class</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Display */}
                {errors.submit && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.submit}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white h-14 text-lg font-semibold rounded-xl shadow-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Task & Generate Phases
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
