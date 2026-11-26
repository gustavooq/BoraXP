import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Dumbbell,
  Flame,
  FolderKanban,
  LayoutDashboard,
  Play,
  Plus,
  Settings,
  Sun,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { PageId, Priority, QuickSection } from '../types';
import { todayKey } from '../utils/date';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.FC<{ className?: string }>;
  quick?: QuickSection;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Principal' },
  { id: 'myday', label: 'Meu Dia', icon: Sun, group: 'Principal' },
  { id: 'projects', label: 'Projetos & Tarefas', icon: FolderKanban, quick: 'tasks', group: 'Principal' },
  { id: 'calendar', label: 'Calendário', icon: Calendar, group: 'Principal' },

  { id: 'gym', label: 'Academia', icon: Dumbbell, quick: 'gym', group: 'Rotina & Corpo' },
  { id: 'habits', label: 'Hábitos', icon: Flame, quick: 'habits', group: 'Rotina & Corpo' },
  { id: 'pomodoro', label: 'Foco (Pomodoro)', icon: Timer, quick: 'pomodoro', group: 'Rotina & Corpo' },
  { id: 'goals', label: 'Metas', icon: Target, quick: 'goals', group: 'Rotina & Corpo' },

  { id: 'journal', label: 'Diário', icon: BookOpen, quick: 'journal', group: 'Mente & Progresso' },
  { id: 'planning', label: 'Planejamento & Revisão', icon: Compass, group: 'Mente & Progresso' },
  { id: 'stats', label: 'Estatísticas & XP', icon: BarChart3, group: 'Mente & Progresso' },

  { id: 'settings', label: 'Configurações', icon: Settings, group: 'Sistema' },
];

const GROUPS = ['Principal', 'Rotina & Corpo', 'Mente & Progresso', 'Sistema'];

