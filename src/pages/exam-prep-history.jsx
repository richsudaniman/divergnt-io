import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exam } from '@/entities/Exam';
import { StudyBurst } from '@/entities/StudyBurst';
import { ExamMaterial } from '@/entities/ExamMaterial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Calendar,
  Clock,
  FileText,
  BookOpen,
  Plus,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function ExamPrepHistoryPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [examStats, setExamStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExamHistory();
  }, []);

  const loadExamHistory = async () => {
    setLoading(true);
    try {
      const examData = await Exam.list('-created_date');
      setExams(examData);

      // Load stats for each exam
      const stats = {};
      for (const exam of examData) {
        const bursts = await StudyBurst.filter({ examId: exam.id });
        const materials = await ExamMaterial.filter({ examId: exam.id });
        
        stats[exam.id] = {
          totalBursts: bursts.length,
          completedBursts: bursts.filter(b => b.isCompleted).length,
          materialCount: materials.length,
          progress: bursts.length > 0 ? Math.round((bursts.filter(b => b.isCompleted).length / bursts.length) * 100) : 0
        };
      }
      setExamStats(stats);
    } catch (error) {
      console.error("Error loading exam history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const daysUntil = differenceInDays(exam, today);
    
    if (isPast(exam)) {
      return { status: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (daysUntil <= 3) {
      return { status: 'urgent', label: `${daysUntil} days left`, color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (daysUntil <= 7) {
      return { status: 'soon', label: `${daysUntil} days left`, color: 'bg-orange-100 text-orange-800 border-orange-200' };
    } else {
      return { status: 'upcoming', label: `${daysUntil} days left`, color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--dopamine-blue-main)] mx-auto mb-4" />
          <p className="text-lg text-[var(--text-muted)]">Loading your exam history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
          <div>
            <p className="text-lg text-[var(--text-muted)] font-medium mb-3">Your Academic Journey 📚</p>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-[var(--foreground)] leading-tight tracking-tighter">
              Exam Prep History
            </h1>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl('ExamPrepSetup'))}
            className="bg-gradient-to-r from-[var(--dopamine-blue-main)] to-[var(--focus-purple-main)] hover:opacity-90 h-14 px-8 text-lg font-bold text-white rounded-2xl shadow-lg hover:shadow-[var(--shadow-medium)] transition-all duration-300"
          >
            <Plus className="w-6 h-6 mr-3" />
            New Exam Prep
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {exams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-3xl shadow-[var(--shadow-soft)] border border-[var(--border)]"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto mb-8 flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-3xl font-bold text-[var(--foreground)] mb-4">
              No Exams Yet
            </h3>
            <p className="text-lg text-[var(--text-muted)] mb-12 max-w-md mx-auto leading-relaxed">
              Ready to ace your first exam? Create your personalized study plan now.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl('ExamPrepSetup'))}
              className="bg-gradient-to-r from-[var(--dopamine-blue-main)] to-[var(--focus-purple-main)] hover:opacity-90 h-14 px-8 rounded-2xl shadow-lg font-bold text-white"
            >
              <Plus className="w-5 h-5 mr-3" />
              Start Your First Exam Prep
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {exams.map((exam, index) => {
              const stats = examStats[exam.id] || { totalBursts: 0, completedBursts: 0, materialCount: 0, progress: 0 };
              const statusInfo = getExamStatus(exam.examDate);

              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <Card className="border-[var(--border)] shadow-[var(--shadow-soft)] bg-white hover:shadow-[var(--shadow-medium)] transition-all duration-300 rounded-3xl flex flex-col h-full group cursor-pointer hover:border-[var(--dopamine-blue-main)]/50">
                    <CardHeader className="pb-4 p-8">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <CardTitle className="text-xl font-bold text-[var(--foreground)] line-clamp-2 leading-tight">
                          {exam.name}
                        </CardTitle>
                        <Badge className={`${statusInfo.color} border text-sm py-1.5 px-4 rounded-full font-semibold flex-shrink-0`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[var(--text-muted)]">
                          <Calendar className="w-5 h-5 text-slate-400" />
                          <span className="text-base">{format(new Date(exam.examDate), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[var(--text-muted)]">
                          <Clock className="w-5 h-5 text-slate-400" />
                          <span className="text-base">{exam.preferredSessionLength} min sessions</span>
                        </div>
                        <div className="flex items-center gap-3 text-[var(--text-muted)]">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <span className="text-base">{stats.materialCount} materials uploaded</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 flex-grow flex flex-col p-8 pt-0">
                      {stats.totalBursts > 0 && (
                        <div className="space-y-4 flex-grow">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-[var(--foreground)]">Study Progress</span>
                            <span className="text-lg font-bold text-[var(--dopamine-blue-main)]">{stats.progress}%</span>
                          </div>
                          <Progress 
                            value={stats.progress} 
                            className="h-3 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[var(--serotonin-green-main)] [&>div]:to-[var(--dopamine-blue-main)] rounded-full" 
                          />
                          <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
                            <span>{stats.completedBursts} / {stats.totalBursts} bursts done</span>
                            <span>{stats.totalBursts - stats.completedBursts} remaining</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4 mt-auto">
                        <Button 
                          onClick={() => navigate(createPageUrl(`StudyDashboard?id=${exam.id}`))}
                          className="flex-1 h-12 text-base rounded-xl bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white transition-all duration-300 font-bold"
                        >
                          <Trophy className="w-5 h-5 mr-2" />
                          Study Plan
                        </Button>
                        <Button 
                          onClick={() => navigate(createPageUrl(`study-notes-viewer?id=${exam.id}`))}
                          variant="outline"
                          className="flex-1 h-12 text-base rounded-xl border-[var(--border)] hover:bg-slate-50 transition-all duration-300 font-semibold"
                        >
                          <BookOpen className="w-5 h-5 mr-2" />
                          Notes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}