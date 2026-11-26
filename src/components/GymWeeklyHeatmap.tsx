import React, { useMemo } from 'react';
import { CheckCircle2, Dumbbell, Flame } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { getGymWeeklyHeatmapData } from '../services/analytics';
import { formatShortDatePT, getWeekdayShort, todayKey } from '../utils/date';

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const GymWeeklyHeatmap: React.FC = () => {
  const { state, updateSettings } = useApp();
  const today = todayKey();
  const goal = Math.max(1, state.settings.gymWeeklyGoal || 4);

  const data = useMemo(() => getGymWeeklyHeatmapData(state, 12, today), [state, today]);

  const templateColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tpl of state.workoutTemplates) {
      map[tpl.id] = tpl.color;
      map[tpl.code] = tpl.color;
    }
    return map;
  }, [state.workoutTemplates]);

  const currentProgress = Math.min(100, Math.round((data.currentWeek.totalSessions / goal) * 100));

  return (
    <div className="space-y-4">
      {/* Bloco 1: Semana Atual */}
      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Dumbbell className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Esta Semana na Academia</h2>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {data.currentWeek.totalSessions} de {goal} treinos concluídos
                {data.weeklyStreak > 0 && ` · 🔥 ${data.weeklyStreak} sem seguidas`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: 'var(--muted)' }}>Meta semanal:</span>
            <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateSettings({ gymWeeklyGoal: n })}
                  className="h-6 w-6 rounded-md font-medium tabular-nums cursor-pointer"
                  style={{
                    backgroundColor: goal === n ? 'var(--accent)' : 'transparent',
                    color: goal === n ? 'var(--accent-fg)' : 'var(--muted)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 7 dias da semana */}
        <div className="grid grid-cols-7 gap-2">
          {data.currentWeek.days.map((day) => {
            const isToday = day.dateKey === today;
            const hasWorkout = day.sessions.length > 0;
            const mainSession = day.sessions[0];
            const color = mainSession ? templateColorMap[mainSession.templateId] || 'var(--accent)' : undefined;

            return (
              <div
                key={day.dateKey}
                className="flex flex-col items-center justify-between rounded-xl border py-2.5 px-1 text-center transition"
                style={{
                  borderColor: hasWorkout
                    ? color
                    : isToday
                      ? 'var(--accent)'
                      : 'var(--border)',
                  backgroundColor: hasWorkout ? `${color}18` : 'var(--surface-2)',
                }}
              >
                <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                  {getWeekdayShort(day.dateKey)}
                </span>
                <div className="my-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold">
                  {hasWorkout ? (
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: color, color: '#03150e' }}
                    >
                      {day.sessions.map((s) => s.code).join('+')}
                    </span>
                  ) : (
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
                      {day.dateKey.slice(8)}
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: isToday ? 'var(--accent)' : 'var(--muted)' }}>
                  {isToday ? 'Hoje' : formatShortDatePT(day.dateKey)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Barra de progresso da semana */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${currentProgress}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
      </section>

      {/* Bloco 2: Heatmap Semanal Exclusivo (12 Semanas x Seg-Dom) */}
      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold">Heatmap Semanal · Academia (12 semanas)</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Cada linha é uma semana (Seg–Dom) com os treinos realizados e o status da meta
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Sequência: {data.weeklyStreak} sem
            </span>
            <span>Total: {data.totalWorkouts} treinos</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[460px] space-y-1.5">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[76px_repeat(7,1fr)_66px] gap-1.5 text-[11px] font-medium pb-1" style={{ color: 'var(--muted)' }}>
              <span>Semana</span>
              {WEEKDAY_HEADERS.map((d) => (
                <span key={d} className="text-center">
                  {d}
                </span>
              ))}
              <span className="text-right">Meta</span>
            </div>

            {/* Linhas das 12 semanas (mais recente no topo) */}
            {[...data.weeks].reverse().map((week) => (
              <div
                key={week.weekStart}
                className="grid grid-cols-[76px_repeat(7,1fr)_66px] items-center gap-1.5"
              >
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
                  {formatShortDatePT(week.weekStart)}
                </span>

                {week.days.map((day) => {
                  const isFuture = day.dateKey > today;
                  const count = day.sessions.length;
                  const first = day.sessions[0];
                  const color = first ? templateColorMap[first.templateId] || 'var(--accent)' : 'var(--heat-0)';

                  return (
                    <div
                      key={day.dateKey}
                      title={
                        count > 0
                          ? `${formatShortDatePT(day.dateKey)}: ${day.sessions.map((s) => `${s.code} (${s.name})`).join(', ')}`
                          : formatShortDatePT(day.dateKey)
                      }
                      className="flex h-7 items-center justify-center rounded-md text-[11px] font-bold transition"
                      style={{
                        backgroundColor: count > 0 ? color : 'var(--heat-0)',
                        color: count > 0 ? '#03150e' : 'var(--muted)',
                        opacity: isFuture ? 0.25 : 1,
                        outline: day.dateKey === today ? '1px solid var(--accent)' : 'none',
                      }}
                    >
                      {count > 0 ? day.sessions.map((s) => s.code).join('+') : ''}
                    </div>
                  );
                })}

                <div className="flex items-center justify-end gap-1 text-xs font-medium tabular-nums">
                  <span style={{ color: week.goalMet ? 'var(--accent)' : 'var(--muted)' }}>
                    {week.totalSessions}/{goal}
                  </span>
                  {week.goalMet && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
