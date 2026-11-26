import React, { useMemo } from 'react';
import { Award, BarChart3, Flame, Lock, Zap } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { getLastNDaysStats } from '../services/analytics';

export const StatsPage: React.FC = () => {
  const { state, gamification } = useApp();
  const series = useMemo(() => getLastNDaysStats(state, 14), [state]);

  const maxTasks = Math.max(1, ...series.map((s) => s.tasksDone + s.habitsDone));
  const maxFocus = Math.max(1, ...series.map((s) => s.focusMinutes));

  const totalTasksDone = state.tasks.filter((t) => !t.deletedAt && t.completed).length;
  const totalFocusMin = state.pomodoroSessions
    .filter((p) => p.mode === 'focus')
    .reduce((a, b) => a + b.durationMinutes, 0);
  const totalWorkouts = state.workoutSessions.filter((w) => !w.deletedAt).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          Estatísticas & Gamificação
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Seu progresso nos últimos 14 dias, nível de XP e conquistas
        </p>
      </div>

      {/* Resumo XP e Nível */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold tabular-nums"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {gamification.level}
            </span>
            <div>
              <p className="text-base font-bold flex items-center gap-1.5">
                Nível {gamification.level}
                <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              </p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {gamification.totalXp} XP totais · {gamification.currentLevelXp}/{gamification.nextLevelXp} XP para o próximo nível
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs tabular-nums">
            <span className="flex items-center gap-1 font-semibold">
              <Flame className="h-4 w-4 text-amber-400" />
              Streak: {gamification.globalStreak}d
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${gamification.progressPercent}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
            <p className="text-lg font-bold tabular-nums">{totalTasksDone}</p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Tarefas concluídas</p>
          </div>
          <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
            <p className="text-lg font-bold tabular-nums">{totalWorkouts}</p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Treinos Academia</p>
          </div>
          <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
            <p className="text-lg font-bold tabular-nums">{totalFocusMin}m</p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Minutos de foco</p>
          </div>
        </div>
      </section>

      {/* Gráficos SVG leves (14 dias) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section
          className="rounded-2xl border p-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3">Ações Concluídas (14 dias)</h3>
          <div className="flex h-36 items-end gap-1.5">
            {series.map((pt) => {
              const total = pt.tasksDone + pt.habitsDone;
              const hPct = Math.round((total / maxTasks) * 100);
              return (
                <div key={pt.dateKey} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex items-end justify-center flex-1">
                    <div
                      title={`${pt.label}: ${pt.tasksDone} tarefas, ${pt.habitsDone} hábitos`}
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(total > 0 ? 12 : 4, hPct)}%`,
                        backgroundColor: total > 0 ? 'var(--accent)' : 'var(--surface-2)',
                      }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--muted)' }}>
                    {pt.label.split('/')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-2xl border p-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3">Minutos de Foco (14 dias)</h3>
          <div className="flex h-36 items-end gap-1.5">
            {series.map((pt) => {
              const hPct = Math.round((pt.focusMinutes / maxFocus) * 100);
              return (
                <div key={pt.dateKey} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex items-end justify-center flex-1">
                    <div
                      title={`${pt.label}: ${pt.focusMinutes} min`}
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(pt.focusMinutes > 0 ? 12 : 4, hPct)}%`,
                        backgroundColor: pt.focusMinutes > 0 ? 'var(--accent)' : 'var(--surface-2)',
                      }}
                    />
                  </div>
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--muted)' }}>
                    {pt.label.split('/')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Humor & Energia */}
      <section
        className="rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-2">Humor × Energia (14 dias)</h3>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
          {series.map((pt) => (
            <div
              key={pt.dateKey}
              className="flex flex-col items-center rounded-xl border py-2 text-[10px] tabular-nums"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
            >
              <span style={{ color: 'var(--muted)' }}>{pt.label}</span>
              <span className="mt-1 font-bold" style={{ color: pt.mood ? 'var(--accent)' : 'var(--muted)' }}>
                {pt.mood ? `H:${pt.mood}` : '·'}
              </span>
              <span style={{ color: 'var(--muted)' }}>{pt.energy ? `E:${pt.energy}` : ''}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Conquistas */}
      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {gamification.achievements.map((ach) => (
            <div
              key={ach.id}
              className="flex items-center justify-between rounded-xl border p-3"
              style={{
                borderColor: ach.unlocked ? 'var(--accent)' : 'var(--border)',
                backgroundColor: ach.unlocked ? 'var(--accent-soft)' : 'var(--surface-2)',
                opacity: ach.unlocked ? 1 : 0.7,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: ach.unlocked ? 'var(--accent)' : 'var(--bg)',
                    color: ach.unlocked ? 'var(--accent-fg)' : 'var(--muted)',
                  }}
                >
                  {ach.unlocked ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{ach.title}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                    {ach.description}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold tabular-nums ml-2">{ach.progressText}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