export const SideDrawer: React.FC = () => {
  const {
    state,
    activePage,
    setActivePage,
    drawerOpen,
    drawerQuickSection,
    setDrawerQuickSection,
    closeDrawer,
    addTask,
    addHabit,
    toggleHabitLog,
    logWorkoutSession,
    addGoal,
    saveJournalEntry,
    startPomodoro,
    gamification,
  } = useApp();

  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Quick form: Tarefa
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('high');
  const [taskDueDate, setTaskDueDate] = useState(todayKey());
  const [taskProjectId, setTaskProjectId] = useState('');

  // Quick form: Academia
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('50');

  // Quick form: Hábito
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Quick form: Diário
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [journalNote, setJournalNote] = useState('');

  // Quick form: Meta
  const [goalTitle, setGoalTitle] = useState('');
  const [goalHorizon, setGoalHorizon] = useState<'short' | 'medium' | 'long'>('short');

  // Quick form: Pomodoro
  const [pomoTaskId, setPomoTaskId] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (drawerQuickSection === 'gym' && !selectedWorkoutId && state.workoutTemplates.length > 0) {
      const activeTpls = state.workoutTemplates.filter((w) => !w.deletedAt);
      if (activeTpls[0]) setSelectedWorkoutId(activeTpls[0].id);
    }
  }, [drawerQuickSection, selectedWorkoutId, state.workoutTemplates]);

  if (!drawerOpen) return null;

  const notifySaved = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(null), 2200);
  };

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    closeDrawer();
  };

  const toggleQuick = (section: QuickSection) => {
    setDrawerQuickSection(drawerQuickSection === section ? null : section);
  };

  const today = todayKey();
  const activeWorkouts = state.workoutTemplates.filter((w) => !w.deletedAt);
  const activeHabits = state.habits.filter((h) => !h.deletedAt && !h.archived);
  const pendingTasks = state.tasks.filter((t) => !t.deletedAt && !t.completed);

  const handleQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask({
      title: taskTitle,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      projectId: taskProjectId || undefined,
      inMyDay: taskDueDate === today,
    });
    setTaskTitle('');
    notifySaved('Tarefa adicionada!');
  };

  const handleQuickGym = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedWorkoutId || activeWorkouts[0]?.id;
    if (!targetId) return;
    const session = logWorkoutSession({
      templateId: targetId,
      date: today,
      durationMinutes: Number(workoutDuration) || undefined,
    });
    if (session) {
      notifySaved(`Treino ${session.code} registrado (+35 XP)!`);
    }
  };

  const handleQuickHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    addHabit({ title: newHabitTitle });
    setNewHabitTitle('');
    notifySaved('Hábito criado!');
  };

  const handleQuickJournal = (e: React.FormEvent) => {
    e.preventDefault();
    saveJournalEntry({
      date: today,
      mood,
      energy,
      note: journalNote || 'Check-in rápido do dia.',
    });
    setJournalNote('');
    notifySaved('Diário salvo (+15 XP)!');
  };

  const handleQuickGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    addGoal({
      title: goalTitle,
      horizon: goalHorizon,
      progressMode: 'numeric',
      targetValue: 10,
    });
    setGoalTitle('');
    notifySaved('Meta criada!');
  };

  const handleQuickPomodoro = () => {
    startPomodoro(pomoTaskId || null);
    setActivePage('pomodoro');
    closeDrawer();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={closeDrawer}
      />

      {/* Drawer Panel */}
      <aside
        className="relative z-10 flex h-full w-full max-w-[360px] flex-col border-l shadow-2xl animate-fade-in"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3.5"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-sm font-semibold">Navegação & Preencher Rápido</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Clique no nome para abrir · ou no + para preencher aqui
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-1.5 transition hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--muted)' }}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {savedToast && (
          <div
            className="mx-4 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium animate-fade-in"
            style={{
              backgroundColor: 'var(--accent-soft)',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group);
            return (
              <div key={group}>
                <p
                  className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted)' }}
                >
                  {group}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    const isQuickOpen = item.quick && drawerQuickSection === item.quick;

                    return (
                      <div key={item.id}>
                        <div
                          className="flex items-center gap-1 rounded-xl px-2 py-1.5 transition"
                          style={{
                            backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleNavigate(item.id)}
                            className="flex flex-1 items-center gap-2.5 py-1 text-left text-sm font-medium transition hover:opacity-90 cursor-pointer"
                            style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>

                          {item.quick && (
                            <button
                              type="button"
                              onClick={() => toggleQuick(item.quick!)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition cursor-pointer"
                              style={{
                                borderColor: isQuickOpen ? 'var(--accent)' : 'var(--border)',
                                backgroundColor: isQuickOpen ? 'var(--accent-soft)' : 'var(--surface)',
                                color: isQuickOpen ? 'var(--accent)' : 'var(--muted)',
                              }}
                              title={`Preencher rápido: ${item.label}`}
                              aria-label={`Preencher rápido: ${item.label}`}
                            >
                              {isQuickOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Painel inline rápido */}
                        {isQuickOpen && item.quick === 'tasks' && (
                          <form
                            onSubmit={handleQuickTask}
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <input
                              type="text"
                              value={taskTitle}
                              onChange={(e) => setTaskTitle(e.target.value)}
                              placeholder="O que precisa fazer?"
                              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                              autoFocus
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={taskPriority}
                                onChange={(e) => setTaskPriority(e.target.value as Priority)}
                                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                                style={{
                                  backgroundColor: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              >
                                <option value="urgent">Urgente</option>
                                <option value="high">Alta</option>
                                <option value="medium">Média</option>
                                <option value="low">Baixa</option>
                              </select>
                              <input
                                type="date"
                                value={taskDueDate}
                                onChange={(e) => setTaskDueDate(e.target.value)}
                                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                                style={{
                                  backgroundColor: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                            </div>
                            <select
                              value={taskProjectId}
                              onChange={(e) => setTaskProjectId(e.target.value)}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            >
                              <option value="">Sem projeto</option>
                              {state.projects
                                .filter((p) => !p.deletedAt && !p.archived)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="submit"
                              className="w-full rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                              Salvar Tarefa
                            </button>
                          </form>
                        )}

                        {isQuickOpen && item.quick === 'gym' && (
                          <form
                            onSubmit={handleQuickGym}
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                              Qual treino você fez hoje?
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {activeWorkouts.map((w) => {
                                const active = (selectedWorkoutId || activeWorkouts[0]?.id) === w.id;
                                return (
                                  <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setSelectedWorkoutId(w.id)}
                                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                                    style={{
                                      borderColor: active ? w.color : 'var(--border)',
                                      backgroundColor: active ? `${w.color}22` : 'var(--surface-2)',
                                      color: active ? w.color : 'var(--text)',
                                    }}
                                  >
                                    {w.code} · {w.name}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={5}
                                max={240}
                                value={workoutDuration}
                                onChange={(e) => setWorkoutDuration(e.target.value)}
                                className="w-20 rounded-lg border px-2 py-1.5 text-xs outline-none tabular-nums"
                                style={{
                                  backgroundColor: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                minutos
                              </span>
                            </div>
                            <button
                              type="submit"
                              className="w-full rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                              Registrar Treino Hoje (+35 XP)
                            </button>
                          </form>
                        )}

                        {isQuickOpen && item.quick === 'habits' && (
                          <div
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {activeHabits.map((h) => {
                                const done = Boolean(h.logs[today]);
                                return (
                                  <button
                                    key={h.id}
                                    type="button"
                                    onClick={() => toggleHabitLog(h.id, today)}
                                    className="flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer"
                                    style={{
                                      borderColor: done ? h.color : 'var(--border)',
                                      backgroundColor: done ? `${h.color}18` : 'var(--surface-2)',
                                    }}
                                  >
                                    <span className={done ? 'line-through opacity-80' : ''}>{h.title}</span>
                                    <span
                                      className="flex h-4 w-4 items-center justify-center rounded"
                                      style={{
                                        backgroundColor: done ? h.color : 'transparent',
                                        border: done ? 'none' : '1px solid var(--border)',
                                        color: '#03150e',
                                      }}
                                    >
                                      {done && <Check className="h-3 w-3" />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <form onSubmit={handleQuickHabit} className="flex gap-1.5">
                              <input
                                type="text"
                                value={newHabitTitle}
                                onChange={(e) => setNewHabitTitle(e.target.value)}
                                placeholder="Novo hábito..."
                                className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                                style={{
                                  backgroundColor: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                              <button
                                type="submit"
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
                                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                              >
                                Criar
                              </button>
                            </form>
                          </div>
                        )}

                        {isQuickOpen && item.quick === 'journal' && (
                          <form
                            onSubmit={handleQuickJournal}
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--muted)' }}>Humor</span>
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setMood(n)}
                                    className="h-6 w-6 rounded-md text-xs font-semibold cursor-pointer"
                                    style={{
                                      backgroundColor: mood === n ? 'var(--accent)' : 'var(--surface-2)',
                                      color: mood === n ? 'var(--accent-fg)' : 'var(--text)',
                                    }}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--muted)' }}>Energia</span>
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setEnergy(n)}
                                    className="h-6 w-6 rounded-md text-xs font-semibold cursor-pointer"
                                    style={{
                                      backgroundColor: energy === n ? 'var(--accent)' : 'var(--surface-2)',
                                      color: energy === n ? 'var(--accent-fg)' : 'var(--text)',
                                    }}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={journalNote}
                              onChange={(e) => setJournalNote(e.target.value)}
                              placeholder="Como está seu dia?"
                              className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none resize-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                              Salvar Diário
                            </button>
                          </form>
                        )}

                        {isQuickOpen && item.quick === 'goals' && (
                          <form
                            onSubmit={handleQuickGoal}
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <input
                              type="text"
                              value={goalTitle}
                              onChange={(e) => setGoalTitle(e.target.value)}
                              placeholder="Qual é a nova meta?"
                              className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                              autoFocus
                            />
                            <select
                              value={goalHorizon}
                              onChange={(e) => setGoalHorizon(e.target.value as 'short' | 'medium' | 'long')}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            >
                              <option value="short">Curto prazo</option>
                              <option value="medium">Médio prazo</option>
                              <option value="long">Longo prazo</option>
                            </select>
                            <button
                              type="submit"
                              className="w-full rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                              Criar Meta
                            </button>
                          </form>
                        )}

                        {isQuickOpen && item.quick === 'pomodoro' && (
                          <div
                            className="mt-1.5 mb-2 rounded-xl border p-3 space-y-2.5 animate-fade-in"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                          >
                            <select
                              value={pomoTaskId}
                              onChange={(e) => setPomoTaskId(e.target.value)}
                              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--surface-2)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            >
                              <option value="">Foco livre (sem tarefa)</option>
                              {pendingTasks.slice(0, 15).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleQuickPomodoro}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Iniciar {state.settings.pomodoro.focusMinutes} min agora
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer XP */}
        <div
          className="border-t px-4 py-3 text-xs"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium">
              Nível {gamification.level} · <span className="tabular-nums">{gamification.totalXp} XP</span>
            </span>
            <span style={{ color: 'var(--muted)' }} className="tabular-nums">
              🔥 {gamification.globalStreak} dias
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${gamification.progressPercent}%`, backgroundColor: 'var(--accent)' }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
};
