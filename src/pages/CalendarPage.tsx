import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Dumbbell, Flame } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TaskRow } from '../components/TaskRow';
import {
  addDays,
  formatLongDatePT,
  getMonthMatrix,
  getStartOfWeek,
  getWeekdayShort,
  todayKey,
} from '../utils/date';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const CalendarPage: React.FC = () => {
  const { state, addTask } = useApp();
  const today = todayKey();
  const now = new Date();

  const [view, setView] = useState<'month' | 'week'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [quickTitle, setQuickTitle] = useState('');

  const monthCells = useMemo(() => getMonthMatrix(year, monthIndex), [year, monthIndex]);
  const weekDays = useMemo(() => {
    const start = getStartOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const handlePrev = () => {
    if (view === 'month') {
      if (monthIndex === 0) {
        setYear((y) => y - 1);
        setMonthIndex(11);
      } else {
        setMonthIndex((m) => m - 1);
      }
    } else {
      setSelectedDate((d) => addDays(d, -7));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      if (monthIndex === 11) {
        setYear((y) => y + 1);
        setMonthIndex(0);
      } else {
        setMonthIndex((m) => m + 1);
      }
    } else {
      setSelectedDate((d) => addDays(d, 7));
    }
  };

  const selectedTasks = useMemo(
    () => state.tasks.filter((t) => !t.deletedAt && t.dueDate === selectedDate),
    [state.tasks, selectedDate]
  );

  const selectedWorkouts = useMemo(
    () => state.workoutSessions.filter((w) => !w.deletedAt && w.date === selectedDate),
    [state.workoutSessions, selectedDate]
  );

  const selectedHabitsDone = useMemo(
    () => state.habits.filter((h) => !h.deletedAt && h.logs[selectedDate]),
    [state.habits, selectedDate]
  );

  const handleAddOnSelectedDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addTask({
      title: quickTitle,
      dueDate: selectedDate,
      priority: 'medium',
      inMyDay: selectedDate === today,
    });
    setQuickTitle('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            Calendário
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Prazos, treinos de academia e hábitos em uma única visão
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex rounded-xl border p-1"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
          >
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: view === v ? 'var(--accent-soft)' : 'transparent',
                  color: view === v ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {v === 'month' ? 'Mensal' : 'Semanal'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-xl border p-2 cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl border p-2 cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <section
        className="rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold mb-3">
          {view === 'month' ? `${MONTH_NAMES[monthIndex]} ${year}` : `Semana de ${formatLongDatePT(weekDays[0])}`}
        </h2>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium mb-2" style={{ color: 'var(--muted)' }}>
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {(view === 'month'
            ? monthCells
            : weekDays.map((dk) => ({ dateKey: dk, inMonth: true }))
          ).map(({ dateKey, inMonth }) => {
            const dayTasks = state.tasks.filter((t) => !t.deletedAt && t.dueDate === dateKey);
            const dayWorkouts = state.workoutSessions.filter((w) => !w.deletedAt && w.date === dateKey);
            const isSelected = selectedDate === dateKey;
            const isTodayCell = dateKey === today;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className="flex min-h-[58px] flex-col items-start justify-between rounded-xl border p-2 text-left transition cursor-pointer"
                style={{
                  borderColor: isSelected
                    ? 'var(--accent)'
                    : isTodayCell
                      ? 'var(--text)'
                      : 'var(--border)',
                  backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-semibold tabular-nums">
                    {Number(dateKey.slice(8))}
                  </span>
                  {dayWorkouts.length > 0 && (
                    <span
                      className="rounded px-1 text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      {dayWorkouts.map((w) => w.code).join('+')}
                    </span>
                  )}
                </div>

                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: t.completed
                            ? 'var(--muted)'
                            : t.priority === 'urgent'
                              ? 'var(--danger)'
                              : 'var(--accent)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Painel do dia selecionado */}
      <section
        className="rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold capitalize">
            {getWeekdayShort(selectedDate)}, {formatLongDatePT(selectedDate)}
          </h3>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
            {selectedWorkouts.length > 0 && (
              <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>
                <Dumbbell className="h-3.5 w-3.5" />
                Treino {selectedWorkouts.map((w) => w.code).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              {selectedHabitsDone.length} hábitos feitos
            </span>
          </div>
        </div>

        <form onSubmit={handleAddOnSelectedDay} className="flex gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`+ Adicionar tarefa em ${selectedDate}...`}
            className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <button
            type="submit"
            className="rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Agendar
          </button>
        </form>

        {selectedTasks.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Nenhuma tarefa agendada para esta data.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
