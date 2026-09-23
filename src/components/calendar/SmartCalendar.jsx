import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const EVENT_TYPES = {
  deadline: { color: 'bg-red-100 border-red-300 text-red-800', icon: '⚠️' },
  work_session: { color: 'bg-blue-100 border-blue-300 text-blue-800', icon: '📝' },
  class: { color: 'bg-green-100 border-green-300 text-green-800', icon: '🎓' },
  exam: { color: 'bg-purple-100 border-purple-300 text-purple-800', icon: '📋' },
  focus_time: { color: 'bg-amber-100 border-amber-300 text-amber-800', icon: '🎯' }
};

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

export default function SmartCalendar({ tasks = [], classes = [], onTaskClick, onNavigateToTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    deadline: true,
    work_session: true,
    class: true,
    exam: true,
    focus_time: true
  });

  const generateCalendarEvents = useCallback(() => {
    const events = [];
    const today = new Date();

    // Generate events from tasks
    tasks.forEach(task => {
      // Add deadline event
      if (task.deadline) {
        events.push({
          id: `deadline-${task.id}`,
          title: `${task.name} Due`,
          date: task.deadline,
          time: '23:59',
          type: 'deadline',
          taskId: task.id,
          classId: task.classId,
          description: task.description || 'Assignment deadline',
          estimatedTime: '30 min review'
        });
      }

      // Add work session events
      if (task.workStartDate && !task.isCompleted) {
        // Create work sessions between start date and deadline
        const startDate = new Date(task.workStartDate);
        const endDate = task.deadline ? new Date(task.deadline) : addDays(startDate, 7);
        
        // Calculate number of work sessions needed (estimate 2-3 sessions per task)
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const sessionCount = Math.min(Math.max(Math.ceil(totalDays / 3), 2), 5);
        
        for (let i = 0; i < sessionCount; i++) {
          const sessionDate = addDays(startDate, Math.floor((totalDays / sessionCount) * i));
          if (sessionDate >= today) {
            events.push({
              id: `work-${task.id}-${i}`,
              title: `Work on ${task.name}`,
              date: format(sessionDate, 'yyyy-MM-dd'),
              time: '14:00', // Default afternoon time
              type: 'work_session',
              taskId: task.id,
              classId: task.classId,
              description: `Focused work session for ${task.name}`,
              estimatedTime: '45 min',
              sessionNumber: i + 1,
              totalSessions: sessionCount
            });
          }
        }
      }
    });

    // Add some sample class schedules (this would ideally come from class data)
    const sampleClassEvents = [
      { day: 1, time: '09:00', name: 'Biology 101', classId: classes[0]?.id },
      { day: 3, time: '10:30', name: 'Chemistry Lab', classId: classes[1]?.id },
      { day: 5, time: '14:00', name: 'Physics Lecture', classId: classes[2]?.id }
    ];

    // Generate recurring class events for the current month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    let date = monthStart;
    
    while (date <= monthEnd) {
      sampleClassEvents.forEach(classEvent => {
        if (date.getDay() === classEvent.day && date >= today) {
          events.push({
            id: `class-${classEvent.classId}-${format(date, 'yyyy-MM-dd')}`,
            title: classEvent.name,
            date: format(date, 'yyyy-MM-dd'),
            time: classEvent.time,
            type: 'class',
            classId: classEvent.classId,
            description: `Regular class session`,
            estimatedTime: '90 min'
          });
        }
      });
      date = addDays(date, 1);
    }

    setCalendarEvents(events);
  }, [tasks, classes, currentDate]);

  useEffect(() => {
    generateCalendarEvents();
  }, [generateCalendarEvents]);

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => {
      return event.date === dateStr && selectedFilters[event.type];
    });
  };

  const getClassColor = (classId) => {
    if (!classId) return COLOR_OPTIONS[0];
    const classData = classes.find(c => c.id === classId);
    return COLOR_OPTIONS.find(c => c.key === classData?.color) || COLOR_OPTIONS[0];
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleEventClick = (event) => {
    if (event.taskId && onTaskClick) {
      const task = tasks.find(t => t.id === event.taskId);
      if (task) {
        onTaskClick(task);
      }
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayEvents = getEventsForDate(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] border border-slate-100 p-2 ${
              isCurrentMonth ? 'bg-white' : 'bg-slate-50'
            } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <div className={`text-sm font-medium mb-2 ${
              isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
            } ${isToday ? 'text-blue-900' : ''}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event, index) => {
                const eventStyle = EVENT_TYPES[event.type];
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`text-xs p-1 rounded-md border cursor-pointer transition-all hover:shadow-sm ${eventStyle.color}`}
                    onClick={() => handleEventClick(event)}
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{eventStyle.icon}</span>
                      <span className="truncate font-medium">{event.title}</span>
                    </div>
                    {event.time && (
                      <div className="text-xs opacity-75 mt-0.5">{event.time}</div>
                    )}
                  </motion.div>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-xs text-slate-500 font-medium">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-0">{rows}</div>;
  };

  const toggleFilter = (filterType) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-[var(--shadow-soft)] rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/80 p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[var(--text-main)] flex items-center gap-3">
            <CalendarIcon className="w-5 h-5" />
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* View Controls and Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {['month', 'week', 'day'].map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={viewMode === mode ? 'default' : 'ghost'}
                onClick={() => setViewMode(mode)}
                className="h-7 px-3 text-xs"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            {Object.entries(EVENT_TYPES).map(([type, config]) => (
              <Button
                key={type}
                size="sm"
                variant="ghost"
                onClick={() => toggleFilter(type)}
                className={`h-7 px-2 text-xs ${
                  selectedFilters[type] 
                    ? config.color.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', '')
                    : 'text-slate-400'
                }`}
              >
                {config.icon}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-slate-100 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-[var(--text-muted)] py-3 border-r border-slate-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        {viewMode === 'month' && renderMonthView()}

        {/* Event Hover Tooltip */}
        <AnimatePresence>
          {hoveredEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{EVENT_TYPES[hoveredEvent.type].icon}</span>
                <h4 className="font-semibold text-slate-900">{hoveredEvent.title}</h4>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{hoveredEvent.time} • {hoveredEvent.estimatedTime}</span>
                </div>
                <p>{hoveredEvent.description}</p>
                {hoveredEvent.sessionNumber && (
                  <div className="text-xs text-slate-500">
                    Session {hoveredEvent.sessionNumber} of {hoveredEvent.totalSessions}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}