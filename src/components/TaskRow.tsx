import React from 'react';
import { Calendar, Check, Clock, Play, Trash2 } from 'lucide-react';
import { Priority, Task } from '../types';
import { useApp } from '../store/AppContext';
import { formatShortDatePT, todayKey } from '../utils/date';

const PRIORITY_STYLE: Record<Priority, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: '#f43f5e' },
  high: { label: 'Alta', color: '#f59e0b' },
  medium: { label: 'Média', color: '#06b6d4' },
  low: { label: 'Baixa', color: '#64748b' },
};

interface TaskRowProps {
  task: Task;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onEdit, compact = false }) => {
  const { state, toggleTask, deleteTask, startPomodoro, setActivePage } = useApp();
  const today = todayKey();
  const project = state.projects.find((p) => p.id === task.projectId && !p.deletedAt);
  const pStyle = PRIORITY_STYLE[task.priority];
  const isOverdue = Boolean(!task.completed && task.dueDate && task.dueDate < today);

  const handleFocus = () => {
    startPomodoro(task.id);
    setActivePage('pomodoro');
  };

  return (
    <div
      className="group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-2)',
        opacity: task.completed ? 0.65 : 1,
      }}
    >
      <button
        type="button"
        onClick={() => toggleTask(task.id)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition cursor-pointer"
        style={{
          borderColor: task.completed ? 'var(--accent)' : pStyle.color,
          backgroundColor: task.completed ? 'var(--accent)' : 'transparent',
          color: 'var(--accent-fg)',
        }}
        aria-label={task.completed ? 'Desmarcar tarefa' : 'Concluir tarefa'}
      >
        {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
      </button>

      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onEdit && onEdit(task)}
      >
        <p className={`truncate text-sm font-medium ${task.completed ? 'line-through' : ''}`}>
          {task.title}
        </p>

        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
            <span
              className="rounded px-1.5 py-0.5 font-medium"
              style={{ backgroundColor: `${pStyle.color}20`, color: pStyle.color }}
            >
              {pStyle.label}
            </span>

            {project && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}

            {task.dueDate && (
              <span
                className="flex items-center gap-1 tabular-nums"
                style={{ color: isOverdue ? 'var(--danger)' : 'var(--muted)' }}
              >
                <Calendar className="h-3 w-3" />
                {task.dueDate === today ? 'Hoje' : formatShortDatePT(task.dueDate)}
                {isOverdue && ' (atrasada)'}
              </span>
            )}

            {task.dueTime && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {task.dueTime}
              </span>
            )}

            {task.pomodorosCompleted > 0 && (
              <span className="tabular-nums">🍅 {task.pomodorosCompleted}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
        {!task.completed && (
          <button
            type="button"
            onClick={handleFocus}
            className="rounded-lg p-1.5 transition hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--accent)' }}
            title="Iniciar Pomodoro nesta tarefa"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          className="rounded-lg p-1.5 transition hover:opacity-80 cursor-pointer"
          style={{ color: 'var(--muted)' }}
          title="Excluir tarefa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
