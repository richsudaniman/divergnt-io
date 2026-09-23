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

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
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
    
    // Check authentication first
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error('Auth error:', authError);
      return Response.json({ error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user progress with error handling
    let userProgress;
    try {
      const progressList = await base44.entities.UserProgress.list();
      userProgress = progressList.length > 0 ? progressList[0] : null;
    } catch (dbError) {
      console.error('Database error fetching progress:', dbError);
      // Return minimal data instead of failing completely
      return Response.json({
        weeklyScore: 0,
        currentLevel: 'butter_knife',
        currentLevelName: 'Butter Knife',
        currentStreak: 0,
        longestStreak: 0,
        totalStepsCompleted: 0,
        totalPhasesCompleted: 0,
        totalTasksCompleted: 0,
        nextLevelInfo: {
          nextLevel: 'nerf_gun',
          pointsNeeded: 50,
          progressPercent: 0,
          nextLevelName: 'Nerf Gun'
        }
      });
    }

    // Create initial progress if none exists
    if (!userProgress) {
      try {
        userProgress = await base44.entities.UserProgress.create({
          currentWeek: getStartOfWeek(new Date()),
          weeklyScore: 0,
          currentLevel: 'butter_knife',
          currentStreak: 0,
          lastActiveDate: null,
          longestStreak: 0
        });
      } catch (createError) {
        console.error('Error creating initial progress:', createError);
        // Return fallback data
        return Response.json({
          weeklyScore: 0,
          currentLevel: 'butter_knife',
          currentLevelName: 'Butter Knife',
          currentStreak: 0,
          longestStreak: 0,
          totalStepsCompleted: 0,
          totalPhasesCompleted: 0,
          totalTasksCompleted: 0,
          nextLevelInfo: {
            nextLevel: 'nerf_gun',
            pointsNeeded: 50,
            progressPercent: 0,
            nextLevelName: 'Nerf Gun'
          }
        });
      }
    }

    const thisWeek = getStartOfWeek(new Date());
    
    // Check if we need to reset weekly score
    let weeklyScore = userProgress.weeklyScore || 0;
    let currentLevel = userProgress.currentLevel || 'butter_knife';
    
    if (userProgress.currentWeek !== thisWeek) {
      weeklyScore = 0;
      currentLevel = 'butter_knife';
      
      // Try to update, but don't fail if it doesn't work
      try {
        await base44.entities.UserProgress.update(userProgress.id, {
          currentWeek: thisWeek,
          weeklyScore: 0,
          currentLevel: 'butter_knife'
        });
      } catch (updateError) {
        console.error('Error updating progress for new week:', updateError);
        // Continue with the reset values anyway
      }
    }

    // Get next level info
    const nextLevelInfo = getNextLevelInfo(currentLevel, weeklyScore);
    
    return Response.json({
      weeklyScore,
      currentLevel,
      currentLevelName: LEVEL_NAMES[currentLevel] || 'Butter Knife',
      currentStreak: userProgress.currentStreak || 0,
      longestStreak: userProgress.longestStreak || 0,
      totalStepsCompleted: userProgress.totalStepsCompleted || 0,
      totalPhasesCompleted: userProgress.totalPhasesCompleted || 0,
      totalTasksCompleted: userProgress.totalTasksCompleted || 0,
      nextLevelInfo: {
        ...nextLevelInfo,
        nextLevelName: nextLevelInfo.nextLevel ? LEVEL_NAMES[nextLevelInfo.nextLevel] : null
      }
    });

  } catch (error) {
    console.error('Unexpected error in getUserProgress:', error);
    
    // Return fallback data instead of 500 error
    return Response.json({
      weeklyScore: 0,
      currentLevel: 'butter_knife',
      currentLevelName: 'Butter Knife',
      currentStreak: 0,
      longestStreak: 0,
      totalStepsCompleted: 0,
      totalPhasesCompleted: 0,
      totalTasksCompleted: 0,
      nextLevelInfo: {
        nextLevel: 'nerf_gun',
        pointsNeeded: 50,
        progressPercent: 0,
        nextLevelName: 'Nerf Gun'
      }
    }, { status: 200 }); // Return 200 with fallback data instead of 500
  }
});