import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Dumbbell,
  Flame,
  NotebookPen,
  Timer,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { HeatmapCategory } from '../types';
import { getDailyActivityMap, getDaySummary } from '../services/analytics';
import { formatLongDatePT, formatMinutes, formatShortDatePT, getLastNDays, todayKey } from '../utils/date';

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

export const GlobalHeatmap: React.FC = () => {
  const { state } = useApp();
  const [category, setCategory] = useState<HeatmapCategory>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());

  const today = todayKey();
  const days40 = useMemo(() => getLastNDays(40, today), [today]);
  const activityMap = useMemo(() => getDailyActivityMap(state, category, 40), [state, category]);
  const selectedDetail = useMemo(() => getDaySummary(state, selectedDate), [state, selectedDate]);

  const activeDaysCount = useMemo(
    () => days40.filter((dk) => (activityMap[dk]?.level ?? 0) > 0).length,
    [days40, activityMap]
  );

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Mapa de Consistência</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
            >
              {activeDaysCount}/40 dias
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Últimos 40 dias · clique em um dia para inspecionar
          </p>
        </div>

        {/* Seletor único (inclui Geral e todas as categorias) */}
        <div className="relative inline-flex items-center">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HeatmapCategory)}
            aria-label="Escolher visualização do mapa"
            className="appearance-none rounded-xl border py-1.5 pl-3 pr-8 text-xs font-medium outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--accent)',
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 h-3.5 w-3.5"
            style={{ color: 'var(--muted)' }}
          />
        </div>
      </div>

      {/* Grade 5x8 (40 dias) */}
      <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
        {days40.map((dateKey) => {
          const info = activityMap[dateKey];
          const level = info?.level ?? 0;
          const isSelected = selectedDate === dateKey;
          const isTodayCell = dateKey === today;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              title={`${formatShortDatePT(dateKey)}: ${info?.tasksDone ?? 0} tarefas, ${info?.habitsDone ?? 0} hábitos, ${info?.workouts.length ?? 0} treino(s)`}
              className="aspect-square max-h-10 w-full rounded-lg transition-transform hover:scale-105 cursor-pointer"
              style={{
                backgroundColor: HEAT_COLORS[level],
                outline: isSelected
                  ? '2px solid var(--text)'
                  : isTodayCell
                    ? '1.5px solid var(--accent)'
                    : 'none',
                outlineOffset: '1px',
              }}
            />
          );
        })}
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
