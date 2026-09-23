import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RefreshCw, Coffee, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PomodoroTimer({ sessionLength = 25 }) {
  const FOCUS_TIME = sessionLength * 60;
  const BREAK_TIME = 5 * 60;

  const [mode, setMode] = useState('focus'); // 'focus' or 'break'
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setTimeLeft(FOCUS_TIME);
  }, [sessionLength, FOCUS_TIME]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(BREAK_TIME);
      } else {
        setMode('focus');
        setTimeLeft(FOCUS_TIME);
      }
      setIsActive(false); // Pause when switching modes
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, FOCUS_TIME, BREAK_TIME]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setMode('focus');
    setTimeLeft(FOCUS_TIME);
  }, [FOCUS_TIME]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? ((FOCUS_TIME - timeLeft) / FOCUS_TIME) * 100 
    : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

  return (
    <Card className="bg-white/80 backdrop-blur-md border-[var(--border)] shadow-sm rounded-2xl">
      <CardContent className="p-6 text-center">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          {mode === 'focus' ? <Brain className="w-6 h-6 text-[var(--focus-purple-main)]" /> : <Coffee className="w-6 h-6 text-[var(--serotonin-green-main)]" />}
          <h3 className="text-xl font-bold">{mode === 'focus' ? 'Focus Session' : 'Short Break'}</h3>
        </motion.div>
        
        <div className="text-7xl font-bold text-[var(--foreground)] my-4">{formatTime(timeLeft)}</div>
        
        <Progress value={progress} className={`h-2 mb-6 ${mode === 'focus' ? '[&>div]:bg-[var(--focus-purple-main)]' : '[&>div]:bg-[var(--serotonin-green-main)]'}`} />

        <div className="flex justify-center gap-4">
          <Button onClick={toggleTimer} size="lg" className="w-32 bg-[var(--dopamine-blue-main)] hover:bg-[var(--dopamine-blue-dark)] rounded-xl">
            {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          <Button onClick={resetTimer} variant="outline" size="lg" className="rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}