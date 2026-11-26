export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type ThemeMode = 'dark' | 'light' | 'oled';

export type AccentColor = 'emerald' | 'indigo' | 'amber' | 'cyan' | 'rose';

export type PageId =
  | 'dashboard'
  | 'myday'
  | 'projects'
  | 'calendar'
  | 'gym'
  | 'pomodoro'
  | 'habits'
  | 'goals'
  | 'journal'
  | 'planning'
  | 'stats'
  | 'settings';

export type QuickSection = 'tasks' | 'gym' | 'habits' | 'pomodoro' | 'goals' | 'journal';

export type HeatmapCategory = 'all' | 'tasks' | 'habits' | 'pomodoro' | 'gym' | 'water' | 'journal';

export interface Project {
  id: string;
  name: string;
  folder?: string;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  projectId?: string;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderMinutesBefore?: number;
  inMyDay: boolean;
  myDayDate?: string;
  completed: boolean;
  completedAt?: string | null;
  /** Primeira vez que foi concluída: garante o XP mesmo se desmarcar ou excluir depois */
  firstCompletedAt?: string | null;
  goalId?: string;
  pomodorosCompleted: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Habit {
  id: string;
  title: string;
  color: string;
  frequency: 'daily' | 'weekdays' | 'custom';
  targetDays: number[]; // 0 (Dom) - 6 (Sab)
  reminderTime?: string;
  goalId?: string;
  logs: Record<string, boolean>; // YYYY-MM-DD -> true
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
}

export interface WorkoutTemplate {
  id: string;
  code: string; // Ex: A, B, C, D...
  name: string; // Ex: Peito & Tríceps
  color: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  name: string;
  weightKg?: number;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  code: string;
  name: string;
  date: string; // YYYY-MM-DD
  durationMinutes?: number;
  notes?: string;
  completedExerciseIds: string[];
  /** Carga usada em cada exercício nesta sessão (para evolução e recordes) */
  exerciseLogs?: WorkoutExerciseLog[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PomodoroSession {
  id: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  taskId?: string;
  completedAt: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  horizon: 'short' | 'medium' | 'long';
  targetDate?: string;
  progressMode: 'milestones' | 'numeric' | 'linked';
  milestones: GoalMilestone[];
  currentValue: number;
  targetValue: number;
  unit?: string;
  linkedProjectId?: string;
  linkedHabitId?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  note: string;
  gratitude?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  topPriorityTaskIds: string[];
  focusIntention: string;
  completedAt?: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD (segunda-feira)
  wins: string;
  blockers: string;
  nextWeekFocus: string;
  completedAt: string;
}

export type NotificationFrequency = 'low' | 'medium' | 'high';

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentColor;
  gymWeeklyGoal: number;
  notificationsEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  waterReminderEnabled: boolean;
  /** Meta diária de copos de água */
  waterGoal: number;
  /** "Não perturbe" ativo até este horário (ISO) */
  dndUntil: string | null;
  dailyReminderTime: string;
  dashboardWidgets: {
    habits: boolean;
    gym: boolean;
    pomodoro: boolean;
    journal: boolean;
    goals: boolean;
    water: boolean;
  };
  pomodoro: {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cyclesBeforeLongBreak: number;
    soundEnabled: boolean;
  };
  syncConfig: {
    provider: 'local' | 'supabase';
    lastSyncedAt?: string | null;
  };
}

export interface AppState {
  version: 1;
  /** Última alteração local (usado na sincronização) */
  updatedAt: string;
  /** Copos de água por dia: YYYY-MM-DD -> quantidade */
  waterLogs: Record<string, number>;
  projects: Project[];
  tasks: Task[];
  habits: Habit[];
  workoutTemplates: WorkoutTemplate[];
  workoutSessions: WorkoutSession[];
  pomodoroSessions: PomodoroSession[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  dailyPlans: DailyPlan[];
  weeklyReviews: WeeklyReview[];
  settings: AppSettings;
}
