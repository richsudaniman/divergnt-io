
import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '@/entities/Class';
import { Task } from '@/entities/Task';
import { TaskPhase } from '@/entities/TaskPhase';
import { TaskStep } from '@/entities/TaskStep';
import { Exam } from '@/entities/Exam'; // New import for exam countdown
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Plus,
  Clock,
  CheckCircle2,
  Target,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Zap,
  Palette,
  Music,
  Edit2,
  Trash2,
  ArrowRight,
  Loader2,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TaskProgressiveView from '../components/tasks/TaskProgressiveView';
import { getNextTaskSuggestion } from "@/functions/getNextTaskSuggestion";
import NextTaskSuggestion from '../components/tasks/NextTaskSuggestion';
import AcademicWeaponScorebar from '../components/progress/AcademicWeaponScorebar';
import SmartCalendar from '../components/calendar/SmartCalendar';

const ICON_OPTIONS = [
  { key: 'BookOpen', icon: BookOpen, label: 'Book' },
  { key: 'Calculator', icon: Calculator, label: 'Math' },
  { key: 'FlaskConical', icon: FlaskConical, label: 'Science' },
  { key: 'Globe', icon: Globe, label: 'Geography' },
  { key: 'Palette', icon: Palette, label: 'Art' },
  { key: 'Music', icon: Music, label: 'Music' },
  { key: 'Zap', icon: Zap, label: 'Physics' },
  { key: 'Target', icon: Target, label: 'Goal' },
];

