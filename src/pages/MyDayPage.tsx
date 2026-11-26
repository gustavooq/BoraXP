import React, { useMemo, useState } from 'react';
import { Check, Compass, Plus, Sun } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TaskRow } from '../components/TaskRow';
import { formatLongDatePT, todayKey } from '../utils/date';

export const MyDayPage: React.FC = () => {
  const { state, addTask, toggleHabitLog, setActivePage } = useApp();
  const [title, setTitle] = useState('');
  const today = todayKey();

  const myDayTasks = useMemo(() => {
    return state.tasks.filter(
      (t) =>
        !t.deletedAt &&
        (t.dueDate === today ||
          (t.dueDate && t.dueDate < today && !t.completed) ||
          (t.inMyDay && (!t.myDayDate || t.myDayDate === today)))
    );
  }, [state.tasks, today]);

  const overdue = myDayTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
  const todayPending = myDayTasks.filter((t) => !t.completed && (!t.dueDate || t.dueDate >= today));
  const todayDone = myDayTasks.filter((t) => t.completed);

  const activeHabits = state.habits.filter((h) => !h.deletedAt && !h.archived);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title,
      priority: 'high',
      dueDate: today,
      inMyDay: true,
    });
    setTitle('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-400" />
            Meu Dia
          </h1>
          <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--muted)' }}>
            {formatLongDatePT(today)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActivePage('planning')}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <Compass className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          Planejar Meu Dia
        </button>
      </div>

      {/* Adição rápida para hoje */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Adicionar tarefa ao Meu Dia..."
          className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
            Atrasadas ({overdue.length})
          </h2>
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Para Hoje ({todayPending.length})
        </h2>
        {todayPending.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-8 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma tarefa pendente para hoje.
          </div>
        ) : (
          todayPending.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </section>

      {activeHabits.length > 0 && (
        <section
          className="rounded-2xl border p-4"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
            Hábitos de Hoje
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeHabits.map((h) => {
              const done = Boolean(h.logs[today]);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggleHabitLog(h.id, today)}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer"
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
        </section>
      )}

      {todayDone.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Concluídas Hoje ({todayDone.length})
          </h2>
          {todayDone.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </section>
      )}
    </div>
  );
};
