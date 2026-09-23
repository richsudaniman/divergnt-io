import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Target, 
  AlertCircle, 
  CheckCircle2,
  Zap,
  Calendar,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMinutes, parseISO, addDays } from 'date-fns';

const OPTIMAL_FOCUS_TIMES = [
  { start: '09:00', end: '11:00', label: 'Morning Peak', energy: 'high' },
  { start: '14:00', end: '16:00', label: 'Afternoon Focus', energy: 'medium' },
  { start: '19:00', end: '21:00', label: 'Evening Work', energy: 'medium' }
];

const BUFFER_TIME = 15; // minutes between sessions

export default function TimeBlockScheduler({ 
  tasks = [], 
  existingEvents = [], 
  onScheduleGenerated,
  onConflictResolved 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedSchedule, setSuggestedSchedule] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [preferences, setPreferences] = useState({
    preferredStartTime: '09:00',
    preferredEndTime: '18:00',
    maxSessionLength: 90,
    includeBreaks: true,
    avoidLunchTime: true
  });

  const generateTimeBlocks = async () => {
    setIsGenerating(true);
    
    try {
      // Get incomplete tasks that need scheduling
      const incompleteTasks = tasks.filter(task => 
        !task.isCompleted && 
        task.deadline &&
        (!task.workStartDate || new Date(task.workStartDate) <= new Date())
      );

      // Sort by deadline priority
      const prioritizedTasks = incompleteTasks.sort((a, b) => {
        const deadlineA = new Date(a.deadline);
        const deadlineB = new Date(b.deadline);
        return deadlineA - deadlineB;
      });

      const schedule = [];
      const today = new Date();
      let currentDate = today;

      // For each task, create work sessions
      prioritizedTasks.forEach((task, taskIndex) => {
        const deadline = new Date(task.deadline);
        const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        // Estimate work sessions needed (based on complexity)
        const estimatedSessions = Math.min(Math.max(Math.ceil(daysUntilDeadline / 2), 2), 5);
        const sessionLength = task.estimatedDuration || 60; // default 60 minutes
        
        // Create sessions spread across available days
        for (let sessionIndex = 0; sessionIndex < estimatedSessions; sessionIndex++) {
          const sessionDate = addDays(today, Math.floor((daysUntilDeadline / estimatedSessions) * sessionIndex));
          
          if (sessionDate <= deadline) {
            // Find optimal time slot for this session
            const optimalTime = findOptimalTimeSlot(sessionDate, sessionLength, existingEvents, schedule);
            
            if (optimalTime) {
              schedule.push({
                id: `schedule-${task.id}-${sessionIndex}`,
                taskId: task.id,
                taskName: task.name,
                date: format(sessionDate, 'yyyy-MM-dd'),
                startTime: optimalTime.start,
                endTime: optimalTime.end,
                duration: sessionLength,
                type: 'work_session',
                priority: getPriorityLevel(daysUntilDeadline),
                sessionNumber: sessionIndex + 1,
                totalSessions: estimatedSessions,
                energyLevel: optimalTime.energy || 'medium'
              });
            }
          }
        }
      });

      // Check for conflicts
      const detectedConflicts = detectScheduleConflicts(schedule, existingEvents);
      
      setSuggestedSchedule(schedule);
      setConflicts(detectedConflicts);
      
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const findOptimalTimeSlot = (date, duration, existingEvents, currentSchedule) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Get existing events for this date
    const dayEvents = [
      ...existingEvents.filter(e => e.date === dateStr),
      ...currentSchedule.filter(s => s.date === dateStr)
    ];

    // Try each optimal focus time
    for (const focusTime of OPTIMAL_FOCUS_TIMES) {
      const startTime = focusTime.start;
      const endTime = format(addMinutes(parseISO(`${dateStr}T${startTime}:00`), duration), 'HH:mm');
      
      // Check if this slot is available
      const hasConflict = dayEvents.some(event => {
        const eventStart = event.startTime || event.time;
        const eventEnd = event.endTime || format(addMinutes(parseISO(`${dateStr}T${eventStart}:00`), 60), 'HH:mm');
        
        return (
          (startTime >= eventStart && startTime < eventEnd) ||
          (endTime > eventStart && endTime <= eventEnd) ||
          (startTime <= eventStart && endTime >= eventEnd)
        );
      });

      if (!hasConflict) {
        return {
          start: startTime,
          end: endTime,
          energy: focusTime.energy
        };
      }
    }

    // Fallback: find any available slot
    for (let hour = 9; hour <= 20; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = format(addMinutes(parseISO(`${dateStr}T${startTime}:00`), duration), 'HH:mm');
      
      const hasConflict = dayEvents.some(event => {
        const eventStart = event.startTime || event.time;
        const eventEnd = event.endTime || format(addMinutes(parseISO(`${dateStr}T${eventStart}:00`), 60), 'HH:mm');
        
        return (
          (startTime >= eventStart && startTime < eventEnd) ||
          (endTime > eventStart && endTime <= eventEnd)
        );
      });

      if (!hasConflict) {
        return { start: startTime, end: endTime, energy: 'medium' };
      }
    }

    return null; // No available slot found
  };

  const detectScheduleConflicts = (schedule, existingEvents) => {
    const conflicts = [];
    
    schedule.forEach(session => {
      const conflictingEvents = existingEvents.filter(event => 
        event.date === session.date &&
        ((session.startTime >= event.startTime && session.startTime < event.endTime) ||
         (session.endTime > event.startTime && session.endTime <= event.endTime))
      );
      
      if (conflictingEvents.length > 0) {
        conflicts.push({
          session,
          conflictingEvents,
          suggestions: generateConflictResolutions(session, conflictingEvents)
        });
      }
    });
    
    return conflicts;
  };

  const generateConflictResolutions = (session, conflictingEvents) => {
    return [
      {
        type: 'reschedule',
        description: `Move to ${format(addMinutes(parseISO(`${session.date}T${session.endTime}:00`), BUFFER_TIME), 'HH:mm')}`,
        newTime: format(addMinutes(parseISO(`${session.date}T${session.endTime}:00`), BUFFER_TIME), 'HH:mm')
      },
      {
        type: 'different_day',
        description: 'Schedule for next available day',
        newDate: format(addDays(new Date(session.date), 1), 'yyyy-MM-dd')
      },
      {
        type: 'split',
        description: 'Split into two shorter sessions',
        newDuration: Math.floor(session.duration / 2)
      }
    ];
  };

  const getPriorityLevel = (daysUntilDeadline) => {
    if (daysUntilDeadline <= 2) return 'critical';
    if (daysUntilDeadline <= 5) return 'high';
    if (daysUntilDeadline <= 10) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  const handleApplySchedule = () => {
    if (onScheduleGenerated) {
      onScheduleGenerated(suggestedSchedule);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Smart Time Blocking
        </CardTitle>
        <p className="text-sm text-slate-600">
          Generate an optimal schedule for your tasks based on deadlines and focus patterns
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Generate Schedule Button */}
        <Button
          onClick={generateTimeBlocks}
          disabled={isGenerating || tasks.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Schedule...
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Generate Smart Schedule
            </>
          )}
        </Button>

        {/* Generated Schedule */}
        <AnimatePresence>
          {suggestedSchedule.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-800">
                  Suggested Schedule ({suggestedSchedule.length} sessions)
                </h4>
                <Button
                  onClick={handleApplySchedule}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply Schedule
                </Button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {suggestedSchedule.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-slate-800 mb-1">
                          {session.taskName}
                        </h5>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.date), 'MMM d')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.startTime} - {session.endTime}
                          </div>
                          <Badge className={getPriorityColor(session.priority)}>
                            {session.priority}
                          </Badge>
                          <Badge variant="outline">
                            Session {session.sessionNumber}/{session.totalSessions}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {session.duration} min
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Found {conflicts.length} scheduling conflicts. Please resolve them before applying the schedule.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}