const COLOR_OPTIONS = [
  { key: 'blue', bg: 'from-blue-400 to-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  { key: 'green', bg: 'from-green-400 to-green-500', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  { key: 'purple', bg: 'from-purple-400 to-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  { key: 'orange', bg: 'from-orange-400 to-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  { key: 'pink', bg: 'from-pink-400 to-pink-500', light: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800' },
  { key: 'indigo', bg: 'from-indigo-400 to-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
  { key: 'amber', bg: 'from-amber-400 to-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  { key: 'emerald', bg: 'from-emerald-400 to-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
];

export default function HomeDashboard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: 'BookOpen'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // New state variables for dynamic countdowns
  const [nextExamDays, setNextExamDays] = useState(null);
  const [nextTaskDays, setNextTaskDays] = useState(null);

  // AI suggestion state
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  // Level Up Toast state
  const [showLevelUpToast, setShowLevelUpToast] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'DIVRGNT.io - Your Learning Hub';
  }, []);

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const classData = await Class.list('-created_date');
      setClasses(classData);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies: setClasses, setIsLoading are stable setters

  const loadTasks = useCallback(async () => {
    try {
      const taskData = await Task.list('-created_date', 100);
      setTasks(taskData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  }, []); // Dependencies: setTasks is a stable setter

  // Optimized loadTodayTasks function - fixes N+1 query issue
  const loadTodayTasks = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allTasks = await Task.filter({});

      // Fetch ALL phases and steps at once to avoid N+1 query problem
      const allPhases = await TaskPhase.list();
      const allSteps = await TaskStep.list();

      // Create lookup maps for efficient filtering
      const phasesByTaskId = {};
      const stepsByTaskId = {};
      const stepsByPhaseId = {};

      allPhases.forEach(phase => {
        if (!phasesByTaskId[phase.taskId]) {
          phasesByTaskId[phase.taskId] = [];
        }
        phasesByTaskId[phase.taskId].push(phase);
      });

      allSteps.forEach(step => {
        if (!stepsByTaskId[step.taskId]) {
          stepsByTaskId[step.taskId] = [];
        }
        stepsByTaskId[step.taskId].push(step);

        if (!stepsByPhaseId[step.phaseId]) {
          stepsByPhaseId[step.phaseId] = [];
        }
        stepsByPhaseId[step.phaseId].push(step);
      });

      const todayAndOverdueTasks = [];

      for (const task of allTasks) {
        if (task.isCompleted) continue;

        const workStartDate = task.workStartDate;
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const todayDate = new Date(today);

        let shouldInclude = false;
        let priority = 'normal';

        // Check if task is scheduled for today
        if (workStartDate === today) {
          shouldInclude = true;
          priority = 'scheduled';
        }
        // Check if task deadline is passed (overdue) and not started
        else if (deadline && deadline < todayDate && !workStartDate) {
          shouldInclude = true;
          priority = 'overdue';
        }
        // Check if task deadline is approaching (within 3 days) and not started
        else if (deadline && !workStartDate) {
          const daysUntilDeadline = Math.ceil((deadline.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
            shouldInclude = true;
            priority = 'urgent';
          }
        }

        if (shouldInclude) {
          // Get task phases and steps from lookup maps
          const taskPhases = phasesByTaskId[task.id] || [];
          const taskSteps = stepsByTaskId[task.id] || [];

          // Calculate progress
          const totalSteps = taskSteps.length;
          const completedSteps = taskSteps.filter(s => s.isCompleted).length;
          const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

          // Find next incomplete phase
          const sortedPhases = taskPhases.sort((a, b) => a.phaseOrder - b.phaseOrder);
          const nextPhase = sortedPhases.find(phase => {
            const phaseSteps = stepsByPhaseId[phase.id] || [];
            return phaseSteps.some(s => !s.isCompleted);
          });

          // Get class info
          let className = 'Personal';
          if (task.classId) {
            const taskClass = classes.find(c => c.id === task.classId);
            if (taskClass) {
              className = taskClass.name;
            }
          }

          todayAndOverdueTasks.push({
            ...task,
            priority,
            progress,
            nextPhase,
            className,
            estimatedDuration: task.estimatedDuration || (nextPhase ? 30 : 45)
          });
        }
      }

      // Sort by priority: overdue first, then urgent, then scheduled
      const priorityOrder = { overdue: 0, urgent: 1, scheduled: 2, normal: 3 };
      todayAndOverdueTasks.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Within same priority, sort by deadline
        if (a.deadline && b.deadline) {
          return new Date(a.deadline) - new Date(b.deadline);
        }
        return 0;
      });

      setTodayTasks(todayAndOverdueTasks);
    } catch (error) {
      console.error('Error loading today tasks:', error);
      setTodayTasks([]);
    }
  }, [classes, setTodayTasks]); // Dependencies: classes for finding class info, setTodayTasks for state update. tasks state is not a dependency as allTasks are fetched directly.

  // New function to load countdown data - wrapped in useCallback
  const loadCountdowns = useCallback(async () => {
    try {
      // Load next exam countdown
      const upcomingExams = await Exam.filter({});
      const today = new Date();
      
      const futureExams = upcomingExams
        .filter(exam => new Date(exam.examDate) > today)
        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
      
      if (futureExams.length > 0) {
        const nextExam = futureExams[0];
        const daysUntilExam = Math.ceil((new Date(nextExam.examDate) - today) / (1000 * 60 * 60 * 24));
        setNextExamDays(daysUntilExam);
      }

      // Load next task deadline countdown
      const incompleteTasks = tasks.filter(task => !task.isCompleted && task.deadline);
      const futureTasks = incompleteTasks
        .filter(task => new Date(task.deadline) > today)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      if (futureTasks.length > 0) {
        const nextTask = futureTasks[0];
        const daysUntilTask = Math.ceil((new Date(nextTask.deadline) - today) / (1000 * 60 * 60 * 24));
        setNextTaskDays(daysUntilTask);
      }
    } catch (error) {
      console.error('Error loading countdown data:', error);
    }
  }, [tasks, setNextExamDays, setNextTaskDays]); // Dependencies: tasks for filtering, setNextExamDays/setNextTaskDays for state updates.

  const loadAllData = useCallback(async () => {
    await loadClasses();
    await loadTasks();
  }, [loadClasses, loadTasks]); // Dependencies: loadClasses and loadTasks functions

  useEffect(() => {
    loadAllData();
  }, [loadAllData]); // Dependency: loadAllData function

  useEffect(() => {
    // Only run if classes are loaded to ensure `classes.find` inside `loadTodayTasks` has data
    if (classes.length > 0) {
      loadTodayTasks();
    }
  }, [classes, tasks, loadTodayTasks]); // Dependencies: classes for condition and internal logic, tasks to re-run if task data changes, loadTodayTasks function itself.

  useEffect(() => {
    // Only run if tasks are loaded to avoid unnecessary calculations
    if (tasks.length > 0) {
      loadCountdowns();
    }
  }, [tasks, loadCountdowns]); // Dependencies: tasks for condition and internal logic, loadCountdowns function itself.

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: 'blue',
      icon: 'BookOpen'
    });
    setErrors({});
    setEditingClass(null);
  };

  const openModal = (classToEdit = null) => {
    if (classToEdit) {
      setFormData({
        name: classToEdit.name,
        description: classToEdit.description || '',
        color: classToEdit.color || 'blue',
        icon: classToEdit.icon || 'BookOpen'
      });
      setEditingClass(classToEdit);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      const classData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        icon: formData.icon,
        noteCount: editingClass ? editingClass.noteCount : 0
      };

      if (editingClass) {
        await Class.update(editingClass.id, classData);
      } else {
        await Class.create(classData);
      }

      await loadClasses();
      closeModal();
    } catch (error) {
      console.error('Error saving class:', error);
      setErrors({ submit: 'Failed to save class. Please try again.' });
    }
  };

  const handleDeleteClass = async (classId) => {
    try {
      await Class.delete(classId);
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const getIconComponent = (iconKey) => {
    const iconData = ICON_OPTIONS.find(option => option.key === iconKey);
    return iconData ? iconData.icon : BookOpen;
  };

  const getColorClasses = (colorKey) => {
    const colorData = COLOR_OPTIONS.find(option => option.key === colorKey);
    return colorData || COLOR_OPTIONS[0];
  };

  const handleClassClick = (classItem) => {
    navigate(createPageUrl(`ClassPage?id=${classItem.id}`));
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  // Updated handleCloseTaskView with data refresh
  const handleCloseTaskView = () => {
    setSelectedTask(null);
    // Refresh all dashboard data when returning from task view
    loadTasks();
    loadTodayTasks();
    loadCountdowns();
  };

  // AI suggestion functions
  const handleWhatShouldIDo = async () => {
    setIsLoadingSuggestion(true);
    try {
      const { data } = await getNextTaskSuggestion();
      setSuggestion(data);
      setShowSuggestion(true);
    } catch (error) {
      console.error('Error getting suggestion:', error);
      setSuggestion({
        hasSuggestion: false,
        message: "Having trouble getting suggestions right now. Try checking your tasks manually!"
      });
      setShowSuggestion(true);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleCloseSuggestion = () => {
    setShowSuggestion(false);
    setSuggestion(null);
    // Refresh tasks when suggestion is closed
    loadTasks();
    loadTodayTasks();
  };

  const handleRefreshSuggestion = async () => {
    await handleWhatShouldIDo();
  };

  const handleLevelUp = (levelName) => {
    setLevelUpMessage(`🎉 You've reached ${levelName}! Keep up the amazing work!`);
    setShowLevelUpToast(true);
    setTimeout(() => setShowLevelUpToast(false), 5000);
  };

  // If a task is selected, show the progressive view
  if (selectedTask) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
        <TaskProgressiveView
          task={selectedTask}
          onClose={handleCloseTaskView}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 px-6 pb-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section - Enhanced for Home Page */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-[var(--shadow-soft)] border border-slate-100 overflow-hidden"
        >
          {/* Header Image */}
          <div className="relative h-48 md:h-56 bg-gradient-to-t from-blue-900 to-indigo-900 overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/689abf118b12e7aead465756/4ec4ff107_Gemini_Generated_Image_cn488ncn488ncn48.png"
              alt="Your personalized learning workspace"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            
            {/* Welcome Message Overlay */}
            <div className="absolute bottom-6 left-6 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome Back!</h1>
              <p className="text-lg text-white/90">Ready to conquer your learning goals today?</p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col gap-6">
              {/* Academic Weapon Score - Top Row */}
              <div className="w-full">
                <AcademicWeaponScorebar onLevelUp={handleLevelUp} />
              </div>

              {/* Action Buttons and Dynamic Countdown - Bottom Row */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl('TaskCreation'))}
                    className="bg-gradient-to-r from-[var(--soft-green)] to-[var(--soft-blue)] hover:opacity-90 text-white px-6 py-3 rounded-xl shadow-sm transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                  <Button
                    onClick={handleWhatShouldIDo}
                    disabled={isLoadingSuggestion}
                    className="bg-gradient-to-r from-[var(--soft-blue)] to-[var(--soft-purple)] hover:opacity-90 text-white px-6 py-3 rounded-xl shadow-sm transition-all duration-200"
                  >
                    {isLoadingSuggestion ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    What Should I Do Next?
                  </Button>
                </div>

                {/* Dynamic Countdown Clocks */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                      <Clock className="w-4 h-4" />
                      <span>Next Exam</span>
                    </div>
                    <div className="text-xl font-semibold text-[var(--text-main)]">
                      {nextExamDays !== null ? `${nextExamDays} days` : 'No exams'}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                      <Target className="w-4 h-4" />
                      <span>Assignment Due</span>
                    </div>
                    <div className="text-xl font-semibold text-[var(--text-main)]">
                      {nextTaskDays !== null ? `${nextTaskDays} days` : 'No deadlines'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Smart Calendar Widget (Left) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SmartCalendar
              tasks={tasks}
              classes={classes}
              onTaskClick={handleTaskClick}
              onNavigateToTask={(taskId) => navigate(createPageUrl(`TaskProgressiveView?id=${taskId}`))}
            />
          </motion.div>

          {/* Today's Focus - Updated with Real-time Refresh */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
                <CardTitle className="text-xl font-semibold text-[var(--text-main)] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" />
                  Today's Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">No scheduled tasks for today!</p>
                    <Button
                      onClick={() => navigate(createPageUrl('TaskCreation'))}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {todayTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          task.priority === 'overdue'
                            ? 'bg-red-50 border-red-200 hover:border-red-300'
                            : task.priority === 'urgent'
                            ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                task.priority === 'overdue'
                                  ? 'bg-red-500'
                                  : task.priority === 'urgent'
                                  ? 'bg-orange-500'
                                  : 'bg-blue-500'
                              }`} />
                              <h4 className="font-semibold text-slate-800 truncate">{task.name}</h4>
                              {task.priority === 'overdue' && (
                                <Badge className="bg-red-100 text-red-800 text-xs">Overdue</Badge>
                              )}
                              {task.priority === 'urgent' && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">Urgent</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="truncate">{task.className}</span>
                              <span>•</span>
                              <span>~{task.estimatedDuration} min</span>
                              {task.progress > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{Math.round(task.progress)}% done</span>
                                </>
                              )}
                            </div>

                            {task.nextPhase && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  Next: {task.nextPhase.title}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Class Folders Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[var(--shadow-soft)] border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-[var(--text-main)] flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-[var(--soft-blue)]" />
                Your Classes
              </h2>

              {/* Add New Class Dialog/Modal */}
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => openModal()}
                    className="bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white px-6 py-2 rounded-xl shadow-sm transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Class
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md bg-white border border-slate-200">
                  <DialogHeader>
                    <DialogTitle>
                      {editingClass ? 'Edit Class' : 'Add New Class'}
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Class Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="e.g., Biology 101, Calculus II"
                          className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="e.g., Cell Structure & Function"
                          className="h-20 bg-white"
                        />
                      </div>

                      {/* Color Selection */}
                      <div>
                        <Label>Choose Color</Label>
                        <div className="grid grid-cols-4 gap-3 mt-2">
                          {COLOR_OPTIONS.map((color) => (
                            <button
                              key={color.key}
                              type="button"
                              onClick={() => setFormData({...formData, color: color.key})}
                              className={`w-full h-12 rounded-xl border-2 transition-all ${
                                formData.color === color.key
                                  ? 'border-slate-400 scale-105'
                                  : 'border-slate-200 hover:border-slate-300'
                              } bg-gradient-to-br ${color.bg}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Icon Selection */}
                      <div>
                        <Label>Choose Icon</Label>
                        <div className="grid grid-cols-4 gap-3 mt-2">
                          {ICON_OPTIONS.map((iconOption) => {
                            const IconComponent = iconOption.icon;
                            return (
                              <button
                                key={iconOption.key}
                                type="button"
                                onClick={() => setFormData({...formData, icon: iconOption.key})}
                                className={`w-full h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                                  formData.icon === iconOption.key
                                    ? 'border-slate-400 bg-slate-100'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <IconComponent className="w-5 h-5 text-slate-600" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {errors.submit && (
                      <p className="text-red-500 text-sm">{errors.submit}</p>
                    )}

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1 bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)]">
                        {editingClass ? 'Update Class' : 'Create Class'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Classes Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)] text-lg mb-4">No classes yet</p>
                <p className="text-sm text-slate-500">Click "Add New Class" to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {classes.map((classItem, index) => {
                  const colorClasses = getColorClasses(classItem.color);
                  const IconComponent = getIconComponent(classItem.icon);

                  return (
                    <motion.div
                      key={classItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className="bg-white border-slate-200 hover:shadow-[var(--shadow-medium)] hover:border-[var(--soft-blue)]/30 transition-all duration-200 cursor-pointer group rounded-xl relative"
                        onClick={() => handleClassClick(classItem)}
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(classItem);
                            }}
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                          >
                            <Edit2 className="w-3 h-3 text-slate-600" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete "{classItem.name}" and remove all related data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClass(classItem.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        <CardContent className="p-6 text-center">
                          <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses.bg} rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-200`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">{classItem.name}</h3>
                          {classItem.description && (
                            <p className="text-[var(--text-muted)] text-sm mb-4">{classItem.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>{classItem.noteCount || 0} notes</span>
                            {classItem.upcomingDeadline && <span>{classItem.upcomingDeadline}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Level Up Toast */}
      <AnimatePresence>
        {showLevelUpToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-2xl shadow-2xl max-w-sm"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-300" />
              <div>
                <div className="font-bold text-lg">Level Up!</div>
                <div className="text-sm opacity-90">{levelUpMessage}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestion && suggestion && (
          <NextTaskSuggestion
            suggestion={suggestion}
            onClose={handleCloseSuggestion}
            onRefresh={handleRefreshSuggestion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
