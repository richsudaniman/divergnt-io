
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Class } from '@/entities/Class';
import { Task } from '@/entities/Task';
// Added TaskStep import
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import {
  ArrowLeft,
  Brain,
  Video,
  GraduationCap,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Palette,
  Music,
  Zap,
  Target, // Added Target for Class Tasks section
  Plus, // Added Plus for New Task button
  ArrowRight, // Added ArrowRight for task list items
  FileText // Added FileText for Syllabus Parser
} from 'lucide-react';
import { motion } from 'framer-motion';
import TaskProgressiveView from '../components/tasks/TaskProgressiveView'; // Added TaskProgressiveView import
import SyllabusParser from '../components/class/SyllabusParser'; // Added SyllabusParser import

const ICON_MAP = {
  BookOpen, Calculator, FlaskConical, Globe, Palette, Music, Zap, Target
};

const COLOR_OPTIONS = {
  blue: { bg: 'from-blue-400 to-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  green: { bg: 'from-green-400 to-green-500', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  purple: { bg: 'from-purple-400 to-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  orange: { bg: 'from-orange-400 to-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  pink: { bg: 'from-pink-400 to-pink-500', light: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800' },
  indigo: { bg: 'from-indigo-400 to-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
  amber: { bg: 'from-amber-400 to-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  emerald: { bg: 'from-emerald-400 to-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
};

export default function ClassPage() {
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [classTasks, setClassTasks] = useState([]); // Added classTasks state
  const [selectedTask, setSelectedTask] = useState(null); // New state for progressive task view
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const classId = urlParams.get('id');

      if (classId) {
        const classes = await Class.filter({ id: classId });
        if (classes.length > 0) {
          setClassData(classes[0]);

          // Load tasks for this class
          const tasks = await Task.filter({ classId });
          setClassTasks(tasks);
        }
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (page, classId) => {
    navigate(createPageUrl(`${page}?classId=${classId}`));
  };

  // New function to determine task status
  const getTaskStatus = (task) => {
    if (task.isCompleted) {
      return { status: 'completed', label: 'Completed', color: 'text-green-600' };
    }

    const today = new Date();
    // Normalize today's date to start of day for comparison
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(task.deadline);
    // Normalize deadline to start of day for comparison
    deadline.setHours(0, 0, 0, 0);

    const timeDiff = deadline.getTime() - today.getTime();
    const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Use ceil to count partial days as a full day until deadline passes

    if (daysUntil < 0) {
      return { status: 'overdue', label: 'Overdue', color: 'text-red-600' };
    } else if (daysUntil === 0) {
      return { status: 'today', label: 'Due Today', color: 'text-orange-600' };
    } else if (daysUntil <= 3) {
      return { status: 'urgent', label: `Due in ${daysUntil} days`, color: 'text-orange-600' };
    } else {
      return { status: 'upcoming', label: `Due in ${daysUntil} days`, color: 'text-slate-600' };
    }
  };

  // New function to handle task click for progressive view
  const handleTaskClick = (task) => {
    if (task.processingStatus === 'completed') {
      setSelectedTask(task);
    }
  };

  // New function to close the progressive task view
  const handleCloseTaskView = () => {
    setSelectedTask(null);
    // Reload class data to get updated progress, including task steps if needed
    loadClassData();
  };

  // If a task is selected, show the progressive view instead of the main page
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--soft-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading class...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">Class not found</p>
          <Button onClick={() => navigate(createPageUrl('HomeDashboard'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = ICON_MAP[classData.icon] || BookOpen;
  const colorClasses = COLOR_OPTIONS[classData.color] || COLOR_OPTIONS.blue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 px-6 pb-6">
      <div className="max-w-6xl mx-auto space-y-8"> {/* Changed max-w-4xl to max-w-6xl and added space-y-8 */}

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pt-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('HomeDashboard'))}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Class Info & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Class Info Card (re-factored from Class Header) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl p-6 text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${colorClasses.bg} rounded-3xl flex items-center justify-center mx-auto shadow-[var(--shadow-medium)] mb-4`}>
                  <IconComponent className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-1">{classData.name}</h1>
                {classData.description && (
                  <p className="text-md text-[var(--text-muted)]">{classData.description}</p>
                )}
              </Card>
            </motion.div>

            {/* Syllabus Parser Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Course Schedule Parser
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-2">
                    Paste your syllabus to automatically create all assignments and deadlines
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <SyllabusParser classId={classData.id} onTasksCreated={loadClassData} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Section (moved to left column) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[var(--shadow-soft)] border border-slate-200 p-8">
                <h3 className="text-xl font-semibold text-[var(--text-main)] mb-6">Class Overview</h3>
                <div className="grid grid-cols-3 gap-6"> {/* Adjusted to grid-cols-3 directly */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--soft-blue)] mb-1">{classData.noteCount || 0}</div>
                    <div className="text-[var(--text-muted)]">Notes Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--soft-purple)] mb-1">0</div>
                    <div className="text-[var(--text-muted)]">Brain Dumps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--soft-green)] mb-1">{classTasks.length}</div>
                    <div className="text-[var(--text-muted)]">Tasks</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Action Cards & Class Tasks */}
          <div className="lg:col-span-2 space-y-6">

            {/* Action Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >

              {/* Brain Dump Card */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden hover:shadow-[var(--shadow-medium)] hover:border-purple-300 transition-all duration-300 cursor-pointer group"
                onClick={() => handleNavigation('BrainDump', classData.id)}>
                <CardHeader className="bg-purple-50/80 p-6 border-b border-slate-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-[var(--text-main)]">Brain Dump</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white/90">
                  <p className="text-[var(--text-muted)] mb-4">
                    Capture your thoughts and transform them into structured notes
                  </p>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md">
                    Start Brain Dump
                  </Button>
                </CardContent>
              </Card>

              {/* Learn Card */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden hover:shadow-[var(--shadow-medium)] hover:border-blue-300 transition-all duration-300 cursor-pointer group"
                onClick={() => handleNavigation('Upload', classData.id)}>
                <CardHeader className="bg-blue-50/80 p-6 border-b border-slate-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-[var(--text-main)]">Learn</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white/90">
                  <p className="text-[var(--text-muted)] mb-4">
                    Upload lectures and generate personalized study notes
                  </p>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md">
                    Upload Video
                  </Button>
                </CardContent>
              </Card>

              {/* Exam Prep Card */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden hover:shadow-[var(--shadow-medium)] hover:border-green-300 transition-all duration-300 cursor-pointer group"
                onClick={() => handleNavigation('ExamPrepSetup', classData.id)}>
                <CardHeader className="bg-green-50/80 p-6 border-b border-slate-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-[var(--text-main)]">Exam Prep</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white/90">
                  <p className="text-[var(--text-muted)] mb-4">
                    Create a personalized study plan for your upcoming exams
                  </p>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md">
                    Start Exam Prep
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Class Tasks Section */}
            {classTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[var(--shadow-soft)] border border-slate-200 p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[var(--text-main)] flex items-center gap-3">
                    <Target className="w-5 h-5" />
                    Class Tasks
                  </h3>
                  <Button
                    onClick={() => navigate(createPageUrl('TaskCreation'))}
                    className="bg-[var(--soft-blue)] hover:bg-[var(--soft-blue-dark)] text-white px-4 py-2 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {classTasks.map((task) => {
                    const statusInfo = getTaskStatus(task);
                    return (
                      <motion.div
                        key={task.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          task.processingStatus === 'completed'
                            ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                            : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            {/* Minimal view - just task name and status */}
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                task.isCompleted
                                  ? 'bg-green-500'
                                  : statusInfo.status === 'overdue'
                                  ? 'bg-red-500'
                                  : statusInfo.status === 'urgent' || statusInfo.status === 'today'
                                  ? 'bg-orange-500'
                                  : 'bg-blue-500'
                              }`} />
                              <h4 className="font-semibold text-slate-800">{task.name}</h4>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              {task.processingStatus === 'processing' && (
                                <Badge variant="secondary" className="text-xs">Processing</Badge>
                              )}
                              {task.processingStatus === 'completed' && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  Ready to Start
                                </Badge>
                              )}
                            </div>
                          </div>

                          {task.processingStatus === 'completed' && (
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
