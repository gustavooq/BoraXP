import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSettings,
  AppState,
  DailyPlan,
  Goal,
  Habit,
  JournalEntry,
  PageId,
  Priority,
  Project,
  QuickSection,
  Task,
  WeeklyReview,
  WorkoutExercise,
  WorkoutExerciseLog,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';
import { normalizeState, StorageRepository } from '../services/storage';
import { getGamificationSummary } from '../services/gamification';
import {
  getRandomNudgeMessage,
  getRandomWaterMessage,
  hasSentNotificationKey,
  markNotificationKeySent,
  NUDGE_SCHEDULES,
  playSoftChime,
  QUIET_HOURS,
  sendLocalNotification,
  WATER_REMINDER_HOURS,
} from '../services/notifications';
import {
  getLastBackupDate,
  requestPersistentStorage,
  writeBackupToFolder,
} from '../services/backup';
import {
  getSupabaseClient,
  getSupabaseConfig,
  mergeStates,
  pullRemoteState,
  pushRemoteState,
} from '../services/sync';
import { formatDateKey, getStartOfWeek, nowIso, todayKey } from '../utils/date';
import { createId } from '../utils/id';

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
  mode: PomodoroMode;
  secondsLeft: number;
  isRunning: boolean;
  targetEndAt: number | null;
  activeTaskId: string | null;
  completedCycles: number;
}

export interface RestTimerState {
  totalSeconds: number;
  secondsLeft: number;
  isRunning: boolean;
  targetEndAt: number | null;
}

export interface UndoToast {
  id: string;
  message: string;
  undo: () => void;
}

export interface XpToast {
  id: string;
  deltaXp: number;
  headline: string;
  subline?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const POMODORO_STORAGE_KEY = 'boraxp_pomodoro_v1';
const WORKOUT_CHECKS_KEY = 'boraxp_workout_checks_v1';

interface AppContextValue {
  state: AppState;
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  drawerOpen: boolean;
  drawerQuickSection: QuickSection | null;
  openDrawer: (quickSection?: QuickSection | null) => void;
  closeDrawer: () => void;
  setDrawerQuickSection: (section: QuickSection | null) => void;
  canInstallPwa: boolean;
  installPwa: () => Promise<void>;
  gamification: ReturnType<typeof getGamificationSummary>;
  pomodoro: PomodoroState;
  startPomodoro: (taskId?: string | null) => void;
  pausePomodoro: () => void;
  resetPomodoro: () => void;
  switchPomodoroMode: (mode: PomodoroMode) => void;
  setPomodoroTask: (taskId: string | null) => void;

  // Timer de descanso (Academia)
  restTimer: RestTimerState;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;

  // Checks persistidos dos exercícios
  workoutChecks: Record<string, string[]>;
  toggleWorkoutCheck: (templateId: string, exerciseId: string) => void;
  clearWorkoutChecks: (templateId: string) => void;

  // Toasts de Feedback (Desfazer & XP)
  undoToast: UndoToast | null;
  executeUndo: () => void;
  dismissUndo: () => void;
  xpToast: XpToast | null;
  dismissXpToast: () => void;

  // Água & Não Perturbe
  addWaterGlass: (dateKey?: string) => void;
  removeWaterGlass: (dateKey?: string) => void;
  isDndActive: boolean;
  setDndMinutes: (minutes: number | null) => void;

