import { AppSettings, AppState, DashboardWidgetKey, Habit, Project, Task, WorkoutTemplate } from '../types';
import { nowIso, todayKey } from '../utils/date';
import { createId } from '../utils/id';

const STORAGE_KEY = 'boraxp_state_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: 'emerald',
  gymWeeklyGoal: 4,
  notificationsEnabled: false,
  notificationFrequency: 'low',
  waterReminderEnabled: false,
  waterGoal: 8,
  dndUntil: null,
  dailyReminderTime: '08:30',
  dashboardWidgets: {
    habits: true,
    gym: true,
    pomodoro: true,
    journal: true,
    goals: true,
    water: true,
  },
  dashboardWidgetOrder: ['gym', 'water', 'habits', 'pomodoro', 'journal', 'goals'],
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    soundEnabled: true,
  },
  syncConfig: {
    provider: 'local',
    lastSyncedAt: null,
  },
};

export function createInitialState(): AppState {
  const ts = nowIso();
  const today = todayKey();

  const pPersonal: Project = {
    id: 'proj_pessoal',
    name: 'Pessoal',
    folder: 'Vida',
    color: '#10b981',
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  const pWork: Project = {
    id: 'proj_trabalho',
    name: 'Trabalho',
    folder: 'Carreira',
    color: '#6366f1',
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  const pStudy: Project = {
    id: 'proj_estudos',
    name: 'Estudos',
    folder: 'Crescimento',
    color: '#06b6d4',
    archived: false,
    createdAt: ts,
    updatedAt: ts,
  };

  const workoutTemplates: WorkoutTemplate[] = [
    {
      id: 'gym_a',
      code: 'A',
      name: 'Peito & TrÃ­ceps',
      color: '#10b981',
      exercises: [
        { id: createId('ex'), name: 'Supino reto', sets: 4, reps: '8-10', weight: '20kg/lado' },
        { id: createId('ex'), name: 'Supino inclinado halteres', sets: 3, reps: '10-12', weight: '18kg' },
        { id: createId('ex'), name: 'Crucifixo mÃ¡quina', sets: 3, reps: '12-15' },
        { id: createId('ex'), name: 'TrÃ­ceps corda na polia', sets: 4, reps: '10-12' },
      ],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'gym_b',
      code: 'B',
      name: 'Costas & BÃ­ceps',
      color: '#06b6d4',
      exercises: [
        { id: createId('ex'), name: 'Puxada frente aberta', sets: 4, reps: '8-12' },
        { id: createId('ex'), name: 'Remada baixa neutra', sets: 4, reps: '10-12' },
        { id: createId('ex'), name: 'Remada unilateral halter', sets: 3, reps: '10/lado' },
        { id: createId('ex'), name: 'Rosca direta barra W', sets: 3, reps: '10-12' },
      ],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'gym_c',
      code: 'C',
      name: 'Pernas & Ombros',
      color: '#f59e0b',
      exercises: [
        { id: createId('ex'), name: 'Agachamento livre / Smith', sets: 4, reps: '8-10' },
        { id: createId('ex'), name: 'Leg press 45Â°', sets: 4, reps: '10-12' },
        { id: createId('ex'), name: 'Cadeira extensora', sets: 3, reps: '12-15' },
        { id: createId('ex'), name: 'Desenvolvimento halteres + ElevaÃ§Ã£o lateral', sets: 4, reps: '10-12' },
      ],
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const habits: Habit[] = [
    {
      id: 'hab_agua',
      title: 'Beber 2L de Ã¡gua',
      color: '#06b6d4',
      frequency: 'daily',
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      logs: {},
      archived: false,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'hab_leitura',
      title: 'Leitura 15 min',
      color: '#10b981',
      frequency: 'daily',
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      logs: {},
      archived: false,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task_welcome_1',
      title: 'Definir minhas 3 prioridades de hoje',
      notes: 'Use o mÃ³dulo Planejamento ou clique direto para concluir.',
      projectId: pPersonal.id,
      priority: 'urgent',
      dueDate: today,
      inMyDay: true,
      myDayDate: today,
      completed: false,
      completedAt: null,
      pomodorosCompleted: 0,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'task_welcome_2',
      title: 'Personalizar treinos A/B/C na seÃ§Ã£o Academia',
      notes: 'VocÃª pode editar exercÃ­cios ou criar treinos D, E com o botÃ£o +.',
      projectId: pPersonal.id,
      priority: 'high',
      dueDate: today,
      inMyDay: true,
      myDayDate: today,
      completed: false,
      completedAt: null,
      pomodorosCompleted: 0,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  return {
    version: 1,
    updatedAt: ts,
    waterLogs: {},
    projects: [pPersonal, pWork, pStudy],
    tasks,
    habits,
    workoutTemplates,
    workoutSessions: [],
    pomodoroSessions: [],
    goals: [],
    journalEntries: [],
    dailyPlans: [],
    weeklyReviews: [],
    settings: DEFAULT_SETTINGS,
  };
}

export function normalizeWidgetOrder(order?: unknown): DashboardWidgetKey[] {
  const valid: DashboardWidgetKey[] = ['gym', 'water', 'habits', 'pomodoro', 'journal', 'goals'];
  if (!Array.isArray(order)) return [...valid];
  const filtered = order.filter((k): k is DashboardWidgetKey => valid.includes(k as DashboardWidgetKey));
  const unique = Array.from(new Set(filtered));
  for (const k of valid) {
    if (!unique.includes(k)) unique.push(k);
  }
  return unique;
}

export function normalizeState(parsed: Partial<AppState>): AppState {
  const fallback = createInitialState();
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    waterLogs:
      parsed.waterLogs && typeof parsed.waterLogs === 'object' && !Array.isArray(parsed.waterLogs)
        ? parsed.waterLogs
        : {},
    projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fallback.tasks,
    habits: Array.isArray(parsed.habits) ? parsed.habits : fallback.habits,
    workoutTemplates: Array.isArray(parsed.workoutTemplates)
      ? parsed.workoutTemplates
      : fallback.workoutTemplates,
    workoutSessions: Array.isArray(parsed.workoutSessions) ? parsed.workoutSessions : [],
    pomodoroSessions: Array.isArray(parsed.pomodoroSessions) ? parsed.pomodoroSessions : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
    dailyPlans: Array.isArray(parsed.dailyPlans) ? parsed.dailyPlans : [],
    weeklyReviews: Array.isArray(parsed.weeklyReviews) ? parsed.weeklyReviews : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings ?? {}),
      dashboardWidgets: {
        ...DEFAULT_SETTINGS.dashboardWidgets,
        ...(parsed.settings?.dashboardWidgets ?? {}),
      },
      dashboardWidgetOrder: normalizeWidgetOrder(parsed.settings?.dashboardWidgetOrder),
      pomodoro: {
        ...DEFAULT_SETTINGS.pomodoro,
        ...(parsed.settings?.pomodoro ?? {}),
      },
      syncConfig: {
        ...DEFAULT_SETTINGS.syncConfig,
        ...(parsed.settings?.syncConfig ?? {}),
      },
    },
  };
}

export const StorageRepository = {
  loadState(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createInitialState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return normalizeState(parsed);
    } catch {
      return createInitialState();
    }
  },

  saveState(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('[BoraXP] Falha ao salvar estado no localStorage:', err);
    }
  },

  exportBackupJson(state: AppState): string {
    return JSON.stringify(
      {
        app: 'BoraXP',
        exportedAt: nowIso(),
        data: state,
      },
      null,
      2
    );
  },

  importBackupJson(raw: string): AppState {
    const parsed = JSON.parse(raw) as { data?: Partial<AppState> } & Partial<AppState>;
    const candidate = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('Arquivo JSON invÃ¡lido.');
    }
    const merged = normalizeState(candidate);
    this.saveState(merged);
    return merged;
  },

  resetState(): AppState {
    const fresh = createInitialState();
    this.saveState(fresh);
    return fresh;
  },
};
