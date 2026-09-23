
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Exam } from '@/entities/Exam';
import { ExamMaterial } from '@/entities/ExamMaterial';
import { StudyBurst } from '@/entities/StudyBurst';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ClipboardList,
  BookOpen,
  Brain,
  Video,
  Edit,
  Sparkles,
  Trophy,
  Calendar,
  Clock,
  Tag,
  Star,
  RotateCcw,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import PomodoroTimer from '../components/exam/PomodoroTimer';
import AITutor from '../components/exam/AITutor';
import PracticeExam from '../components/study/PracticeExam';

const TaskIcon = ({ taskType }) => {
  const icons = {
    review_notes: BookOpen,
    practice_questions: Edit,
    watch_video: Video,
    summarize_concept: Brain,
  };
  const Icon = icons[taskType] || ClipboardList;
  return <Icon className="w-5 h-5" />;
};

const TagIcon = ({ tagName }) => {
    const tagInfo = {
        'Important': { icon: Star, color: 'text-yellow-500' },
        'Review Later': { icon: RotateCcw, color: 'text-blue-500' },
        'Confusing': { icon: AlertTriangle, color: 'text-red-500' },
    };
    const { icon: Icon, color } = tagInfo[tagName] || { icon: Tag, color: 'text-gray-500' };
    return <Icon className={`w-4 h-4 ${color}`} />;
};

const createPageUrl = (pageString) => {
  const [pageName, queryString] = pageString.split('?', 2);
  // Converts CamelCase to kebab-case, e.g., 'StudyNotesViewer' -> 'study-notes-viewer'
  const formattedPageName = pageName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  let url = `/${formattedPageName}`;
  if (queryString) {
    url += `?${queryString}`;
  }
  return url;
};

