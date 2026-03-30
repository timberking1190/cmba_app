// Gamification system for CMBA Coach and Referee certification pathways

export interface Badge {
  id: string;
  name: string;
  icon: string; // emoji for simplicity — rendered as text
  description: string;
  earnedAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  type: "course" | "clinic" | "quiz" | "milestone" | "streak";
}

export interface UserProgress {
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  streakDays: number;
  badges: Badge[];
  completedCourses: string[];
  completedAchievements: string[];
}

// XP thresholds per level
export const XP_LEVELS = [
  { level: 1, title: "Rookie", xp: 0, icon: "1" },
  { level: 2, title: "Starter", xp: 200, icon: "2" },
  { level: 3, title: "Varsity", xp: 500, icon: "3" },
  { level: 4, title: "All-Star", xp: 1000, icon: "4" },
  { level: 5, title: "MVP", xp: 2000, icon: "5" },
  { level: 6, title: "Hall of Fame", xp: 3500, icon: "6" },
];

export function getLevelForXP(xp: number): { level: number; title: string; nextLevelXp: number; progress: number } {
  let currentLevel = XP_LEVELS[0];
  let nextLevel = XP_LEVELS[1];

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) {
      currentLevel = XP_LEVELS[i];
      nextLevel = XP_LEVELS[i + 1] || XP_LEVELS[i];
      break;
    }
  }

  const xpIntoLevel = xp - currentLevel.xp;
  const xpForNextLevel = nextLevel.xp - currentLevel.xp;
  const progress = xpForNextLevel > 0 ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextLevelXp: nextLevel.xp,
    progress,
  };
}

// XP rewards for different activities
export const XP_REWARDS = {
  completeCourse: 150,
  completeQuiz: 75,
  attendClinic: 200,
  dailyLogin: 10,
  streakBonus7: 50,
  streakBonus30: 200,
  completeMilestone: 300,
  firstCourseBonus: 100,
};

// Badge definitions
export const COACH_BADGES: Badge[] = [
  { id: "first-whistle", name: "First Whistle", icon: "🏀", description: "Complete your first training course" },
  { id: "safe-sport", name: "Safe Sport Champion", icon: "🛡️", description: "Complete Safe CMBA Interactions" },
  { id: "moment-master", name: "Moment Master", icon: "🧠", description: "Complete Managing the Moment" },
  { id: "week-warrior", name: "7-Day Warrior", icon: "🔥", description: "7-day learning streak" },
  { id: "community-certified", name: "Community Certified", icon: "⭐", description: "Complete Community Coach level" },
  { id: "trained-certified", name: "Trained & Ready", icon: "🏆", description: "Complete Trained Coach level" },
  { id: "developed-elite", name: "Developed Elite", icon: "👑", description: "Complete Developed Coach level" },
  { id: "clinic-regular", name: "Clinic Regular", icon: "📋", description: "Attend 3 in-person clinics" },
  { id: "month-streak", name: "30-Day Streak", icon: "💎", description: "30-day learning streak" },
  { id: "full-court", name: "Full Court", icon: "🏟️", description: "Complete all available courses" },
];

export const REF_BADGES: Badge[] = [
  { id: "first-call", name: "First Call", icon: "🏀", description: "Complete your first training module" },
  { id: "safe-sport-ref", name: "Safe Sport Official", icon: "🛡️", description: "Complete Safe CMBA Interactions" },
  { id: "signals-master", name: "Signals Master", icon: "🤚", description: "Complete the Signals Guide review" },
  { id: "week-warrior-ref", name: "7-Day Warrior", icon: "🔥", description: "7-day learning streak" },
  { id: "basic-certified", name: "RAMP Basic", icon: "⭐", description: "Complete RAMP Basic certification" },
  { id: "intermediate-ref", name: "RAMP Intermediate", icon: "🏆", description: "Complete RAMP Intermediate" },
  { id: "advanced-ref", name: "RAMP Advanced", icon: "👑", description: "Complete RAMP Advanced certification" },
  { id: "white-whistle-grad", name: "White Whistle Grad", icon: "📣", description: "Complete White Whistle mentoring" },
  { id: "month-streak-ref", name: "30-Day Streak", icon: "💎", description: "30-day learning streak" },
  { id: "court-general", name: "Court General", icon: "🏟️", description: "Complete all referee training" },
];
