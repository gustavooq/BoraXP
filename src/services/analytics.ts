import {
  AppState,
  Goal,
  Habit,
  HeatmapCategory,
  Priority,
  Task,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';
import {
  addDays,
  formatDateKey,
  getLastNDays,
  getLastNWeeks,
  getStartOfWeek,
  parseDateKey,
  todayKey,
} from '../utils/date';

export interface DayActivityDetail {
  dateKey: string;
  tasksDone: number;
  habitsDone: number;
  focusMinutes: number;
  workouts: WorkoutSession[];
  hasJournal: boolean;
  waterGlasses: number;
  score: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GymWeekRow {
  weekStart: string;
  days: {
    dateKey: string;
    sessions: WorkoutSession[];
  }[];
  totalSessions: number;
  goalMet: boolean;
}

export interface GymWeeklyHeatmapData {
  weeks: GymWeekRow[];
  currentWeek: GymWeekRow;
  weeklyStreak: number;
  totalWorkouts: number;
}

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function getDailyActivityMap(
  state: AppState,
  category: HeatmapCategory = 'all',
  daysCount = 140
): Record<string, DayActivityDetail> {
  const days = getLastNDays(daysCount);
  const map: Record<string, DayActivityDetail> = {};

  for (const key of days) {
    map[key] = {
      dateKey: key,
      tasksDone: 0,
      habitsDone: 0,
      focusMinutes: 0,
      workouts: [],
      hasJournal: false,
      waterGlasses: 0,
      score: 0,
      level: 0,
    };
  }

  // Tarefas concluídas contam no histórico mesmo se forem excluídas depois
  for (const task of state.tasks) {
    if (!task.completed || !task.completedAt) continue;
    const dk = formatDateKey(new Date(task.completedAt));
    if (map[dk]) map[dk].tasksDone += 1;
  }

  // Hábitos excluídos/arquivados mantêm o histórico já registrado
  for (const habit of state.habits) {
    for (const [dk, done] of Object.entries(habit.logs)) {
      if (done && map[dk]) map[dk].habitsDone += 1;
    }
  }

  for (const [dk, glasses] of Object.entries(state.waterLogs ?? {})) {
    if (map[dk]) map[dk].waterGlasses = glasses;
  }

  for (const p of state.pomodoroSessions) {
    if (p.mode !== 'focus') continue;
    if (map[p.date]) map[p.date].focusMinutes += p.durationMinutes;
  }

  for (const w of state.workoutSessions) {
    if (w.deletedAt) continue;
    if (map[w.date]) map[w.date].workouts.push(w);
  }

  for (const j of state.journalEntries) {
    if (!j.deletedAt && map[j.date]) map[j.date].hasJournal = true;
  }

  for (const key of days) {
    const item = map[key];
    let score = 0;
    const waterGoal = Math.max(1, state.settings.waterGoal || 8);
    const waterRatio = Math.min(1, item.waterGlasses / waterGoal);

    if (category === 'all') {
      score =
        item.tasksDone * 2 +
        item.habitsDone * 1.5 +
        (item.focusMinutes >= 25 ? Math.ceil(item.focusMinutes / 25) * 1.5 : item.focusMinutes > 0 ? 1 : 0) +
        item.workouts.length * 3 +
        (item.hasJournal ? 1.5 : 0) +
        (waterRatio >= 1 ? 1.5 : waterRatio > 0 ? 0.5 : 0);
    } else if (category === 'water') {
      score = waterRatio >= 1 ? 10 : waterRatio >= 0.75 ? 6 : waterRatio >= 0.4 ? 3 : waterRatio > 0 ? 1 : 0;
    } else if (category === 'tasks') {
      score = item.tasksDone * 2.5;
    } else if (category === 'habits') {
      score = item.habitsDone * 2.5;
    } else if (category === 'pomodoro') {
      score = item.focusMinutes >= 25 ? Math.ceil(item.focusMinutes / 25) * 2.5 : item.focusMinutes > 0 ? 1.5 : 0;
    } else if (category === 'gym') {
      score = item.workouts.length * 6;
    } else if (category === 'journal') {
      score = item.hasJournal ? 6 : 0;
    }

    item.score = score;
    if (score <= 0) item.level = 0;
    else if (score < 3) item.level = 1;
    else if (score < 6) item.level = 2;
    else if (score < 10) item.level = 3;
    else item.level = 4;
  }

  return map;
}

export function getDaySummary(state: AppState, dateKey: string): DayActivityDetail {
  const map = getDailyActivityMap(state, 'all', 365);
  if (map[dateKey]) return map[dateKey];

  const tasksDone = state.tasks.filter(
    (t) => t.completed && t.completedAt && formatDateKey(new Date(t.completedAt)) === dateKey
  ).length;
  const habitsDone = state.habits.filter((h) => h.logs[dateKey]).length;
  const focusMinutes = state.pomodoroSessions
    .filter((p) => p.mode === 'focus' && p.date === dateKey)
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const workouts = state.workoutSessions.filter((w) => !w.deletedAt && w.date === dateKey);
  const hasJournal = state.journalEntries.some((j) => !j.deletedAt && j.date === dateKey);
  const waterGlasses = state.waterLogs?.[dateKey] ?? 0;

  return {
    dateKey,
    tasksDone,
    habitsDone,
    focusMinutes,
    workouts,
    hasJournal,
    waterGlasses,
    score: tasksDone + habitsDone + workouts.length,
    level: tasksDone + habitsDone + workouts.length > 0 ? 2 : 0,
  };
}

export function getUrgentTasks(state: AppState, refToday: string = todayKey()): Task[] {
  const active = state.tasks.filter((t) => !t.deletedAt && !t.completed);

  const relevant = active.filter((t) => {
    const isOverdue = Boolean(t.dueDate && t.dueDate < refToday);
    const isDueToday = t.dueDate === refToday;
    const isHighPriority = t.priority === 'urgent' || t.priority === 'high';
    const isTodayFlag = t.inMyDay && (!t.myDayDate || t.myDayDate === refToday);
    return isOverdue || isDueToday || isHighPriority || isTodayFlag;
  });

  return relevant.sort((a, b) => {
    const aOverdue = a.dueDate && a.dueDate < refToday ? 0 : 1;
    const bOverdue = b.dueDate && b.dueDate < refToday ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const pDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pDiff !== 0) return pDiff;

    const aToday = a.dueDate === refToday ? 0 : 1;
    const bToday = b.dueDate === refToday ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getGymWeeklyHeatmapData(
  state: AppState,
  weeksCount = 12,
  refToday: string = todayKey()
): GymWeeklyHeatmapData {
  const weekMatrices = getLastNWeeks(weeksCount, refToday);
  const goal = Math.max(1, state.settings.gymWeeklyGoal || 4);
  const activeSessions = state.workoutSessions.filter((w) => !w.deletedAt);

  const byDate: Record<string, WorkoutSession[]> = {};
  for (const s of activeSessions) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }

  const weeks: GymWeekRow[] = weekMatrices.map((days) => {
    const rowDays = days.map((dateKey) => ({
      dateKey,
      sessions: byDate[dateKey] ?? [],
    }));
    const totalSessions = rowDays.reduce((sum, d) => sum + d.sessions.length, 0);
    return {
      weekStart: days[0],
      days: rowDays,
      totalSessions,
      goalMet: totalSessions >= goal,
    };
  });

  const currentWeek = weeks[weeks.length - 1];

  // Calcular streak semanal olhando semanas anteriores + semana atual se já bateu a meta
  let weeklyStreak = 0;
  const completedWeeks = [...weeks];
  let idx = completedWeeks.length - 1;
  if (idx >= 0 && !completedWeeks[idx].goalMet) {
    // Semana atual ainda em andamento: começa a contar da semana anterior
    idx -= 1;
  }
  while (idx >= 0 && completedWeeks[idx].goalMet) {
    weeklyStreak += 1;
    idx -= 1;
  }

  return {
    weeks,
    currentWeek,
    weeklyStreak,
    totalWorkouts: activeSessions.length,
  };
}

export function isHabitScheduledForDate(habit: Habit, dateKey: string): boolean {
  if (habit.frequency === 'daily') return true;
  const dow = parseDateKey(dateKey).getDay();
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5;
  return habit.targetDays.includes(dow);
}

export function getHabitStreak(habit: Habit, refToday: string = todayKey()): number {
  let streak = 0;
  let cursor = refToday;

  // Se hoje ainda não marcou, permite começar contando de ontem
  if (!habit.logs[cursor]) {
    cursor = addDays(cursor, -1);
  }

  for (let i = 0; i < 400; i++) {
    if (habit.logs[cursor]) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else if (!isHabitScheduledForDate(habit, cursor)) {
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function getHabitBestStreak(habit: Habit): number {
  const doneDates = Object.entries(habit.logs)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

  if (doneDates.length === 0) return 0;

  let best = 0;
  let current = 0;
  let prev: string | null = null;

  for (const date of doneDates) {
    if (!prev) {
      current = 1;
    } else {
      let expected = addDays(prev, 1);
      let bridged = true;
      while (expected < date) {
        if (isHabitScheduledForDate(habit, expected)) {
          bridged = false;
          break;
        }
        expected = addDays(expected, 1);
      }
      current = bridged ? current + 1 : 1;
    }
    if (current > best) best = current;
    prev = date;
  }

  return best;
}

export function getGoalProgress(goal: Goal, state: AppState): { percent: number; label: string } {
  if (goal.completed) return { percent: 100, label: 'Concluída' };

  if (goal.progressMode === 'milestones') {
    const total = goal.milestones.length;
    if (total === 0) return { percent: 0, label: '0/0 marcos' };
    const done = goal.milestones.filter((m) => m.done).length;
    return {
      percent: Math.round((done / total) * 100),
      label: `${done}/${total} marcos`,
    };
  }

  if (goal.progressMode === 'numeric') {
    const target = Math.max(1, goal.targetValue);
    const pct = Math.min(100, Math.round((goal.currentValue / target) * 100));
    return {
      percent: pct,
      label: `${goal.currentValue}/${target}${goal.unit ? ` ${goal.unit}` : ''}`,
    };
  }

  // Modo vinculado
  if (goal.linkedProjectId) {
    const projectTasks = state.tasks.filter((t) => !t.deletedAt && t.projectId === goal.linkedProjectId);
    const done = projectTasks.filter((t) => t.completed).length;
    const total = projectTasks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { percent: pct, label: `${done}/${total} tarefas` };
  }

  if (goal.linkedHabitId) {
    const habit = state.habits.find((h) => h.id === goal.linkedHabitId);
    if (!habit) return { percent: 0, label: 'Hábito removido' };
    const last30 = getLastNDays(30);
    const doneCount = last30.filter((d) => habit.logs[d]).length;
    const target = Math.max(1, goal.targetValue || 21);
    const pct = Math.min(100, Math.round((doneCount / target) * 100));
    return { percent: pct, label: `${doneCount}/${target} dias (30d)` };
  }

  return { percent: 0, label: '0%' };
}

export function getGlobalStreak(state: AppState, refToday: string = todayKey()): number {
  const map = getDailyActivityMap(state, 'all', 365);
  let streak = 0;
  let cursor = refToday;

  if (!map[cursor] || map[cursor].score <= 0) {
    cursor = addDays(cursor, -1);
  }

  while (map[cursor] && map[cursor].score > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface DailySeriesPoint {
  dateKey: string;
  label: string;
  tasksDone: number;
  habitsDone: number;
  focusMinutes: number;
  workoutsCount: number;
  mood: number | null;
  energy: number | null;
}

export function getLastNDaysStats(state: AppState, n = 14): DailySeriesPoint[] {
  const days = getLastNDays(n);
  const map = getDailyActivityMap(state, 'all', Math.max(n, 30));

  return days.map((dateKey) => {
    const d = map[dateKey];
    const journal = state.journalEntries.find((j) => !j.deletedAt && j.date === dateKey);
    const dt = parseDateKey(dateKey);
    return {
      dateKey,
      label: `${dt.getDate()}/${dt.getMonth() + 1}`,
      tasksDone: d?.tasksDone ?? 0,
      habitsDone: d?.habitsDone ?? 0,
      focusMinutes: d?.focusMinutes ?? 0,
      workoutsCount: d?.workouts.length ?? 0,
      mood: journal ? journal.mood : null,
      energy: journal ? journal.energy : null,
    };
  });
}

export function getCurrentWeekRange(refToday: string = todayKey()): { start: string; end: string } {
  const start = getStartOfWeek(refToday);
  const end = addDays(start, 6);
  return { start, end };
}

/** Sugere o próximo treino da sequência (A → B → C → A...) com base no último registrado. */
export function getNextWorkoutSuggestion(state: AppState): WorkoutTemplate | null {
  const templates = state.workoutTemplates.filter((w) => !w.deletedAt);
  if (templates.length === 0) return null;

  const lastSession = state.workoutSessions
    .filter((s) => !s.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];

  if (!lastSession) return templates[0];
  const idx = templates.findIndex((t) => t.id === lastSession.templateId);
  if (idx === -1) return templates[0];
  return templates[(idx + 1) % templates.length];
}

export interface ExerciseHistoryPoint {
  date: string;
  weightKg: number;
}

/** Histórico de cargas de um exercício (mais antigo → mais recente). */
export function getExerciseHistory(state: AppState, exerciseId: string): ExerciseHistoryPoint[] {
  const points: ExerciseHistoryPoint[] = [];
  for (const s of state.workoutSessions) {
    if (s.deletedAt || !s.exerciseLogs) continue;
    const log = s.exerciseLogs.find((l) => l.exerciseId === exerciseId);
    if (log && typeof log.weightKg === 'number' && log.weightKg > 0) {
      points.push({ date: s.date, weightKg: log.weightKg });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function getExercisePR(state: AppState, exerciseId: string): number | null {
  const hist = getExerciseHistory(state, exerciseId);
  if (hist.length === 0) return null;
  return Math.max(...hist.map((h) => h.weightKg));
}

export function getLastExerciseWeight(state: AppState, exerciseId: string): number | null {
  const hist = getExerciseHistory(state, exerciseId);
  return hist.length > 0 ? hist[hist.length - 1].weightKg : null;
}