export default function StudyDashboardPage() {
  const [exam, setExam] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [showPracticeExam, setShowPracticeExam] = useState(false); // New state for practice exam
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const examId = params.get('id');

    if (examId) {
      loadData(examId);
    } else {
      setLoading(false);
    }
  }, [location.search]);

  const loadData = async (examId) => {
    setLoading(true);
    try {
      const examData = await Exam.filter({ id: examId });
      if (examData.length > 0) {
        setExam(examData[0]);
        const materialData = await ExamMaterial.filter({ examId: examId });
        setMaterials(materialData);
        const burstData = await StudyBurst.filter({ examId: examId }, '-created_date');
        setBursts(burstData);
      }
    } catch (error) {
      console.error("Failed to load exam data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBurstToggle = async (burstId, isCompleted) => {
    const originalBursts = [...bursts];
    setBursts(prev => prev.map(b => 
      b.id === burstId ? { ...b, isCompleted } : b
    ));

    try {
      await StudyBurst.update(burstId, { isCompleted });
    } catch (error) {
      console.error("Failed to update burst:", error);
      setBursts(originalBursts); // Revert on error
    }
  };

  const handleTagChange = async (burstId, tag) => {
    const originalBursts = [...bursts];
    const burstToUpdate = bursts.find(b => b.id === burstId);
    if (!burstToUpdate) return;

    let newTags = [...(burstToUpdate.tags || [])];
    if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag);
    } else {
        newTags.push(tag);
    }

    setBursts(prev => prev.map(b => b.id === burstId ? { ...b, tags: newTags } : b));
    
    try {
        await StudyBurst.update(burstId, { tags: newTags });
    } catch (error) {
        console.error("Failed to update tags:", error);
        setBursts(originalBursts);
    }
  };

  const handleExamComplete = async (activityType, results) => {
    if (!exam) return;
    
    try {
      // Mark some study bursts as completed based on exam performance
      const incompleteBursts = bursts.filter(b => !b.isCompleted);
      const burstsToComplete = Math.min(3, incompleteBursts.length); // Complete up to 3 bursts
      
      for (let i = 0; i < burstsToComplete; i++) {
        await StudyBurst.update(incompleteBursts[i].id, { 
          isCompleted: true,
          masteryScore: results.percentage // Assuming results.percentage exists
        });
      }
      
      // Reload data to reflect changes
      loadData(exam.id);
      setShowPracticeExam(false);
    } catch (error) {
      console.error("Error updating bursts after exam:", error);
    }
  };

  const { completedBursts, totalBursts, progress } = useMemo(() => {
    const total = bursts.length;
    if (total === 0) return { completedBursts: 0, totalBursts: 0, progress: 0 };
    const completed = bursts.filter(b => b.isCompleted).length;
    return {
      completedBursts: completed,
      totalBursts: total,
      progress: Math.round((completed / total) * 100),
    };
  }, [bursts]);
  
  const daysUntilExam = useMemo(() => {
    if (!exam?.examDate) return 0;
    return differenceInDays(new Date(exam.examDate), new Date());
  }, [exam?.examDate]);
  
  const nextUpBursts = useMemo(() => {
      const incompleteBursts = bursts.filter(b => !b.isCompleted);
      let sessionTime = 0;
      const sessionBursts = [];
      for (const burst of incompleteBursts) {
          if (exam?.preferredSessionLength && sessionTime + burst.estimatedDuration <= exam.preferredSessionLength) {
              sessionTime += burst.estimatedDuration;
              sessionBursts.push(burst);
          }
      }
      return sessionBursts.length > 0 ? sessionBursts : incompleteBursts.slice(0, 1);
  }, [bursts, exam?.preferredSessionLength]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold">No Exam Found</h2>
        <p className="text-[var(--text-muted)] mt-2">
          It looks like you haven't specified an exam to study for.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <p className="text-lg text-[var(--text-muted)] font-medium mb-1">Study Plan for:</p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--foreground)] tracking-tighter">{exam.name}</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                    variant="outline"
                    className="h-auto py-3 px-5 border-2 rounded-xl bg-white/80"
                    onClick={() => navigate(createPageUrl(`study-notes-viewer?id=${exam.id}`))}
                >
                     <BookOpen className="w-7 h-7 text-[var(--focus-purple-main)] mr-3" />
                     <div>
                        <p className="font-semibold text-lg text-left text-[var(--foreground)]">View Study Notes</p>
                        <p className="text-base text-left text-[var(--text-muted)]">All sections & materials</p>
                    </div>
                </Button>
                <Card className="bg-white/80 border-[var(--border)] p-4 rounded-xl flex items-center gap-4">
                    <Calendar className="w-8 h-8 text-[var(--dopamine-blue-main)]" />
                    <div>
                        <p className="font-semibold text-lg text-[var(--foreground)]">{format(new Date(exam.examDate), 'EEEE, MMMM d, yyyy')}</p>
                        <p className="text-base text-[var(--text-muted)]">{daysUntilExam > 0 ? `That's in ${daysUntilExam} days!` : "Good luck!"}</p>
                    </div>
                </Card>
            </div>
        </div>
      </motion.header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Next Up & Practice Exam */}
        <div className="lg:col-span-2 space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }}
            >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-medium)] rounded-3xl">
                    <CardHeader className="bg-gradient-to-r from-[var(--focus-purple-light)] to-[var(--novelty-accent-light)] p-8 rounded-t-3xl">
                        <CardTitle className="text-3xl font-bold text-[var(--focus-purple-dark)] flex items-center gap-4">
                            <Sparkles className="w-8 h-8" />
                            Your Next Study Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <PomodoroTimer sessionLength={exam.preferredSessionLength} />

                        {/* Break Message */}
                        <div className="bg-[var(--serotonin-green-light)] border border-[var(--serotonin-green-main)]/30 p-6 rounded-2xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Trophy className="w-6 h-6 text-[var(--serotonin-green-main)]" />
                                <h4 className="text-lg font-bold text-[var(--serotonin-green-dark)]">Take breaks between sections!</h4>
                            </div>
                            <p className="text-[var(--serotonin-green-dark)]/80">
                                After completing 5+ practice questions or flashcards, take a 5-10 minute break to help your brain consolidate the information.
                            </p>
                        </div>

                        {/* Practice Exam Button */}
                        <div className="bg-gradient-to-r from-[var(--dopamine-blue-light)] to-[var(--focus-purple-light)] p-6 rounded-2xl border border-[var(--dopamine-blue-main)]/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-[var(--dopamine-blue-dark)] mb-2">Ready for a Challenge?</h4>
                                    <p className="text-[var(--dopamine-blue-dark)]/80">Test your knowledge with a comprehensive practice exam</p>
                                </div>
                                <Button
                                    onClick={() => setShowPracticeExam(!showPracticeExam)}
                                    className="bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] text-white px-6 py-3 rounded-xl font-semibold"
                                >
                                    <Trophy className="w-5 h-5 mr-2" />
                                    Practice Exam
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xl font-bold mb-4">Tasks for this session:</h4>
                            <div className="space-y-4">
                               {nextUpBursts.length > 0 ? nextUpBursts.map(burst => (
                                   <motion.div 
                                        key={burst.id} 
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="flex items-start gap-4 p-4 -mx-4 rounded-2xl hover:bg-slate-50 transition-colors"
                                    >
                                        <Checkbox 
                                            id={`burst-${burst.id}`}
                                            checked={burst.isCompleted}
                                            onCheckedChange={(checked) => handleBurstToggle(burst.id, checked)}
                                            className="w-6 h-6 mt-1"
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor={`burst-${burst.id}`} className={`text-lg font-semibold ${burst.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--foreground)]'}`}>
                                                {burst.title}
                                            </Label>
                                            <p className={`text-sm ${burst.isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>{burst.taskDetails}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <Badge variant="secondary" className="bg-slate-100">
                                                    <TaskIcon taskType={burst.taskType}/>
                                                    <span className="ml-2">{burst.topic} &gt; {burst.subtopic}</span>
                                                </Badge>
                                                <Badge variant="secondary" className="bg-slate-100">
                                                    <Clock className="w-4 h-4 mr-1.5" />
                                                    {burst.estimatedDuration} min
                                                </Badge>
                                                {burst.tags?.map(tag => <Badge key={tag} variant="outline" className="border-slate-300"><TagIcon tagName={tag}/> <span className="ml-1.5">{tag}</span></Badge>)}
                                            </div>
                                        </div>
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0">
                                                    <Tag className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleTagChange(burst.id, 'Important')}>Important</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleTagChange(burst.id, 'Review Later')}>Review Later</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleTagChange(burst.id, 'Confusing')}>Confusing</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                   </motion.div>
                               )) : (
                                   <div className="text-center py-12">
                                       <Trophy className="w-16 h-16 mx-auto text-[var(--serotonin-green-main)] mb-4" />
                                       <h3 className="text-2xl font-bold text-[var(--foreground)]">All Done for Now!</h3>
                                       <p className="text-lg text-[var(--text-muted)] mt-2">You've completed all your study bursts. Great job!</p>
                                   </div>
                               )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Practice Exam Component */}
            <AnimatePresence>
                {showPracticeExam && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <PracticeExam 
                            examId={exam.id}
                            examName={exam.name}
                            onExamComplete={handleExamComplete}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Right Column: Progress & All Tasks */}
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
            >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-soft)] rounded-3xl">
                    <CardHeader className="p-6">
                        <CardTitle className="text-2xl font-bold text-[var(--foreground)]">Overall Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 space-y-4">
                        <div className="relative h-4 w-full bg-slate-100 rounded-full">
                            <motion.div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--serotonin-green-main)] to-[var(--info-cyan-main)] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-lg font-semibold">
                            <span className="text-[var(--text-muted)]">{completedBursts} / {totalBursts} bursts completed</span>
                            <span className="text-[var(--serotonin-green-dark)]">{progress}%</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.3 } }}
            >
                <Card className="bg-white border-[var(--border)] shadow-[var(--shadow-soft)] rounded-3xl">
                    <CardHeader className="p-6">
                        <CardTitle className="text-2xl font-bold text-[var(--foreground)]">Full Study Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 max-h-[50vh] overflow-y-auto">
                        <div className="space-y-3">
                            {bursts.map(burst => (
                                <div key={burst.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
                                   <Checkbox 
                                        id={`full-burst-${burst.id}`}
                                        checked={burst.isCompleted}
                                        onCheckedChange={(checked) => handleBurstToggle(burst.id, checked)}
                                        className="w-5 h-5 mt-1"
                                    />
                                    <div>
                                        <Label htmlFor={`full-burst-${burst.id}`} className={`font-semibold ${burst.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                            {burst.title}
                                        </Label>
                                        <p className="text-xs text-slate-500">{burst.topic} - {burst.estimatedDuration} min</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>

      </div>

      <AnimatePresence>
        {isTutorOpen && <AITutor materials={materials} examName={exam.name} onClose={() => setIsTutorOpen(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.5 }}
        className="fixed bottom-8 right-8"
      >
        <Button onClick={() => setIsTutorOpen(true)} className="w-16 h-16 rounded-full shadow-lg bg-gradient-to-br from-[var(--focus-purple-main)] to-[var(--dopamine-blue-main)]">
            <MessageSquare className="w-8 h-8"/>
        </Button>
      </motion.div>
    </div>
  );
}