  // Tarefas
  addTask: (input: {
    title: string;
    notes?: string;
    projectId?: string;
    priority?: Priority;
    dueDate?: string;
    dueTime?: string;
    reminderMinutesBefore?: number;
    inMyDay?: boolean;
    goalId?: string;
  }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Projetos
  addProject: (input: { name: string; folder?: string; color?: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Hábitos
  addHabit: (input: {
    title: string;
    color?: string;
    frequency?: Habit['frequency'];
    targetDays?: number[];
    reminderTime?: string;
    goalId?: string;
  }) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  toggleHabitLog: (habitId: string, dateKey?: string) => void;
  deleteHabit: (id: string) => void;

  // Academia
  addWorkoutTemplate: (input: {
    code: string;
    name: string;
    color?: string;
    exercises?: Omit<WorkoutExercise, 'id'>[];
  }) => WorkoutTemplate;
  updateWorkoutTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void;
  deleteWorkoutTemplate: (id: string) => void;
  logWorkoutSession: (input: {
    templateId: string;
    date?: string;
    durationMinutes?: number;
    notes?: string;
    completedExerciseIds?: string[];
    exerciseLogs?: WorkoutExerciseLog[];
  }) => WorkoutSession | null;
  deleteWorkoutSession: (id: string) => void;

  // Metas
  addGoal: (input: {
    title: string;
    description?: string;
    horizon: Goal['horizon'];
    targetDate?: string;
    progressMode: Goal['progressMode'];
    milestones?: string[];
    targetValue?: number;
    unit?: string;
    linkedProjectId?: string;
    linkedHabitId?: string;
  }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  incrementGoalValue: (goalId: string, delta: number) => void;
  deleteGoal: (id: string) => void;

  // Diário
  saveJournalEntry: (input: {
    date?: string;
    mood: 1 | 2 | 3 | 4 | 5;
    energy: 1 | 2 | 3 | 4 | 5;
    note: string;
    gratitude?: string;
  }) => JournalEntry;
  deleteJournalEntry: (id: string) => void;

  // Planejamento & Revisão
  saveDailyPlan: (plan: DailyPlan) => void;
  saveWeeklyReview: (input: {
    weekStart?: string;
    wins: string;
    blockers: string;
    nextWeekFocus: string;
  }) => WeeklyReview;

  // Configurações, Backup & Nuvem
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportBackup: () => string;
  importBackup: (raw: string) => void;
  resetAllData: () => void;

  syncUserEmail: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  signInSupabase: (email: string, password: string) => Promise<void>;
  signUpSupabase: (email: string, password: string) => Promise<string>;
  signOutSupabase: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function parseInitialRoute(): { page: PageId; quick: QuickSection | null; action: string | null } {
  if (typeof window === 'undefined') return { page: 'dashboard', quick: null, action: null };
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') as PageId | null;
  const quick = params.get('quick') as QuickSection | null;
  const action = params.get('action');
  const validPages: PageId[] = [
    'dashboard',
    'myday',
    'projects',
    'calendar',
    'gym',
    'pomodoro',
    'habits',
    'goals',
    'journal',
    'planning',
    'stats',
    'settings',
  ];
  const validQuick: QuickSection[] = ['tasks', 'gym', 'habits', 'pomodoro', 'goals', 'journal'];
  return {
    page: view && validPages.includes(view) ? view : 'dashboard',
    quick: quick && validQuick.includes(quick) ? quick : null,
    action,
  };
}

function loadInitialPomodoro(focusMinutes: number): PomodoroState {
  const fallback: PomodoroState = {
    mode: 'focus',
    secondsLeft: focusMinutes * 60,
    isRunning: false,
    targetEndAt: null,
    activeTaskId: null,
    completedCycles: 0,
  };
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<PomodoroState>;
    const mode: PomodoroMode =
      saved.mode === 'shortBreak' || saved.mode === 'longBreak' ? saved.mode : 'focus';
    let secondsLeft = typeof saved.secondsLeft === 'number' ? saved.secondsLeft : focusMinutes * 60;
    const isRunning = Boolean(saved.isRunning && saved.targetEndAt);
    const targetEndAt = typeof saved.targetEndAt === 'number' ? saved.targetEndAt : null;

    if (isRunning && targetEndAt) {
      secondsLeft = Math.max(0, Math.ceil((targetEndAt - Date.now()) / 1000));
    }

    return {
      mode,
      secondsLeft,
      isRunning,
      targetEndAt,
      activeTaskId: saved.activeTaskId ?? null,
      completedCycles: typeof saved.completedCycles === 'number' ? saved.completedCycles : 0,
    };
  } catch {
    return fallback;
  }
}

function loadWorkoutChecks(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(WORKOUT_CHECKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRoute = useMemo(() => parseInitialRoute(), []);
  const [state, setStateRaw] = useState<AppState>(() => StorageRepository.loadState());
  const [activePage, setActivePage] = useState<PageId>(initialRoute.page);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(Boolean(initialRoute.quick));
  const [drawerQuickSection, setDrawerQuickSection] = useState<QuickSection | null>(initialRoute.quick);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [pomodoro, setPomodoro] = useState<PomodoroState>(() =>
    loadInitialPomodoro(state.settings.pomodoro.focusMinutes)
  );
  const [restTimer, setRestTimer] = useState<RestTimerState>({
    totalSeconds: 90,
    secondsLeft: 0,
    isRunning: false,
    targetEndAt: null,
  });
  const [workoutChecks, setWorkoutChecks] = useState<Record<string, string[]>>(() => loadWorkoutChecks());

  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [xpToast, setXpToast] = useState<XpToast | null>(null);

  const [syncUserId, setSyncUserId] = useState<string | null>(null);
  const [syncUserEmail, setSyncUserEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const undoTimerRef = useRef<number | null>(null);
  const xpTimerRef = useRef<number | null>(null);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());
  const suppressSyncPushRef = useRef(false);

  // Wrapper que sempre carimba state.updatedAt para sync confiável
  const setState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      return { ...next, updatedAt: nowIso() };
    });
  }, []);

  // Persistência local
  useEffect(() => {
    StorageRepository.saveState(state);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(pomodoro));
    } catch {
      // ignorar
    }
  }, [pomodoro]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKOUT_CHECKS_KEY, JSON.stringify(workoutChecks));
    } catch {
      // ignorar
    }
  }, [workoutChecks]);

  // Solicitar armazenamento persistente + Backup automático diário na pasta escolhida
  useEffect(() => {
    requestPersistentStorage();
  }, []);

  useEffect(() => {
    const today = todayKey();
    if (getLastBackupDate() === today) return;
    const timer = window.setTimeout(() => {
      const json = StorageRepository.exportBackupJson(state);
      writeBackupToFolder(json, today).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  // Aplicar tema e cor de destaque
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', state.settings.theme);
    root.setAttribute('data-accent', state.settings.accent);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const color =
        state.settings.theme === 'light'
          ? '#f6f7f9'
          : state.settings.theme === 'oled'
            ? '#000000'
            : '#0b0d11';
      metaTheme.setAttribute('content', color);
    }
  }, [state.settings.theme, state.settings.accent]);

  // Capturar prompt de instalação PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  // Helper de Toast Desfazer
  const pushUndo = useCallback((message: string, undo: () => void) => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    const id = createId('undo');
    setUndoToast({ id, message, undo });
    undoTimerRef.current = window.setTimeout(() => {
      setUndoToast((curr) => (curr?.id === id ? null : curr));
    }, 6000);
  }, []);

  const executeUndo = useCallback(() => {
    if (!undoToast) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    const fn = undoToast.undo;
    setUndoToast(null);
    fn();
  }, [undoToast]);

  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoToast(null);
  }, []);

  const dismissXpToast = useCallback(() => {
    if (xpTimerRef.current) window.clearTimeout(xpTimerRef.current);
    setXpToast(null);
  }, []);

  // Gamificação & Detecção de ganho de XP / Level up / Conquista
  const gamification = useMemo(() => getGamificationSummary(state), [state]);
  const prevGamRef = useRef<{
    xp: number;
    level: number;
    unlockedIds: Set<string>;
    initialized: boolean;
  }>({
    xp: gamification.totalXp,
    level: gamification.level,
    unlockedIds: new Set(gamification.achievements.filter((a) => a.unlocked).map((a) => a.id)),
    initialized: false,
  });

  useEffect(() => {
    const prev = prevGamRef.current;
    const currentUnlocked = new Set(
      gamification.achievements.filter((a) => a.unlocked).map((a) => a.id)
    );

    if (!prev.initialized) {
      prevGamRef.current = {
        xp: gamification.totalXp,
        level: gamification.level,
        unlockedIds: currentUnlocked,
        initialized: true,
      };
      return;
    }

    const deltaXp = gamification.totalXp - prev.xp;
    const leveledUp = gamification.level > prev.level;
    const newAch = gamification.achievements.find(
      (a) => a.unlocked && !prev.unlockedIds.has(a.id)
    );

    if (deltaXp > 0 || leveledUp || newAch) {
      if (xpTimerRef.current) window.clearTimeout(xpTimerRef.current);
      const id = createId('xp');
      let headline = `+${Math.max(0, deltaXp)} XP`;
      let subline: string | undefined;
      if (leveledUp) {
        headline = `Nível ${gamification.level}! ⚡`;
        subline = deltaXp > 0 ? `+${deltaXp} XP` : undefined;
      } else if (newAch) {
        headline = `Conquista: ${newAch.title} 🏆`;
        subline = deltaXp > 0 ? `+${deltaXp} XP` : undefined;
      }
      setXpToast({ id, deltaXp, headline, subline });
      xpTimerRef.current = window.setTimeout(() => {
        setXpToast((curr) => (curr?.id === id ? null : curr));
      }, 3200);
    }

    prevGamRef.current = {
      xp: gamification.totalXp,
      level: gamification.level,
      unlockedIds: currentUnlocked,
      initialized: true,
    };
  }, [gamification]);

  // Água (+1 / -1 copo)
  const addWaterGlass = useCallback(
    (dateKey: string = todayKey()) => {
      setState((curr) => {
        const curCount = curr.waterLogs?.[dateKey] ?? 0;
        return {
          ...curr,
          waterLogs: { ...curr.waterLogs, [dateKey]: Math.min(30, curCount + 1) },
        };
      });
    },
    [setState]
  );

  const removeWaterGlass = useCallback(
    (dateKey: string = todayKey()) => {
      setState((curr) => {
        const curCount = curr.waterLogs?.[dateKey] ?? 0;
        return {
          ...curr,
          waterLogs: { ...curr.waterLogs, [dateKey]: Math.max(0, curCount - 1) },
        };
      });
    },
    [setState]
  );

  // Tratar ?action=drink na URL e cliques do Service Worker ("Bebi ✓")
  useEffect(() => {
    if (initialRoute.action === 'drink') {
      addWaterGlass(todayKey());
      window.history.replaceState({}, '', '/');
    }
    if (!('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'notification-action' && event.data?.action === 'drink') {
        addWaterGlass(todayKey());
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [initialRoute.action, addWaterGlass]);

  // Timer global do Pomodoro baseado em timestamp (imune a aba minimizada e F5)
  useEffect(() => {
    if (!pomodoro.isRunning || !pomodoro.targetEndAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pomodoro.targetEndAt! - Date.now()) / 1000));
      if (remaining > 0) {
        setPomodoro((prev) =>
          prev.secondsLeft === remaining ? prev : { ...prev, secondsLeft: remaining }
        );
        return;
      }

      // Ciclo concluído!
      setPomodoro((prev) => {
        if (!prev.isRunning) return prev;
        const completedMode = prev.mode;
        const focusMin = state.settings.pomodoro.focusMinutes;
        const shortMin = state.settings.pomodoro.shortBreakMinutes;
        const longMin = state.settings.pomodoro.longBreakMinutes;
        const cyclesTarget = state.settings.pomodoro.cyclesBeforeLongBreak;

        if (state.settings.pomodoro.soundEnabled) {
          playSoftChime();
        }

        if (completedMode === 'focus') {
          const nextCycles = prev.completedCycles + 1;
          const nextMode: PomodoroMode =
            nextCycles % cyclesTarget === 0 ? 'longBreak' : 'shortBreak';
          const nextSeconds = (nextMode === 'longBreak' ? longMin : shortMin) * 60;

          if (state.settings.notificationsEnabled) {
            sendLocalNotification(
              'BoraXP · Foco concluído!',
              `Você completou ${focusMin} min de foco (+25 XP).`
            );
          }

          const sessionId = createId('pomo');
          const today = todayKey();
          const completedAt = nowIso();
          setState((curr) => ({
            ...curr,
            pomodoroSessions: [
              ...curr.pomodoroSessions,
              {
                id: sessionId,
                date: today,
                durationMinutes: focusMin,
                mode: 'focus',
                taskId: prev.activeTaskId ?? undefined,
                completedAt,
              },
            ],
            tasks: prev.activeTaskId
              ? curr.tasks.map((t) =>
                  t.id === prev.activeTaskId
                    ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1, updatedAt: completedAt }
                    : t
                )
              : curr.tasks,
          }));

          return {
            ...prev,
            mode: nextMode,
            secondsLeft: nextSeconds,
            isRunning: false,
            targetEndAt: null,
            completedCycles: nextCycles,
          };
        } else {
          if (state.settings.notificationsEnabled) {
            sendLocalNotification('BoraXP · Pausa encerrada', 'Hora de voltar para o foco!');
          }
          return {
            ...prev,
            mode: 'focus',
            secondsLeft: focusMin * 60,
            isRunning: false,
            targetEndAt: null,
          };
        }
      });
    };

    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [
    pomodoro.isRunning,
    pomodoro.targetEndAt,
    state.settings.pomodoro.focusMinutes,
    state.settings.pomodoro.shortBreakMinutes,
    state.settings.pomodoro.longBreakMinutes,
    state.settings.pomodoro.cyclesBeforeLongBreak,
    state.settings.pomodoro.soundEnabled,
    state.settings.notificationsEnabled,
    setState,
  ]);

  // Timer de descanso entre séries (Academia)
  useEffect(() => {
    if (!restTimer.isRunning || !restTimer.targetEndAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restTimer.targetEndAt! - Date.now()) / 1000));
      if (remaining > 0) {
        setRestTimer((prev) =>
          prev.secondsLeft === remaining ? prev : { ...prev, secondsLeft: remaining }
        );
        return;
      }
      playSoftChime();
      if (state.settings.notificationsEnabled) {
        sendLocalNotification('BoraXP · Academia', 'Descanso encerrado! Hora da próxima série.');
      }
      setRestTimer((prev) => ({ ...prev, secondsLeft: 0, isRunning: false, targetEndAt: null }));
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [restTimer.isRunning, restTimer.targetEndAt, state.settings.notificationsEnabled]);

  const startRestTimer = useCallback((seconds: number) => {
    const secs = Math.max(10, seconds);
    setRestTimer({
      totalSeconds: secs,
      secondsLeft: secs,
      isRunning: true,
      targetEndAt: Date.now() + secs * 1000,
    });
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestTimer((prev) => ({ ...prev, secondsLeft: 0, isRunning: false, targetEndAt: null }));
  }, []);

  // Não Perturbe (DND)
  const isDndActive = Boolean(
    state.settings.dndUntil && new Date(state.settings.dndUntil).getTime() > Date.now()
  );

  // Lembretes locais: tarefas, cutucões programados (respeitando 13h–14h e DND) e água
  useEffect(() => {
    if (!state.settings.notificationsEnabled && !state.settings.waterReminderEnabled) return;

    const checkReminders = () => {
      if (state.settings.dndUntil && new Date(state.settings.dndUntil).getTime() > Date.now()) {
        return;
      }

      const now = new Date();
      const today = formatDateKey(now);
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentMinutes = hour * 60 + minute;

      if (state.settings.notificationsEnabled) {
        // 1. Lembretes de tarefas agendadas
        for (const task of state.tasks) {
          if (task.deletedAt || task.completed || task.dueDate !== today || !task.dueTime) continue;
          const [hh, mm] = task.dueTime.split(':').map(Number);
          if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
          const dueTotalMin = hh * 60 + mm;
          const lead = task.reminderMinutesBefore ?? 0;
          const triggerMin = dueTotalMin - lead;
          const key = `task_${task.id}_${today}_${task.dueTime}`;

          if (
            currentMinutes >= triggerMin &&
            currentMinutes <= dueTotalMin + 1 &&
            !notifiedTaskIdsRef.current.has(key) &&
            !hasSentNotificationKey(key, today)
          ) {
            notifiedTaskIdsRef.current.add(key);
            markNotificationKeySent(key, today);
            sendLocalNotification(
              `Lembrete: ${task.title}`,
              lead > 0 ? `Agendada para ${task.dueTime} (em ${lead} min).` : `Horário: ${task.dueTime}`,
              key
            );
          }
        }

        // 2. Cutucões variados (pula horas de silêncio 13h e 14h)
        if (!QUIET_HOURS.includes(hour)) {
          const slots = NUDGE_SCHEDULES[state.settings.notificationFrequency] ?? NUDGE_SCHEDULES.low;
          const pendingTasks = state.tasks.filter(
            (t) => !t.deletedAt && !t.completed && (!t.dueDate || t.dueDate <= today)
          ).length;
          const pendingHabits = state.habits.filter(
            (h) => !h.deletedAt && !h.archived && !h.logs[today]
          ).length;

          for (const slot of slots) {
            const [sh, sm] = slot.split(':').map(Number);
            const slotMin = sh * 60 + sm;
            const key = `nudge_${today}_${slot}`;
            if (
              currentMinutes >= slotMin &&
              currentMinutes <= slotMin + 5 &&
              !notifiedTaskIdsRef.current.has(key) &&
              !hasSentNotificationKey(key, today)
            ) {
              notifiedTaskIdsRef.current.add(key);
              markNotificationKeySent(key, today);
              const msg = getRandomNudgeMessage({ pendingTasks, pendingHabits });
              sendLocalNotification(msg.title, msg.body, key);
            }
          }
        }
      }

      // 3. Lembrete de beber água: 08h às 19h (1x por hora), exceto 13h e 14h
      if (state.settings.waterReminderEnabled) {
        if (WATER_REMINDER_HOURS.includes(hour) && minute <= 10) {
          const key = `water_${today}_${hour}`;
          if (!notifiedTaskIdsRef.current.has(key) && !hasSentNotificationKey(key, today)) {
            notifiedTaskIdsRef.current.add(key);
            markNotificationKeySent(key, today);
            const msg = getRandomWaterMessage();
            sendLocalNotification(msg.title, msg.body, {
              tag: key,
              actions: [{ action: 'drink', title: 'Bebi ✓' }],
            });
          }
        }
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [
    state.tasks,
    state.habits,
    state.settings.notificationsEnabled,
    state.settings.notificationFrequency,
    state.settings.waterReminderEnabled,
    state.settings.dndUntil,
  ]);

  // Sincronização Supabase (sessão inicial + push automático com debounce)
  const syncWithClient = useCallback(async (userId: string) => {
    const client = await getSupabaseClient();
    if (!client) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const remoteRaw = await pullRemoteState(client, userId);
      const localSnapshot = StorageRepository.loadState();
      let merged = localSnapshot;
      if (remoteRaw) {
        merged = mergeStates(localSnapshot, normalizeState(remoteRaw));
        suppressSyncPushRef.current = true;
        setStateRaw(merged);
        StorageRepository.saveState(merged);
      }
      await pushRemoteState(client, userId, merged);
      setStateRaw((curr) => ({
        ...curr,
        settings: {
          ...curr.settings,
          syncConfig: { provider: 'supabase', lastSyncedAt: nowIso() },
        },
      }));
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Erro ao sincronizar');
    }
  }, []);

  useEffect(() => {
    if (!getSupabaseConfig()) return;
    let active = true;
    getSupabaseClient().then((client) => {
      if (!client || !active) return;
      client.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (user && active) {
          setSyncUserId(user.id);
          setSyncUserEmail(user.email ?? null);
          syncWithClient(user.id);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [syncWithClient]);

  useEffect(() => {
    if (!syncUserId) return;
    if (suppressSyncPushRef.current) {
      suppressSyncPushRef.current = false;
      return;
    }
    const timer = window.setTimeout(async () => {
      const client = await getSupabaseClient();
      if (!client) return;
      setSyncStatus('syncing');
      try {
        await pushRemoteState(client, syncUserId, state);
        setSyncStatus('synced');
        setSyncError(null);
      } catch (err) {
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : 'Falha ao enviar para a nuvem');
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [state, syncUserId]);

  const signInSupabase = useCallback(
    async (email: string, password: string) => {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Configure a URL e a chave do Supabase primeiro.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.user) {
        setSyncUserId(data.user.id);
        setSyncUserEmail(data.user.email ?? null);
        await syncWithClient(data.user.id);
      }
    },
    [syncWithClient]
  );

  const signUpSupabase = useCallback(
    async (email: string, password: string) => {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Configure a URL e a chave do Supabase primeiro.');
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (data.user && data.session) {
        setSyncUserId(data.user.id);
        setSyncUserEmail(data.user.email ?? null);
        await syncWithClient(data.user.id);
        return 'Conta criada e sincronizada!';
      }
      return 'Conta criada! Se o Supabase pedir confirmação por e-mail, confirme e entre.';
    },
    [syncWithClient]
  );

  const signOutSupabase = useCallback(async () => {
    const client = await getSupabaseClient();
    if (client) await client.auth.signOut();
    setSyncUserId(null);
    setSyncUserEmail(null);
    setSyncStatus('idle');
    setSyncError(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!syncUserId) return;
    await syncWithClient(syncUserId);
  }, [syncUserId, syncWithClient]);

  const openDrawer = useCallback((quickSection: QuickSection | null = null) => {
    setDrawerQuickSection(quickSection);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const startPomodoro = useCallback((taskId?: string | null) => {
    setPomodoro((prev) => ({
      ...prev,
      activeTaskId: taskId !== undefined ? taskId : prev.activeTaskId,
      isRunning: true,
      targetEndAt: Date.now() + prev.secondsLeft * 1000,
    }));
  }, []);

  const pausePomodoro = useCallback(() => {
    setPomodoro((prev) => {
      const left = prev.targetEndAt
        ? Math.max(0, Math.ceil((prev.targetEndAt - Date.now()) / 1000))
        : prev.secondsLeft;
      return { ...prev, isRunning: false, secondsLeft: left, targetEndAt: null };
    });
  }, []);

  const resetPomodoro = useCallback(() => {
    setPomodoro((prev) => {
      const mins =
        prev.mode === 'focus'
          ? state.settings.pomodoro.focusMinutes
          : prev.mode === 'shortBreak'
            ? state.settings.pomodoro.shortBreakMinutes
            : state.settings.pomodoro.longBreakMinutes;
      return { ...prev, isRunning: false, targetEndAt: null, secondsLeft: mins * 60 };
    });
  }, [state.settings.pomodoro]);

  const switchPomodoroMode = useCallback(
    (mode: PomodoroMode) => {
      const mins =
        mode === 'focus'
          ? state.settings.pomodoro.focusMinutes
          : mode === 'shortBreak'
            ? state.settings.pomodoro.shortBreakMinutes
            : state.settings.pomodoro.longBreakMinutes;
      setPomodoro((prev) => ({
        ...prev,
        mode,
        isRunning: false,
        targetEndAt: null,
        secondsLeft: mins * 60,
      }));
    },
    [state.settings.pomodoro]
  );

  const setPomodoroTask = useCallback((taskId: string | null) => {
    setPomodoro((prev) => ({ ...prev, activeTaskId: taskId }));
  }, []);

  const toggleWorkoutCheck = useCallback((templateId: string, exerciseId: string) => {
    setWorkoutChecks((prev) => {
      const list = prev[templateId] ?? [];
      const next = list.includes(exerciseId)
        ? list.filter((id) => id !== exerciseId)
        : [...list, exerciseId];
      return { ...prev, [templateId]: next };
    });
  }, []);

  const clearWorkoutChecks = useCallback((templateId: string) => {
    setWorkoutChecks((prev) => ({ ...prev, [templateId]: [] }));
  }, []);

  const addTask: AppContextValue['addTask'] = useCallback(
    (input) => {
      const ts = nowIso();
      const today = todayKey();
      const newTask: Task = {
        id: createId('task'),
        title: input.title.trim(),
        notes: input.notes?.trim() || undefined,
        projectId: input.projectId || undefined,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate || undefined,
        dueTime: input.dueTime || undefined,
        reminderMinutesBefore: input.reminderMinutesBefore,
        inMyDay: Boolean(input.inMyDay || input.dueDate === today),
        myDayDate: input.inMyDay || input.dueDate === today ? today : undefined,
        completed: false,
        completedAt: null,
        firstCompletedAt: null,
        goalId: input.goalId || undefined,
        pomodorosCompleted: 0,
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({ ...curr, tasks: [newTask, ...curr.tasks] }));
      return newTask;
    },
    [setState]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        tasks: curr.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: ts } : t)),
      }));
    },
    [setState]
  );

  const toggleTask = useCallback(
    (id: string) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        tasks: curr.tasks.map((t) => {
          if (t.id !== id) return t;
          const completed = !t.completed;
          return {
            ...t,
            completed,
            completedAt: completed ? ts : null,
            firstCompletedAt: completed ? (t.firstCompletedAt ?? ts) : t.firstCompletedAt,
            updatedAt: ts,
          };
        }),
      }));
    },
    [setState]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const ts = nowIso();
      const target = state.tasks.find((t) => t.id === id);
      setState((curr) => ({
        ...curr,
        tasks: curr.tasks.map((t) => (t.id === id ? { ...t, deletedAt: ts, updatedAt: ts } : t)),
      }));
      if (target) {
        pushUndo(`Tarefa "${target.title}" excluída`, () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            tasks: curr.tasks.map((t) =>
              t.id === id ? { ...t, deletedAt: null, updatedAt: restoreTs } : t
            ),
          }));
        });
      }
    },
    [state.tasks, setState, pushUndo]
  );

  const addProject: AppContextValue['addProject'] = useCallback(
    (input) => {
      const ts = nowIso();
      const proj: Project = {
        id: createId('proj'),
        name: input.name.trim(),
        folder: input.folder?.trim() || undefined,
        color: input.color || '#10b981',
        archived: false,
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({ ...curr, projects: [...curr.projects, proj] }));
      return proj;
    },
    [setState]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        projects: curr.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: ts } : p)),
      }));
    },
    [setState]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        projects: curr.projects.map((p) => (p.id === id ? { ...p, deletedAt: ts, updatedAt: ts } : p)),
      }));
    },
    [setState]
  );

  const addHabit: AppContextValue['addHabit'] = useCallback(
    (input) => {
      const ts = nowIso();
      const habit: Habit = {
        id: createId('hab'),
        title: input.title.trim(),
        color: input.color || '#10b981',
        frequency: input.frequency ?? 'daily',
        targetDays: input.targetDays ?? [0, 1, 2, 3, 4, 5, 6],
        reminderTime: input.reminderTime,
        goalId: input.goalId,
        logs: {},
        archived: false,
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({ ...curr, habits: [...curr.habits, habit] }));
      return habit;
    },
    [setState]
  );

  const updateHabit = useCallback(
    (id: string, patch: Partial<Habit>) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        habits: curr.habits.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: ts } : h)),
      }));
    },
    [setState]
  );

  const toggleHabitLog = useCallback(
    (habitId: string, dateKey: string = todayKey()) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        habits: curr.habits.map((h) => {
          if (h.id !== habitId) return h;
          const nextLogs = { ...h.logs };
          if (nextLogs[dateKey]) {
            delete nextLogs[dateKey];
          } else {
            nextLogs[dateKey] = true;
          }
          return { ...h, logs: nextLogs, updatedAt: ts };
        }),
      }));
    },
    [setState]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      const ts = nowIso();
      const target = state.habits.find((h) => h.id === id);
      setState((curr) => ({
        ...curr,
        habits: curr.habits.map((h) => (h.id === id ? { ...h, deletedAt: ts, updatedAt: ts } : h)),
      }));
      if (target) {
        pushUndo(`Hábito "${target.title}" excluído`, () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            habits: curr.habits.map((h) =>
              h.id === id ? { ...h, deletedAt: null, updatedAt: restoreTs } : h
            ),
          }));
        });
      }
    },
    [state.habits, setState, pushUndo]
  );

  const addWorkoutTemplate: AppContextValue['addWorkoutTemplate'] = useCallback(
    (input) => {
      const ts = nowIso();
      const tpl: WorkoutTemplate = {
        id: createId('gym'),
        code: input.code.trim().toUpperCase().slice(0, 4) || 'D',
        name: input.name.trim() || 'Novo Treino',
        color: input.color || '#10b981',
        exercises: (input.exercises ?? []).map((e) => ({ ...e, id: createId('ex') })),
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({ ...curr, workoutTemplates: [...curr.workoutTemplates, tpl] }));
      return tpl;
    },
    [setState]
  );

  const updateWorkoutTemplate = useCallback(
    (id: string, patch: Partial<WorkoutTemplate>) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        workoutTemplates: curr.workoutTemplates.map((w) =>
          w.id === id ? { ...w, ...patch, updatedAt: ts } : w
        ),
      }));
    },
    [setState]
  );

  const deleteWorkoutTemplate = useCallback(
    (id: string) => {
      const ts = nowIso();
      const target = state.workoutTemplates.find((w) => w.id === id);
      setState((curr) => ({
        ...curr,
        workoutTemplates: curr.workoutTemplates.map((w) =>
          w.id === id ? { ...w, deletedAt: ts, updatedAt: ts } : w
        ),
      }));
      if (target) {
        pushUndo(`Treino ${target.code} removido`, () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            workoutTemplates: curr.workoutTemplates.map((w) =>
              w.id === id ? { ...w, deletedAt: null, updatedAt: restoreTs } : w
            ),
          }));
        });
      }
    },
    [state.workoutTemplates, setState, pushUndo]
  );

  const logWorkoutSession: AppContextValue['logWorkoutSession'] = useCallback(
    (input) => {
      const tpl = state.workoutTemplates.find((w) => w.id === input.templateId && !w.deletedAt);
      if (!tpl) return null;
      const ts = nowIso();
      const session: WorkoutSession = {
        id: createId('wlog'),
        templateId: tpl.id,
        code: tpl.code,
        name: tpl.name,
        date: input.date || todayKey(),
        durationMinutes: input.durationMinutes,
        notes: input.notes?.trim() || undefined,
        completedExerciseIds: input.completedExerciseIds ?? tpl.exercises.map((e) => e.id),
        exerciseLogs: input.exerciseLogs,
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({
        ...curr,
        workoutSessions: [session, ...curr.workoutSessions],
      }));
      pushUndo(`Treino ${session.code} registrado (+35 XP)`, () => {
        const delTs = nowIso();
        setState((curr) => ({
          ...curr,
          workoutSessions: curr.workoutSessions.map((w) =>
            w.id === session.id ? { ...w, deletedAt: delTs, updatedAt: delTs } : w
          ),
        }));
      });
      return session;
    },
    [state.workoutTemplates, setState, pushUndo]
  );

  const deleteWorkoutSession = useCallback(
    (id: string) => {
      const ts = nowIso();
      const target = state.workoutSessions.find((w) => w.id === id);
      setState((curr) => ({
        ...curr,
        workoutSessions: curr.workoutSessions.map((w) =>
          w.id === id ? { ...w, deletedAt: ts, updatedAt: ts } : w
        ),
      }));
      if (target) {
        pushUndo(`Registro do treino ${target.code} excluído`, () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            workoutSessions: curr.workoutSessions.map((w) =>
              w.id === id ? { ...w, deletedAt: null, updatedAt: restoreTs } : w
            ),
          }));
        });
      }
    },
    [state.workoutSessions, setState, pushUndo]
  );

  const addGoal: AppContextValue['addGoal'] = useCallback(
    (input) => {
      const ts = nowIso();
      const goal: Goal = {
        id: createId('goal'),
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        horizon: input.horizon,
        targetDate: input.targetDate || undefined,
        progressMode: input.progressMode,
        milestones: (input.milestones ?? [])
          .map((t) => t.trim())
          .filter(Boolean)
          .map((title) => ({ id: createId('ms'), title, done: false })),
        currentValue: 0,
        targetValue: Math.max(1, input.targetValue ?? 10),
        unit: input.unit?.trim() || undefined,
        linkedProjectId: input.linkedProjectId || undefined,
        linkedHabitId: input.linkedHabitId || undefined,
        completed: false,
        createdAt: ts,
        updatedAt: ts,
      };
      setState((curr) => ({ ...curr, goals: [goal, ...curr.goals] }));
      return goal;
    },
    [setState]
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Goal>) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        goals: curr.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: ts } : g)),
      }));
    },
    [setState]
  );

  const toggleGoalMilestone = useCallback(
    (goalId: string, milestoneId: string) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        goals: curr.goals.map((g) => {
          if (g.id !== goalId) return g;
          const milestones = g.milestones.map((m) =>
            m.id === milestoneId ? { ...m, done: !m.done } : m
          );
          const allDone = milestones.length > 0 && milestones.every((m) => m.done);
          return { ...g, milestones, completed: allDone, updatedAt: ts };
        }),
      }));
    },
    [setState]
  );

  const incrementGoalValue = useCallback(
    (goalId: string, delta: number) => {
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        goals: curr.goals.map((g) => {
          if (g.id !== goalId) return g;
          const nextVal = Math.max(0, g.currentValue + delta);
          return {
            ...g,
            currentValue: nextVal,
            completed: nextVal >= g.targetValue,
            updatedAt: ts,
          };
        }),
      }));
    },
    [setState]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const ts = nowIso();
      const target = state.goals.find((g) => g.id === id);
      setState((curr) => ({
        ...curr,
        goals: curr.goals.map((g) => (g.id === id ? { ...g, deletedAt: ts, updatedAt: ts } : g)),
      }));
      if (target) {
        pushUndo(`Meta "${target.title}" excluída`, () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            goals: curr.goals.map((g) =>
              g.id === id ? { ...g, deletedAt: null, updatedAt: restoreTs } : g
            ),
          }));
        });
      }
    },
    [state.goals, setState, pushUndo]
  );

  const saveJournalEntry: AppContextValue['saveJournalEntry'] = useCallback(
    (input) => {
      const ts = nowIso();
      const date = input.date || todayKey();
      let savedEntry: JournalEntry | null = null;

      setState((curr) => {
        const existing = curr.journalEntries.find((j) => j.date === date && !j.deletedAt);
        if (existing) {
          const updated: JournalEntry = {
            ...existing,
            mood: input.mood,
            energy: input.energy,
            note: input.note.trim(),
            gratitude: input.gratitude?.trim() || undefined,
            updatedAt: ts,
          };
          savedEntry = updated;
          return {
            ...curr,
            journalEntries: curr.journalEntries.map((j) => (j.id === existing.id ? updated : j)),
          };
        }
        const created: JournalEntry = {
          id: createId('jr'),
          date,
          mood: input.mood,
          energy: input.energy,
          note: input.note.trim(),
          gratitude: input.gratitude?.trim() || undefined,
          createdAt: ts,
          updatedAt: ts,
        };
        savedEntry = created;
        return {
          ...curr,
          journalEntries: [created, ...curr.journalEntries],
        };
      });

      return (
        savedEntry ?? {
          id: createId('jr'),
          date,
          mood: input.mood,
          energy: input.energy,
          note: input.note,
          createdAt: ts,
          updatedAt: ts,
        }
      );
    },
    [setState]
  );

  const deleteJournalEntry = useCallback(
    (id: string) => {
      const target = state.journalEntries.find((j) => j.id === id);
      const ts = nowIso();
      setState((curr) => ({
        ...curr,
        journalEntries: curr.journalEntries.map((j) =>
          j.id === id ? { ...j, deletedAt: ts, updatedAt: ts } : j
        ),
      }));
      if (target) {
        pushUndo('Registro do diário excluído', () => {
          const restoreTs = nowIso();
          setState((curr) => ({
            ...curr,
            journalEntries: curr.journalEntries.map((j) =>
              j.id === id ? { ...j, deletedAt: null, updatedAt: restoreTs } : j
            ),
          }));
        });
      }
    },
    [state.journalEntries, setState, pushUndo]
  );

  const saveDailyPlan = useCallback(
    (plan: DailyPlan) => {
      setState((curr) => {
        const exists = curr.dailyPlans.some((p) => p.date === plan.date);
        const next = exists
          ? curr.dailyPlans.map((p) => (p.date === plan.date ? plan : p))
          : [plan, ...curr.dailyPlans];
        return { ...curr, dailyPlans: next };
      });
    },
    [setState]
  );

  const saveWeeklyReview: AppContextValue['saveWeeklyReview'] = useCallback(
    (input) => {
      const weekStart = input.weekStart || getStartOfWeek(todayKey());
      const review: WeeklyReview = {
        id: createId('rev'),
        weekStart,
        wins: input.wins.trim(),
        blockers: input.blockers.trim(),
        nextWeekFocus: input.nextWeekFocus.trim(),
        completedAt: nowIso(),
      };
      setState((curr) => {
        const filtered = curr.weeklyReviews.filter((r) => r.weekStart !== weekStart);
        return { ...curr, weeklyReviews: [review, ...filtered] };
      });
      return review;
    },
    [setState]
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setState((curr) => {
        const nextSettings: AppSettings = {
          ...curr.settings,
          ...patch,
          dashboardWidgets: {
            ...curr.settings.dashboardWidgets,
            ...(patch.dashboardWidgets ?? {}),
          },
          pomodoro: {
            ...curr.settings.pomodoro,
            ...(patch.pomodoro ?? {}),
          },
          syncConfig: {
            ...curr.settings.syncConfig,
            ...(patch.syncConfig ?? {}),
          },
        };

        if (patch.pomodoro) {
          setPomodoro((prev) => {
            if (prev.isRunning) return prev;
            const mins =
              prev.mode === 'focus'
                ? nextSettings.pomodoro.focusMinutes
                : prev.mode === 'shortBreak'
                  ? nextSettings.pomodoro.shortBreakMinutes
                  : nextSettings.pomodoro.longBreakMinutes;
            return { ...prev, secondsLeft: mins * 60 };
          });
        }

        return { ...curr, settings: nextSettings };
      });
    },
    [setState]
  );

  const setDndMinutes = useCallback(
    (minutes: number | null) => {
      if (minutes === null) {
        updateSettings({ dndUntil: null });
        return;
      }
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      updateSettings({ dndUntil: until });
    },
    [updateSettings]
  );

  const exportBackup = useCallback(() => StorageRepository.exportBackupJson(state), [state]);

  const importBackup = useCallback((raw: string) => {
    const next = StorageRepository.importBackupJson(raw);
    setStateRaw(next);
  }, []);

  const resetAllData = useCallback(() => {
    const fresh = StorageRepository.resetState();
    setStateRaw(fresh);
    setActivePage('dashboard');
  }, []);

  const value: AppContextValue = {
    state,
    activePage,
    setActivePage,
    drawerOpen,
    drawerQuickSection,
    openDrawer,
    closeDrawer,
    setDrawerQuickSection,
    canInstallPwa: Boolean(installPrompt),
    installPwa,
    gamification,
    pomodoro,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    switchPomodoroMode,
    setPomodoroTask,
    restTimer,
    startRestTimer,
    stopRestTimer,
    workoutChecks,
    toggleWorkoutCheck,
    clearWorkoutChecks,
    undoToast,
    executeUndo,
    dismissUndo,
    xpToast,
    dismissXpToast,
    addWaterGlass,
    removeWaterGlass,
    isDndActive,
    setDndMinutes,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    addHabit,
    updateHabit,
    toggleHabitLog,
    deleteHabit,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    logWorkoutSession,
    deleteWorkoutSession,
    addGoal,
    updateGoal,
    toggleGoalMilestone,
    incrementGoalValue,
    deleteGoal,
    saveJournalEntry,
    deleteJournalEntry,
    saveDailyPlan,
    saveWeeklyReview,
    updateSettings,
    exportBackup,
    importBackup,
    resetAllData,
    syncUserEmail,
    syncStatus,
    syncError,
    signInSupabase,
    signUpSupabase,
    signOutSupabase,
    syncNow,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
