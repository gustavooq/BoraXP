import React, { useMemo, useState } from 'react';
import { Check, Flame, Plus, Trash2, Trophy } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { getHabitBestStreak, getHabitStreak } from '../services/analytics';
import { formatShortDatePT, getLastNDays, todayKey } from '../utils/date';

const HABIT_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#6366f1', '#f43f5e'];

export const HabitsPage: React.FC = () => {
  const { state, addHabit, toggleHabitLog, deleteHabit } = useApp();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>('daily');

  const today = todayKey();
  const last14 = useMemo(() => getLastNDays(14, today), [today]);
  const habits = useMemo(
    () => state.habits.filter((h) => !h.deletedAt && !h.archived),
    [state.habits]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addHabit({
      title,
      color,
      frequency,
      targetDays: frequency === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
    });
    setTitle('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-400" />
          Hábitos
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Clique em qualquer quadrado dos últimos 14 dias para marcar ou ajustar (+10 XP por check)
        </p>
      </div>

      {/* Criar hábito */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Novo hábito (ex: Meditar 10m, 2L de água)..."
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekdays')}
            className="rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="daily">Todos os dias</option>
            <option value="weekdays">Dias úteis (Seg–Sex)</option>
          </select>
          <button
            type="submit"
            className="flex items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus className="h-4 w-4" /> Criar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Cor:
          </span>
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-5 w-5 rounded-full cursor-pointer"
              style={{
                backgroundColor: c,
                outline: color === c ? '2px solid var(--text)' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </form>

      {/* Lista de hábitos */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-8 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhum hábito cadastrado.
          </div>
        ) : (
          habits.map((h) => {
            const doneToday = Boolean(h.logs[today]);
            const streak = getHabitStreak(h, today);
            const best = getHabitBestStreak(h);

            return (
              <div
                key={h.id}
                className="rounded-2xl border p-4 space-y-3"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleHabitLog(h.id, today)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border transition cursor-pointer"
                      style={{
                        borderColor: doneToday ? h.color : 'var(--border)',
                        backgroundColor: doneToday ? h.color : 'transparent',
                        color: '#03150e',
                      }}
                    >
                      {doneToday && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>
                    <div>
                      <p className="text-sm font-semibold">{h.title}</p>
                      <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        {h.frequency === 'weekdays' ? 'Dias úteis' : 'Diário'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    <span className="flex items-center gap-1 font-medium">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      {streak}d
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Trophy className="h-3.5 w-3.5" />
                      {best}d
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteHabit(h.id)}
                      className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                      style={{ color: 'var(--muted)' }}
                      title="Excluir hábito"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grade dos últimos 14 dias */}
                <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                  {last14.map((dk) => {
                    const done = Boolean(h.logs[dk]);
                    const isTodayCell = dk === today;
                    return (
                      <button
                        key={dk}
                        type="button"
                        onClick={() => toggleHabitLog(h.id, dk)}
                        title={formatShortDatePT(dk)}
                        className="flex h-8 flex-col items-center justify-center rounded-lg border text-[10px] tabular-nums transition cursor-pointer"
                        style={{
                          borderColor: done
                            ? h.color
                            : isTodayCell
                              ? 'var(--accent)'
                              : 'var(--border)',
                          backgroundColor: done ? `${h.color}30` : 'var(--surface-2)',
                          color: done ? h.color : 'var(--muted)',
                        }}
                      >
                        <span className="font-semibold">{dk.slice(8)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
