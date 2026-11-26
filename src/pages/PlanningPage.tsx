import React, { useMemo, useState } from 'react';
import { Check, Compass } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { getCurrentWeekRange } from '../services/analytics';
import { getStartOfWeek, nowIso, todayKey } from '../utils/date';

export const PlanningPage: React.FC = () => {
  const { state, saveDailyPlan, saveWeeklyReview, updateTask } = useApp();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const today = todayKey();
  const weekStart = getStartOfWeek(today);
  const weekRange = getCurrentWeekRange(today);

  const existingPlan = state.dailyPlans.find((p) => p.date === today);
  const [selectedIds, setSelectedIds] = useState<string[]>(existingPlan?.topPriorityTaskIds ?? []);
  const [intention, setIntention] = useState(existingPlan?.focusIntention ?? '');
  const [dailySaved, setDailySaved] = useState(false);

  const existingReview = state.weeklyReviews.find((r) => r.weekStart === weekStart);
  const [wins, setWins] = useState(existingReview?.wins ?? '');
  const [blockers, setBlockers] = useState(existingReview?.blockers ?? '');
  const [nextFocus, setNextFocus] = useState(existingReview?.nextWeekFocus ?? '');
  const [weeklySaved, setWeeklySaved] = useState(false);

  const pendingTasks = useMemo(
    () => state.tasks.filter((t) => !t.deletedAt && !t.completed),
    [state.tasks]
  );

  const weekSummary = useMemo(() => {
    const tasksDone = state.tasks.filter(
      (t) =>
        !t.deletedAt &&
        t.completed &&
        t.completedAt &&
        t.completedAt.slice(0, 10) >= weekRange.start &&
        t.completedAt.slice(0, 10) <= weekRange.end
    ).length;

    const workouts = state.workoutSessions.filter(
      (w) => !w.deletedAt && w.date >= weekRange.start && w.date <= weekRange.end
    ).length;

    const focusMin = state.pomodoroSessions
      .filter((p) => p.mode === 'focus' && p.date >= weekRange.start && p.date <= weekRange.end)
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    return { tasksDone, workouts, focusMin };
  }, [state.tasks, state.workoutSessions, state.pomodoroSessions, weekRange]);

  const togglePriorityPick = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const handleSaveDaily = (e: React.FormEvent) => {
    e.preventDefault();
    saveDailyPlan({
      date: today,
      topPriorityTaskIds: selectedIds,
      focusIntention: intention.trim(),
      completedAt: nowIso(),
    });
    // Marcar as escolhidas no Meu Dia
    for (const id of selectedIds) {
      updateTask(id, { inMyDay: true, myDayDate: today });
    }
    setDailySaved(true);
    window.setTimeout(() => setDailySaved(false), 2500);
  };

  const handleSaveWeekly = (e: React.FormEvent) => {
    e.preventDefault();
    saveWeeklyReview({
      weekStart,
      wins,
      blockers,
      nextWeekFocus: nextFocus,
    });
    setWeeklySaved(true);
    window.setTimeout(() => setWeeklySaved(false), 2500);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            Planejamento & Revisão
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Escolha o que realmente importa hoje e revise sua semana com clareza
          </p>
        </div>

        <div
          className="flex gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <button
            type="button"
            onClick={() => setTab('daily')}
            className="rounded-lg px-3 py-1 text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: tab === 'daily' ? 'var(--accent-soft)' : 'transparent',
              color: tab === 'daily' ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            Planejar Dia (+15 XP)
          </button>
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className="rounded-lg px-3 py-1 text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: tab === 'weekly' ? 'var(--accent-soft)' : 'transparent',
              color: tab === 'weekly' ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            Revisão Semanal (+40 XP)
          </button>
        </div>
      </div>

      {tab === 'daily' ? (
        <form
          onSubmit={handleSaveDaily}
          className="rounded-2xl border p-4 sm:p-5 space-y-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-sm font-semibold">1. Escolha até 3 prioridades para hoje ({selectedIds.length}/3)</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Elas serão fixadas automaticamente no seu Meu Dia.
            </p>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {pendingTasks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Sem tarefas pendentes no momento.
              </p>
            ) : (
              pendingTasks.map((t) => {
                const picked = selectedIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => togglePriorityPick(t.id)}
                    className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs text-left cursor-pointer"
                    style={{
                      borderColor: picked ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: picked ? 'var(--accent-soft)' : 'var(--surface-2)',
                    }}
                  >
                    <span className="truncate font-medium">{t.title}</span>
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                      style={{
                        backgroundColor: picked ? 'var(--accent)' : 'transparent',
                        border: picked ? 'none' : '1px solid var(--border)',
                        color: 'var(--accent-fg)',
                      }}
                    >
                      {picked && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">
              2. Qual é a intenção principal do dia?
            </label>
            <input
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Ex: Terminar o módulo principal sem distrações"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Salvar Plano de Hoje
            </button>
            {dailySaved && (
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                Planejamento salvo!
              </span>
            )}
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSaveWeekly}
          className="rounded-2xl border p-4 sm:p-5 space-y-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
              <p className="text-lg font-bold tabular-nums">{weekSummary.tasksDone}</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Tarefas concluídas</p>
            </div>
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
              <p className="text-lg font-bold tabular-nums">{weekSummary.workouts}</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Treinos Academia</p>
            </div>
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
              <p className="text-lg font-bold tabular-nums">{weekSummary.focusMin}m</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Tempo focado</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Principais vitórias da semana</label>
            <textarea
              rows={2}
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="O que deu certo?"
              className="w-full rounded-xl border px-3 py-2 text-xs outline-none resize-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">O que travou ou pode melhorar?</label>
            <textarea
              rows={2}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Onde perdi foco?"
              className="w-full rounded-xl border px-3 py-2 text-xs outline-none resize-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Foco da próxima semana</label>
            <input
              type="text"
              value={nextFocus}
              onChange={(e) => setNextFocus(e.target.value)}
              placeholder="Principal objetivo para a semana que vem"
              className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Concluir Revisão Semanal
            </button>
            {weeklySaved && (
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                Revisão salva!
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
