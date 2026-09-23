import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const EVENT_TYPES = [
  { value: 'work_session', label: 'Work Session', icon: '📝' },
  { value: 'focus_time', label: 'Focus Time', icon: '🎯' },
  { value: 'class', label: 'Class/Meeting', icon: '🎓' },
  { value: 'exam', label: 'Exam/Quiz', icon: '📋' }
];

const TIME_BLOCKS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const DURATION_OPTIONS = [
  { value: 25, label: '25 minutes (Pomodoro)' },
  { value: 45, label: '45 minutes (Standard)' },
  { value: 90, label: '90 minutes (Deep work)' },
  { value: 120, label: '2 hours (Project time)' },
  { value: 180, label: '3 hours (Extended)' }
];

export default function CalendarEventCreator({ 
  isOpen, 
  onClose, 
  onEventCreate, 
  selectedDate, 
  tasks = [], 
  classes = [] 
}) {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: 45,
    type: 'work_session',
    taskId: '',
    classId: '',
    recurring: false
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!eventData.title.trim()) {
      newErrors.title = 'Event title is required';
    }
    if (!eventData.date) {
      newErrors.date = 'Date is required';
    }
    if (!eventData.time) {
      newErrors.time = 'Time is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onEventCreate(eventData);
      handleClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to create event' });
    }
  };

  const handleClose = () => {
    setEventData({
      title: '',
      description: '',
      date: selectedDate || new Date().toISOString().split('T')[0],
      time: '14:00',
      duration: 45,
      type: 'work_session',
      taskId: '',
      classId: '',
      recurring: false
    });
    setErrors({});
    onClose();
  };

  const getSuggestedTitle = () => {
    if (eventData.taskId && eventData.type === 'work_session') {
      const task = tasks.find(t => t.id === eventData.taskId);
      return task ? `Work on ${task.name}` : '';
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Schedule Focus Time
          </DialogTitle>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Event Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            {EVENT_TYPES.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={eventData.type === type.value ? 'default' : 'outline'}
                onClick={() => setEventData(prev => ({ ...prev, type: type.value }))}
                className="h-12 flex items-center gap-2 text-sm"
              >
                <span className="text-base">{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>

          {/* Link to Task (for work sessions) */}
          {eventData.type === 'work_session' && tasks.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Link to Task (Optional)
              </Label>
              <Select 
                value={eventData.taskId} 
                onValueChange={(value) => {
                  setEventData(prev => ({ 
                    ...prev, 
                    taskId: value,
                    title: value ? getSuggestedTitle() : prev.title
                  }));
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a task to work on" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No specific task</SelectItem>
                  {tasks.filter(t => !t.isCompleted).map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Event Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">
              Event Title *
            </Label>
            <Input
              id="title"
              value={eventData.title}
              onChange={(e) => setEventData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={getSuggestedTitle() || "Enter event title..."}
              className={`mt-2 ${errors.title ? 'border-red-500' : ''}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-slate-700">
                Date *
              </Label>
              <div className="relative mt-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="date"
                  type="date"
                  value={eventData.date}
                  onChange={(e) => setEventData(prev => ({ ...prev, date: e.target.value }))}
                  className={`pl-10 ${errors.date ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">
                Start Time *
              </Label>
              <Select 
                value={eventData.time} 
                onValueChange={(value) => setEventData(prev => ({ ...prev, time: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_BLOCKS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label className="text-sm font-medium text-slate-700">
              Duration
            </Label>
            <Select 
              value={String(eventData.duration)} 
              onValueChange={(value) => setEventData(prev => ({ ...prev, duration: Number(value) }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add notes or details about this session..."
              className="mt-2 h-20 resize-none"
            />
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              Schedule Event
            </Button>
          </div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}