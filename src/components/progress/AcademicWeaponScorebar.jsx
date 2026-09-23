
import React, { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserProgress } from '@/functions/getUserProgress';

const WEAPON_ICONS = {
  butter_knife: '🔪',
  nerf_gun: '🔫',
  laser_shooter: '⚡',
  nuke: '💣',
  atomic_bomb: '☢️',
  black_hole: '🕳️',
  reality_bender: '🌌'
};

const WEAPON_COLORS = {
  butter_knife: 'from-slate-400 to-slate-500',
  nerf_gun: 'from-orange-400 to-orange-500',
  laser_shooter: 'from-blue-400 to-blue-500',
  nuke: 'from-red-400 to-red-500',
  atomic_bomb: 'from-purple-400 to-purple-500',
  black_hole: 'from-indigo-400 to-indigo-500',
  reality_bender: 'from-pink-400 via-purple-500 to-indigo-500'
};

export default function AcademicWeaponScorebar({ onLevelUp }) {
  const [progressData, setProgressData] = useState({
    weeklyScore: 0,
    currentLevel: 'butter_knife',
    currentLevelName: 'Butter Knife',
    currentStreak: 0,
    longestStreak: 0,
    nextLevelInfo: {
      pointsNeeded: 50,
      progressPercent: 0,
      nextLevelName: 'Nerf Gun'
    }
  });
  
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState(null);

  const loadUserProgress = useCallback(async () => {
    try {
      const { data } = await getUserProgress();
      
      // Check for level up
      // Note: previousLevel is captured from the state when useCallback is defined.
      // This means it might not reflect the absolute latest state if multiple quick updates happen.
      // For more robust "level up" detection, consider comparing data.currentLevel with 
      // progressData.currentLevel from the latest state, or ensure `previousLevel` is always up-to-date
      // via a ref or by placing it in the dependency array. 
      // For this specific change, we're adhering to the outline's dependency structure.
      if (previousLevel && previousLevel !== data.currentLevel) {
        setShowLevelUpCelebration(true);
        setTimeout(() => setShowLevelUpCelebration(false), 3000);
        
        if (onLevelUp) {
          onLevelUp(data.currentLevelName);
        }
      }
      
      setPreviousLevel(data.currentLevel);
      setProgressData(data);
    } catch (error) {
      console.error('Error loading user progress:', error);
      // Keep fallback data if API call fails
    } finally {
      setIsLoading(false);
    }
  }, [onLevelUp, previousLevel]); // Dependencies for useCallback

  useEffect(() => {
    loadUserProgress();
    
    // Refresh progress data every 30 seconds to show real-time updates
    const interval = setInterval(loadUserProgress, 30000);
    return () => clearInterval(interval);
  }, [loadUserProgress]); // Dependency for useEffect

  const weaponIcon = WEAPON_ICONS[progressData?.currentLevel] || '🔪';
  const weaponColor = WEAPON_COLORS[progressData?.currentLevel] || 'from-slate-400 to-slate-500';

  if (isLoading) {
    return (
      <div className="bg-white/50 p-4 rounded-xl border border-slate-200 animate-pulse">
        <div className="h-4 bg-slate-200 rounded mb-3 w-1/3"></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded mb-2"></div>
            <div className="h-2 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/50 p-4 rounded-xl border border-slate-200">
      <AnimatePresence>
        {showLevelUpCelebration && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-8 shadow-2xl">
              <div className="text-6xl mb-4 text-center">{weaponIcon}</div>
              <div className="text-white text-center">
                <div className="text-2xl font-bold">LEVEL UP!</div>
                <div className="text-lg">{progressData?.currentLevelName}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wide">
        Your Academic Weapon
      </h3>

      {/* Scorebar Content */}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${weaponColor} rounded-xl flex items-center justify-center shadow-sm`}>
          <span className="text-2xl">{weaponIcon}</span>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">{progressData?.currentLevelName || 'Butter Knife'}</h2>
            {progressData?.currentStreak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">{progressData.currentStreak}</span>
              </div>
            )}
            <Badge variant="secondary" className="text-xs">
              {progressData?.weeklyScore || 0} pts
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Progress 
              value={progressData?.nextLevelInfo?.progressPercent || 0} 
              className="flex-1 h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[var(--soft-blue)] [&>div]:to-[var(--soft-purple)] rounded-full" 
            />
            {progressData?.nextLevelInfo?.nextLevelName && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {progressData.nextLevelInfo.pointsNeeded} to {progressData.nextLevelInfo.nextLevelName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
