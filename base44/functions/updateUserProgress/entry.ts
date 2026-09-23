import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

const LEVEL_THRESHOLDS = {
  butter_knife: 0,
  nerf_gun: 50,
  laser_shooter: 150,
  nuke: 300,
  atomic_bomb: 500,
  black_hole: 800,
  reality_bender: 1200
};

const LEVEL_NAMES = {
  butter_knife: "Butter Knife",
  nerf_gun: "Nerf Gun", 
  laser_shooter: "Laser Shooter",
  nuke: "Nuke",
  atomic_bomb: "Atomic Bomb",
  black_hole: "Black Hole",
  reality_bender: "Reality Bender"
};

const POINT_VALUES = {
  step_completed: 5,
  phase_completed: 15,
  task_completed: 30,
  brain_dump_created: 10,
  video_processed: 20,
  exam_prep_started: 25,
  daily_engagement: 10,
  early_deadline_bonus: 20
};

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function calculateLevel(score) {
  const levels = Object.keys(LEVEL_THRESHOLDS);
  for (let i = levels.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[levels[i]]) {
      return levels[i];
    }
  }
  return 'butter_knife';
}

function getNextLevelInfo(currentLevel, score) {
  const levels = Object.keys(LEVEL_THRESHOLDS);
  const currentIndex = levels.indexOf(currentLevel);
  
  if (currentIndex === levels.length - 1) {
    return {
      nextLevel: null,
      pointsNeeded: 0,
      progressPercent: 100
    };
  }
  
  const nextLevel = levels[currentIndex + 1];
  const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
  
  const pointsNeeded = nextThreshold - score;
  const progressPercent = ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  
  return {
    nextLevel,
    pointsNeeded: Math.max(0, pointsNeeded),
    progressPercent: Math.max(0, Math.min(100, progressPercent))
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityType, metadata = {} } = await req.json();
    
    if (!activityType) {
      return Response.json({ error: 'Activity type required' }, { status: 400 });
    }

    // Get or create user progress
    let userProgress = await base44.entities.UserProgress.list();
    if (userProgress.length === 0) {
      userProgress = await base44.entities.UserProgress.create({
        currentWeek: getStartOfWeek(new Date()),
        weeklyScore: 0,
        currentLevel: 'butter_knife',
        currentStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        longestStreak: 0
      });
    } else {
      userProgress = userProgress[0];
    }

    const today = new Date().toISOString().split('T')[0];
    const thisWeek = getStartOfWeek(new Date());
    
    // Check if we need to reset weekly score
    let weeklyScore = userProgress.weeklyScore;
    if (userProgress.currentWeek !== thisWeek) {
      weeklyScore = 0;
    }

    // Update streak logic
    let currentStreak = userProgress.currentStreak;
    const lastActiveDate = userProgress.lastActiveDate;
    
    if (lastActiveDate) {
      const lastDate = new Date(lastActiveDate);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        currentStreak += 1;
      } else if (diffDays > 1) {
        // Streak broken
        currentStreak = 1;
      }
      // If diffDays === 0 (same day), keep current streak
    } else {
      currentStreak = 1;
    }

    // Calculate points for this activity
    let pointsEarned = POINT_VALUES[activityType] || 0;
    
    // Apply streak multiplier (max 2x)
    const streakMultiplier = Math.min(1 + (currentStreak * 0.1), 2);
    pointsEarned = Math.floor(pointsEarned * streakMultiplier);
    
    // Add daily engagement bonus if first activity today
    if (lastActiveDate !== today) {
      pointsEarned += POINT_VALUES.daily_engagement;
    }

    // Early deadline bonus logic
    if (metadata.isEarlyDeadline) {
      pointsEarned += POINT_VALUES.early_deadline_bonus;
    }

    // Update weekly score
    const newWeeklyScore = weeklyScore + pointsEarned;
    
    // Calculate new level
    const oldLevel = userProgress.currentLevel;
    const newLevel = calculateLevel(newWeeklyScore);
    const leveledUp = oldLevel !== newLevel;
    
    // Update activity counters
    const updates = {
      currentWeek: thisWeek,
      weeklyScore: newWeeklyScore,
      currentLevel: newLevel,
      currentStreak,
      lastActiveDate: today,
      longestStreak: Math.max(userProgress.longestStreak, currentStreak)
    };

    // Increment specific counters
    switch (activityType) {
      case 'step_completed':
        updates.totalStepsCompleted = (userProgress.totalStepsCompleted || 0) + 1;
        break;
      case 'phase_completed':
        updates.totalPhasesCompleted = (userProgress.totalPhasesCompleted || 0) + 1;
        break;
      case 'task_completed':
        updates.totalTasksCompleted = (userProgress.totalTasksCompleted || 0) + 1;
        break;
      case 'brain_dump_created':
        updates.brainDumpsCreated = (userProgress.brainDumpsCreated || 0) + 1;
        break;
      case 'video_processed':
        updates.videosProcessed = (userProgress.videosProcessed || 0) + 1;
        break;
      case 'exam_prep_started':
        updates.examPrepsStarted = (userProgress.examPrepsStarted || 0) + 1;
        break;
    }

    // Update the progress record
    await base44.entities.UserProgress.update(userProgress.id, updates);

    // Get next level info
    const nextLevelInfo = getNextLevelInfo(newLevel, newWeeklyScore);
    
    return Response.json({
      success: true,
      pointsEarned,
      streakMultiplier,
      leveledUp,
      oldLevel: LEVEL_NAMES[oldLevel],
      newLevel: LEVEL_NAMES[newLevel],
      weeklyScore: newWeeklyScore,
      currentStreak,
      nextLevelInfo: {
        ...nextLevelInfo,
        nextLevelName: nextLevelInfo.nextLevel ? LEVEL_NAMES[nextLevelInfo.nextLevel] : null
      }
    });

  } catch (error) {
    console.error('Error updating user progress:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});