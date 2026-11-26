import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Droplets,
  Dumbbell,
  Flame,
  Minus,
  Plus,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { GlobalHeatmap } from '../components/GlobalHeatmap';
import { TaskRow } from '../components/TaskRow';
import {
  getGoalProgress,
  getGymWeeklyHeatmapData,
  getNextWorkoutSuggestion,
  getUrgentTasks,
} from '../services/analytics';
import { formatLongDatePT, formatMinutes, getWeekdayShort, todayKey } from '../utils/date';

export const DashboardPage: React.FC = () => {
  const {
    state,
    setActivePage,
    openDrawer,
    gamification,
    addTask,
    toggleHabitLog,
    logWorkoutSession,
    startPomodoro,
    saveJournalEntry,
    addWaterGlass,
    removeWaterGlass,
  } = useApp();

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [gymCooldown, setGymCooldown] = useState(false);

  // Check-in separado Humor & Energia (item 19)
  const [pickMood, setPickMood] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [pickEnergy, setPickEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);

  const today = todayKey();
  const urgentTasks = useMemo(() => getUrgentTasks(state, today), [state, today]);
  const activeHabits = useMemo(
    () => state.habits.filter((h) => !h.deletedAt && !h.archived),
    [state.habits]
  );
  const gymWeek = useMemo(() => getGymWeeklyHeatmapData(state, 1, today), [state, today]);
  const activeWorkouts = useMemo(
    () => state.workoutTemplates.filter((w) => !w.deletedAt),
    [state.workoutTemplates]
  );
  const suggestedWorkout = useMemo(() => getNextWorkoutSuggestion(state), [state]);

  const todayFocusMinutes = useMemo(
    () =>
      state.pomodoroSessions
        .filter((p) => p.mode === 'focus' && p.date === today)
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [state.pomodoroSessions, today]
  );
  const todayJournal = useMemo(
    () => state.journalEntries.find((j) => !j.deletedAt && j.date === today),
    [state.journalEntries, today]
  );
  const activeGoals = useMemo(
    () => state.goals.filter((g) => !g.deletedAt && !g.completed).slice(0, 2),
    [state.goals]
  );

  const waterToday = state.waterLogs?.[today] ?? 0;
  const waterGoal = Math.max(1, state.settings.waterGoal || 8);
  const waterPercent = Math.min(100, Math.round((waterToday / waterGoal) * 100));

  const handleQuickAddUrgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    addTask({
      title: quickTaskTitle,
      priority: 'urgent',
      dueDate: today,
      inMyDay: true,
    });
    setQuickTaskTitle('');
  };

  const handleQuickWorkout = (templateId: string) => {
    if (gymCooldown) return;
    setGymCooldown(true);
    logWorkoutSession({ templateId, date: today });
    window.setTimeout(() => setGymCooldown(false), 1500);
  };

  const widgets = state.settings.dashboardWidgets;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho compacto */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium capitalize" style={{ color: 'var(--muted)' }}>
            {formatLongDatePT(today)}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePage('stats')}
            className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium tabular-nums transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>{gamification.globalStreak} dias</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <Zap className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
            <span>
              Nv. {gamification.level} ({gamification.totalXp} XP)
            </span>
          </button>

          <button
            type="button"
            onClick={() => openDrawer('tasks')}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Preencher rápido
          </button>
        </div>
      </div>

      {/* 1. Heatmap em destaque */}
      <GlobalHeatmap />

      {/* 2. Bloco Mais Urgentes & Hoje */}
      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Mais Urgentes & Hoje</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{
                backgroundColor: urgentTasks.length > 0 ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: urgentTasks.length > 0 ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {urgentTasks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActivePage('myday')}
            className="flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer"
            style={{ color: 'var(--accent)' }}
          >
            Ver Meu Dia <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleQuickAddUrgent} className="flex gap-2 mb-3">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder="+ Adicionar tarefa urgente para hoje..."
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            type="submit"
            className="rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Adicionar
          </button>
        </form>

        {urgentTasks.length === 0 ? (
          <div
            className="rounded-xl border border-dashed py-6 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma pendência urgente no momento. Tudo sob controle!
          </div>
        ) : (
          <div className="space-y-2">
            {urgentTasks.slice(0, 6).map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
            {urgentTasks.length > 6 && (
              <button
                type="button"
                onClick={() => setActivePage('projects')}
                className="w-full rounded-xl border py-2 text-xs font-medium transition hover:opacity-85 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Ver mais {urgentTasks.length - 6} tarefas pendentes
              </button>
            )}
          </div>
        )}
      </section>

      {/* 3. Widgets Rápidos Configuráveis */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {widgets.gym && (
          <section
            className="rounded-2xl border p-4"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold">Academia da Semana</h3>
                {suggestedWorkout && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
                  >
                    Hoje: {suggestedWorkout.code}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActivePage('gym')}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Abrir Academia
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {gymWeek.currentWeek.days.map((d) => {
                const done = d.sessions.length > 0;
                return (
                  <div
                    key={d.dateKey}
                    className="flex flex-col items-center rounded-lg border py-1.5 text-[11px]"
                    style={{
                      borderColor: done ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: done ? 'var(--accent-soft)' : 'var(--surface-2)',
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>
                      {getWeekdayShort(d.dateKey).slice(0, 3)}
                    </span>
                    <span
                      className="font-bold mt-0.5"
                      style={{ color: done ? 'var(--accent)' : 'var(--text)' }}
                    >
                      {done ? d.sessions.map((s) => s.code).join('+') : '·'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs mr-1" style={{ color: 'var(--muted)' }}>
                Registrar hoje:
              </span>
              {activeWorkouts.map((w) => {
                const isNext = suggestedWorkout?.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={gymCooldown}
                    onClick={() => handleQuickWorkout(w.id)}
                    className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{
                      borderColor: w.color,
                      backgroundColor: isNext ? w.color : `${w.color}18`,
                      color: isNext ? '#03150e' : w.color,
                    }}
                  >
                    Treino {w.code}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {widgets.water && (
          <section
            className="rounded-2xl border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold">Água Hoje</h3>
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                {waterToday} / {waterGoal} copos
              </span>
            </div>

            <div className="my-2">
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${waterPercent}%`, backgroundColor: '#06b6d4' }}
                />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                {waterToday >= waterGoal
                  ? 'Meta de hidratação batida hoje! 💧'
                  : `Faltam ${waterGoal - waterToday} copos para sua meta (+2 XP por copo).`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => removeWaterGlass(today)}
                disabled={waterToday <= 0}
                className="rounded-xl border p-2 disabled:opacity-40 cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
                title="Remover 1 copo"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => addWaterGlass(today)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: '#06b6d4', color: '#02181c' }}
              >
                <Droplets className="h-3.5 w-3.5" />
                Bebi ✓
              </button>
            </div>
          </section>
        )}

        {widgets.habits && (
          <section
            className="rounded-2xl border p-4"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Hábitos de Hoje</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('habits')}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Gerenciar
              </button>
            </div>

            {activeHabits.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Nenhum hábito ativo. Crie um pela aba lateral.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeHabits.slice(0, 5).map((h) => {
                  const done = Boolean(h.logs[today]);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabitLog(h.id, today)}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer"
                      style={{
                        borderColor: done ? h.color : 'var(--border)',
                        backgroundColor: done ? `${h.color}18` : 'var(--surface-2)',
                      }}
                    >
                      <span className={done ? 'line-through opacity-75' : ''}>{h.title}</span>
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded"
                        style={{
                          backgroundColor: done ? h.color : 'transparent',
                          border: done ? 'none' : '1px solid var(--border)',
                          color: '#03150e',
                        }}
                      >
                        {done && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {widgets.pomodoro && (
          <section
            className="rounded-2xl border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold">Foco Hoje</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('pomodoro')}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Abrir Timer
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatMinutes(todayFocusMinutes)}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  acumulados em sessões Pomodoro hoje
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  startPomodoro(urgentTasks[0]?.id ?? null);
                  setActivePage('pomodoro');
                }}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Iniciar {state.settings.pomodoro.focusMinutes}m
              </button>
            </div>
          </section>
        )}

        {widgets.journal && (
          <section
            className="rounded-2xl border p-4"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold">Humor & Energia Hoje</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('journal')}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Abrir Diário
              </button>
            </div>

            {todayJournal ? (
              <div className="space-y-1 text-xs">
                <div className="flex gap-3 font-medium tabular-nums">
                  <span>Humor: {todayJournal.mood}/5</span>
                  <span>Energia: {todayJournal.energy}/5</span>
                </div>
                <p className="line-clamp-2" style={{ color: 'var(--muted)' }}>
                  {todayJournal.note}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>Humor</span>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPickMood(m)}
                        className="h-7 w-7 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          borderColor: pickMood === m ? 'var(--accent)' : 'var(--border)',
                          backgroundColor: pickMood === m ? 'var(--accent)' : 'var(--surface-2)',
                          color: pickMood === m ? 'var(--accent-fg)' : 'var(--text)',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>Energia</span>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as const).map((en) => (
                      <button
                        key={en}
                        type="button"
                        onClick={() => setPickEnergy(en)}
                        className="h-7 w-7 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          borderColor: pickEnergy === en ? 'var(--accent)' : 'var(--border)',
                          backgroundColor: pickEnergy === en ? 'var(--accent)' : 'var(--surface-2)',
                          color: pickEnergy === en ? 'var(--accent-fg)' : 'var(--text)',
                        }}
                      >
                        {en}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    saveJournalEntry({
                      date: today,
                      mood: pickMood,
                      energy: pickEnergy,
                      note: 'Check-in rápido pelo Dashboard.',
                    })
                  }
                  className="w-full rounded-xl py-1.5 text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  Salvar Check-in (+15 XP)
                </button>
              </div>
            )}
          </section>
        )}

        {widgets.goals && activeGoals.length > 0 && (
          <section
            className="rounded-2xl border p-4 md:col-span-2"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold">Metas em Andamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('goals')}
                className="text-xs font-medium hover:underline cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                Ver todas
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeGoals.map((goal) => {
                const prog = getGoalProgress(goal, state);
                return (
                  <div
                    key={goal.id}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
                  >
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="truncate">{goal.title}</span>
                      <span className="tabular-nums" style={{ color: 'var(--accent)' }}>
                        {prog.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${prog.percent}%`, backgroundColor: 'var(--accent)' }}
                      />
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                      {prog.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
