import { AppState } from '../types';
import { getGlobalStreak, getGymWeeklyHeatmapData } from './analytics';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface GamificationSummary {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  globalStreak: number;
  achievements: Achievement[];
}

export function getGamificationSummary(state: AppState): GamificationSummary {
  // XP é permanente: conta a 1ª conclusão mesmo se a tarefa for desmarcada ou excluída depois
  const completedTasks = state.tasks.filter(
    (t) => Boolean(t.firstCompletedAt) || (t.completed && Boolean(t.completedAt))
  ).length;
  const habitChecks = state.habits.reduce(
    (acc, h) => acc + Object.values(h.logs).filter(Boolean).length,
    0
  );
  const focusSessions = state.pomodoroSessions.filter((p) => p.mode === 'focus').length;
  const workoutCount = state.workoutSessions.filter((w) => !w.deletedAt).length;
  const journalCount = state.journalEntries.filter((j) => !j.deletedAt).length;
  const completedGoals = state.goals.filter((g) => g.completed).length;
  const plansCount = state.dailyPlans.length;
  const reviewsCount = state.weeklyReviews.length;
  const waterGoal = Math.max(1, state.settings.waterGoal || 8);
  const waterEntries = Object.values(state.waterLogs ?? {});
  const waterGlassesXp = waterEntries.reduce((acc, g) => acc + Math.min(g, waterGoal), 0);
  const waterGoalDays = waterEntries.filter((g) => g >= waterGoal).length;

  const totalXp =
    completedTasks * 20 +
    habitChecks * 10 +
    focusSessions * 25 +
    workoutCount * 35 +
    journalCount * 15 +
    completedGoals * 100 +
    plansCount * 15 +
    reviewsCount * 40 +
    waterGlassesXp * 2;

  // Nível = floor(sqrt(xp / 100)) + 1
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const levelFloorXp = Math.pow(level - 1, 2) * 100;
  const nextLevelAbsoluteXp = Math.pow(level, 2) * 100;
  const span = Math.max(100, nextLevelAbsoluteXp - levelFloorXp);
  const currentLevelXp = totalXp - levelFloorXp;
  const nextLevelXp = span;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));

  const globalStreak = getGlobalStreak(state);
  const gymStats = getGymWeeklyHeatmapData(state, 12);

  const achievements: Achievement[] = [
    {
      id: 'ach_first_task',
      title: 'Primeiro Passo',
      description: 'Conclua sua primeira tarefa.',
      unlocked: completedTasks >= 1,
      progressText: `${Math.min(completedTasks, 1)}/1`,
    },
    {
      id: 'ach_10_tasks',
      title: 'Executor Focado',
      description: 'Conclua 10 tarefas.',
      unlocked: completedTasks >= 10,
      progressText: `${Math.min(completedTasks, 10)}/10`,
    },
    {
      id: 'ach_streak_7',
      title: 'Semana Imparável',
      description: 'Mantenha um streak global de 7 dias.',
      unlocked: globalStreak >= 7,
      progressText: `${Math.min(globalStreak, 7)}/7 dias`,
    },
    {
      id: 'ach_gym_first',
      title: 'Modo Treino',
      description: 'Registre seu primeiro treino na Academia.',
      unlocked: workoutCount >= 1,
      progressText: `${Math.min(workoutCount, 1)}/1`,
    },
    {
      id: 'ach_gym_week',
      title: 'Meta Semanal Fitness',
      description: 'Bata a meta semanal de treinos na Academia.',
      unlocked: gymStats.weeklyStreak >= 1 || gymStats.currentWeek.goalMet,
      progressText: gymStats.currentWeek.goalMet ? 'Concluído' : `${gymStats.currentWeek.totalSessions}/${state.settings.gymWeeklyGoal}`,
    },
    {
      id: 'ach_pomodoro_5',
      title: 'Zona de Fluxo',
      description: 'Complete 5 sessões de foco Pomodoro.',
      unlocked: focusSessions >= 5,
      progressText: `${Math.min(focusSessions, 5)}/5`,
    },
    {
      id: 'ach_journal_5',
      title: 'Mente Clara',
      description: 'Faça 5 registros no Diário.',
      unlocked: journalCount >= 5,
      progressText: `${Math.min(journalCount, 5)}/5`,
    },
    {
      id: 'ach_goal_1',
      title: 'Conquistador',
      description: 'Finalize sua primeira meta.',
      unlocked: completedGoals >= 1,
      progressText: `${Math.min(completedGoals, 1)}/1`,
    },
    {
      id: 'ach_water_7',
      title: 'Hidratado',
      description: 'Bata a meta de água em 7 dias.',
      unlocked: waterGoalDays >= 7,
      progressText: `${Math.min(waterGoalDays, 7)}/7 dias`,
    },
  ];

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
    globalStreak,
    achievements,
  };
}
