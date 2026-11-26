import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Droplets, Dumbbell, Flame, NotebookPen, Timer } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { HeatmapCategory } from '../types';
import { getDailyActivityMap, getDaySummary } from '../services/analytics';
import { formatLongDatePT, formatMinutes, formatShortDatePT, getLastNWeeks, todayKey } from '../utils/date';

const CATEGORIES: { id: HeatmapCategory; label: string }[] = [
  { id: 'all', label: 'Geral' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'habits', label: 'Hábitos' },
  { id: 'pomodoro', label: 'Foco' },
  { id: 'gym', label: 'Academia' },
  { id: 'water', label: 'Água' },
  { id: 'journal', label: 'Diário' },
];

const HEAT_COLORS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];
const DAY_HEADERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const GlobalHeatmap: React.FC = () => {
  const { state } = useApp();
  const [category, setCategory] = useState<HeatmapCategory>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());

  const today = todayKey();
  const weeks = useMemo(() => getLastNWeeks(20, today), [today]);
  const activityMap = useMemo(() => getDailyActivityMap(state, category, 150), [state, category]);
  const selectedDetail = useMemo(() => getDaySummary(state, selectedDate), [state, selectedDate]);

  const activeDaysCount = useMemo(() => {
    return weeks
      .flat()
      .filter((dk) => dk <= today && (activityMap[dk]?.level ?? 0) > 0)
      .length;
  }, [weeks, today, activityMap]);

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Mapa de Consistência</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
            >
              {activeDaysCount} dias ativos (20 sem)
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Clique em um quadrado para inspecionar o dia
          </p>
        </div>

        {/* Filtros discretos */}
        <div
          className="flex flex-wrap gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matriz estilo GitHub: colunas = semanas, linhas = Seg..Dom */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5 items-start">
          <div className="grid grid-rows-7 gap-1.5 pr-1 pt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>
            {DAY_HEADERS.map((lbl, idx) => (
              <div key={idx} className="h-3.5 sm:h-4 flex items-center justify-center leading-none">
                {idx % 2 === 0 ? lbl : ''}
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                {week.map((dateKey) => {
                  const isFuture = dateKey > today;
                  const info = activityMap[dateKey];
                  const level = isFuture ? 0 : (info?.level ?? 0);
                  const isSelected = selectedDate === dateKey;
                  const isTodayCell = dateKey === today;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDate(dateKey)}
                      title={
                        isFuture
                          ? `${formatShortDatePT(dateKey)} (futuro)`
                          : `${formatShortDatePT(dateKey)}: ${info?.tasksDone ?? 0} tarefas, ${info?.habitsDone ?? 0} hábitos, ${info?.workouts.length ?? 0} treino(s)`
                      }
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] transition-transform hover:scale-110 disabled:opacity-25 cursor-pointer"
                      style={{
                        backgroundColor: HEAT_COLORS[level],
                        outline: isSelected
                          ? '2px solid var(--text)'
                          : isTodayCell
                            ? '1px solid var(--accent)'
                            : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda + Resumo do dia selecionado */}
      <div
        className="mt-3 flex flex-col gap-2.5 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium capitalize">
            <CalendarDays className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
            {selectedDate === today ? 'Hoje' : formatLongDatePT(selectedDate)}
          </span>
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--muted)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {selectedDetail.tasksDone} tarefas
          </span>
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--muted)' }}>
            <Flame className="h-3.5 w-3.5" />
            {selectedDetail.habitsDone} hábitos
          </span>
          <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--muted)' }}>
            <Timer className="h-3.5 w-3.5" />
            {formatMinutes(selectedDetail.focusMinutes)}
          </span>
          {selectedDetail.workouts.length > 0 && (
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>
              <Dumbbell className="h-3.5 w-3.5" />
              Treino {selectedDetail.workouts.map((w) => w.code).join(', ')}
            </span>
          )}
          {selectedDetail.waterGlasses > 0 && (
            <span className="flex items-center gap-1 tabular-nums" style={{ color: 'var(--muted)' }}>
              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
              {selectedDetail.waterGlasses} copos
            </span>
          )}
          {selectedDetail.hasJournal && (
            <span className="flex items-center gap-1" style={{ color: 'var(--muted)' }}>
              <NotebookPen className="h-3.5 w-3.5" />
              Diário
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          <span>Menos</span>
          {HEAT_COLORS.map((c, idx) => (
            <span
              key={idx}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </section>
  );
};
