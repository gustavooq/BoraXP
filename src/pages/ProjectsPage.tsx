import React, { useMemo, useState } from 'react';
import { FolderKanban, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Priority, Task } from '../types';
import { TaskRow } from '../components/TaskRow';
import { todayKey } from '../utils/date';

const PROJECT_COLORS = ['#10b981', '#6366f1', '#06b6d4', '#f59e0b', '#f43f5e'];

export const ProjectsPage: React.FC = () => {
  const { state, addProject, deleteProject, addTask, updateTask } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  // Form nova pasta/projeto
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projFolder, setProjFolder] = useState('');
  const [projColor, setProjColor] = useState(PROJECT_COLORS[0]);

  // Form tarefa (criar ou editar)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskReminder, setTaskReminder] = useState('15');
  const [taskInMyDay, setTaskInMyDay] = useState(false);

  const projects = useMemo(
    () => state.projects.filter((p) => !p.deletedAt && !p.archived),
    [state.projects]
  );

  const filteredTasks = useMemo(() => {
    return state.tasks
      .filter((t) => !t.deletedAt)
      .filter((t) => (selectedProjectId === 'all' ? true : t.projectId === selectedProjectId))
      .filter((t) =>
        statusFilter === 'all' ? true : statusFilter === 'pending' ? !t.completed : t.completed
      )
      .filter((t) => (priorityFilter === 'all' ? true : t.priority === priorityFilter));
  }, [state.tasks, selectedProjectId, statusFilter, priorityFilter]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    const p = addProject({ name: projName, folder: projFolder, color: projColor });
    setSelectedProjectId(p.id);
    setProjName('');
    setProjFolder('');
    setShowProjectForm(false);
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskNotes('');
    setTaskProjectId(selectedProjectId !== 'all' ? selectedProjectId : '');
    setTaskPriority('medium');
    setTaskDueDate('');
    setTaskDueTime('');
    setTaskReminder('15');
    setTaskInMyDay(false);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskNotes(task.notes ?? '');
    setTaskProjectId(task.projectId ?? '');
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate ?? '');
    setTaskDueTime(task.dueTime ?? '');
    setTaskReminder(String(task.reminderMinutesBefore ?? 15));
    setTaskInMyDay(task.inMyDay);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const payload = {
      title: taskTitle,
      notes: taskNotes,
      projectId: taskProjectId || undefined,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      dueTime: taskDueTime || undefined,
      reminderMinutesBefore: taskDueTime ? Number(taskReminder) || 0 : undefined,
      inMyDay: taskInMyDay,
      myDayDate: taskInMyDay ? todayKey() : undefined,
    };

    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    resetTaskForm();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            Projetos & Tarefas
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Organize por pastas, defina prioridades, datas, horários e lembretes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowProjectForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Projeto
        </button>
      </div>

      {/* Form Novo Projeto */}
      {showProjectForm && (
        <form
          onSubmit={handleCreateProject}
          className="rounded-2xl border p-4 space-y-3 animate-fade-in"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Nome do projeto (ex: Inglês, Casa)"
              className="rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              autoFocus
            />
            <input
              type="text"
              value={projFolder}
              onChange={(e) => setProjFolder(e.target.value)}
              placeholder="Pasta (opcional, ex: Carreira)"
              className="rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProjColor(c)}
                  className="h-5 w-5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: c,
                    outline: projColor === c ? '2px solid var(--text)' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="rounded-xl px-4 py-1.5 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Criar Projeto
            </button>
          </div>
        </form>
      )}

      {/* Abas de Projetos */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedProjectId('all')}
          className="rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
          style={{
            borderColor: selectedProjectId === 'all' ? 'var(--accent)' : 'var(--border)',
            backgroundColor: selectedProjectId === 'all' ? 'var(--accent-soft)' : 'var(--surface)',
            color: selectedProjectId === 'all' ? 'var(--accent)' : 'var(--text)',
          }}
        >
          Todos
        </button>
        {projects.map((p) => {
          const active = selectedProjectId === p.id;
          return (
            <div key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedProjectId(p.id)}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
                style={{
                  borderColor: active ? p.color : 'var(--border)',
                  backgroundColor: active ? `${p.color}20` : 'var(--surface)',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.folder ? `${p.folder} / ${p.name}` : p.name}</span>
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => {
                    deleteProject(p.id);
                    setSelectedProjectId('all');
                  }}
                  className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: 'var(--muted)' }}
                  title="Arquivar/excluir projeto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulário completo de tarefa */}
      <form
        onSubmit={handleSubmitTask}
        className="rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {editingTask ? 'Editando Tarefa' : 'Nova Tarefa'}
          </p>
          {editingTask && (
            <button
              type="button"
              onClick={resetTaskForm}
              className="flex items-center gap-1 text-xs cursor-pointer"
              style={{ color: 'var(--muted)' }}
            >
              <X className="h-3.5 w-3.5" /> Cancelar edição
            </button>
          )}
        </div>

        <input
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Título da tarefa..."
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select
            value={taskProjectId}
            onChange={(e) => setTaskProjectId(e.target.value)}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value as Priority)}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="urgent">Prioridade: Urgente</option>
            <option value="high">Prioridade: Alta</option>
            <option value="medium">Prioridade: Média</option>
            <option value="low">Prioridade: Baixa</option>
          </select>

          <input
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />

          <input
            type="time"
            value={taskDueTime}
            onChange={(e) => setTaskDueTime(e.target.value)}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />

          <select
            value={taskReminder}
            onChange={(e) => setTaskReminder(e.target.value)}
            disabled={!taskDueTime}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none disabled:opacity-40"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="0">Lembrete na hora</option>
            <option value="15">15 min antes</option>
            <option value="30">30 min antes</option>
            <option value="60">1 hora antes</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={taskInMyDay}
              onChange={(e) => setTaskInMyDay(e.target.checked)}
            />
            <span>Fixar no Meu Dia</span>
          </label>

          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {editingTask ? 'Salvar Alterações' : 'Adicionar Tarefa'}
          </button>
        </div>
      </form>

      {/* Filtros & Lista */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          {(['pending', 'completed', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: statusFilter === st ? 'var(--accent-soft)' : 'transparent',
                color: statusFilter === st ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {st === 'pending' ? 'Pendentes' : st === 'completed' ? 'Concluídas' : 'Todas'}
            </button>
          ))}
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          className="rounded-xl border px-2.5 py-1.5 text-xs outline-none"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="all">Todas prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-8 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma tarefa encontrada neste filtro.
          </div>
        ) : (
          filteredTasks.map((t) => <TaskRow key={t.id} task={t} onEdit={handleStartEdit} />)
        )}
      </div>
    </div>
  );
};
