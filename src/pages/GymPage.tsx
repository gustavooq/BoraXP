import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Dumbbell,
  Pencil,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { GymWeeklyHeatmap } from '../components/GymWeeklyHeatmap';
import {
  getExerciseHistory,
  getExercisePR,
  getLastExerciseWeight,
  getNextWorkoutSuggestion,
} from '../services/analytics';
import { formatShortDatePT, todayKey } from '../utils/date';
import { createId } from '../utils/id';
import { WorkoutExercise, WorkoutExerciseLog } from '../types';

const WORKOUT_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#6366f1', '#f43f5e'];

export const GymPage: React.FC = () => {
  const {
    state,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    logWorkoutSession,
    deleteWorkoutSession,
    workoutChecks,
    toggleWorkoutCheck,
    clearWorkoutChecks,
    restTimer,
    startRestTimer,
    stopRestTimer,
  } = useApp();

  const templates = useMemo(
    () => state.workoutTemplates.filter((w) => !w.deletedAt),
    [state.workoutTemplates]
  );

  const suggested = useMemo(() => getNextWorkoutSuggestion(state), [state]);

  const [selectedId, setSelectedId] = useState<string>(suggested?.id ?? templates[0]?.id ?? '');
  const [creatingNew, setCreatingNew] = useState(false);

  // Novo treino (+)
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(WORKOUT_COLORS[3]);

  // Editar cabeçalho do treino atual (item 10)
  const [editingHeader, setEditingHeader] = useState(false);
  const [editTplCode, setEditTplCode] = useState('');
  const [editTplName, setEditTplName] = useState('');
  const [editTplColor, setEditTplColor] = useState('#10b981');

  // Editar exercício específico (item 9)
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExSets, setEditExSets] = useState('4');
  const [editExReps, setEditExReps] = useState('10-12');
  const [editExWeight, setEditExWeight] = useState('');

  // Evolução / Gráfico por exercício (item 8)
  const [historyExId, setHistoryExId] = useState<string | null>(null);

  // Cargas digitadas para a sessão atual (exerciseId -> string kg)
  const [sessionWeights, setSessionWeights] = useState<Record<string, string>>({});

  // Dados da sessão
  const [sessionDate, setSessionDate] = useState(todayKey());
  const [sessionDuration, setSessionDuration] = useState('55');
  const [sessionNotes, setSessionNotes] = useState('');
  const [loggedMsg, setLoggedMsg] = useState<string | null>(null);

  // Adicionar exercício ao treino selecionado
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('4');
  const [exReps, setExReps] = useState('10-12');
  const [exWeight, setExWeight] = useState('');

  useEffect(() => {
    if (!templates.some((t) => t.id === selectedId) && templates[0]) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const current = templates.find((t) => t.id === selectedId) ?? templates[0];
  const checkedExIds = current ? (workoutChecks[current.id] ?? []) : [];

  const handleOpenCreate = () => {
    const nextCharCode = 65 + templates.length;
    const suggestedCode =
      nextCharCode <= 90 ? String.fromCharCode(nextCharCode) : `T${templates.length + 1}`;
    setNewCode(suggestedCode);
    setNewName('');
    setNewColor(WORKOUT_COLORS[templates.length % WORKOUT_COLORS.length]);
    setCreatingNew(true);
    setEditingHeader(false);
  };

  const handleCreateWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    const created = addWorkoutTemplate({
      code: newCode,
      name: newName,
      color: newColor,
      exercises: [],
    });
    setSelectedId(created.id);
    setCreatingNew(false);
  };

  const handleStartEditHeader = () => {
    if (!current) return;
    setEditTplCode(current.code);
    setEditTplName(current.name);
    setEditTplColor(current.color);
    setEditingHeader(true);
  };

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !editTplCode.trim() || !editTplName.trim()) return;
    updateWorkoutTemplate(current.id, {
      code: editTplCode.trim().toUpperCase().slice(0, 4),
      name: editTplName.trim(),
      color: editTplColor,
    });
    setEditingHeader(false);
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !exName.trim()) return;
    const updated: WorkoutExercise[] = [
      ...current.exercises,
      {
        id: createId('ex'),
        name: exName.trim(),
        sets: Math.max(1, Number(exSets) || 3),
        reps: exReps.trim() || '10-12',
        weight: exWeight.trim() || undefined,
      },
    ];
    updateWorkoutTemplate(current.id, { exercises: updated });
    setExName('');
    setExWeight('');
  };

  const handleStartEditExercise = (ex: WorkoutExercise) => {
    setEditingExId(ex.id);
    setEditExName(ex.name);
    setEditExSets(String(ex.sets));
    setEditExReps(ex.reps);
    setEditExWeight(ex.weight ?? '');
  };

  const handleSaveEditExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !editingExId || !editExName.trim()) return;
    const updated = current.exercises.map((item) =>
      item.id === editingExId
        ? {
            ...item,
            name: editExName.trim(),
            sets: Math.max(1, Number(editExSets) || 3),
            reps: editExReps.trim() || '10-12',
            weight: editExWeight.trim() || undefined,
          }
        : item
    );
    updateWorkoutTemplate(current.id, { exercises: updated });
    setEditingExId(null);
  };

  const handleRemoveExercise = (exId: string) => {
    if (!current) return;
    updateWorkoutTemplate(current.id, {
      exercises: current.exercises.filter((e) => e.id !== exId),
    });
  };

  const handleFinishWorkout = () => {
    if (!current) return;
    const exerciseLogs: WorkoutExerciseLog[] = [];
    for (const ex of current.exercises) {
      const raw = sessionWeights[ex.id];
      const fallbackNum = ex.weight ? parseFloat(ex.weight.replace(',', '.')) : NaN;
      const val = raw !== undefined && raw.trim() !== '' ? parseFloat(raw.replace(',', '.')) : fallbackNum;
      if (!Number.isNaN(val) && val > 0) {
        exerciseLogs.push({ exerciseId: ex.id, name: ex.name, weightKg: val });
      }
    }

    const session = logWorkoutSession({
      templateId: current.id,
      date: sessionDate || todayKey(),
      durationMinutes: Number(sessionDuration) || undefined,
      notes: sessionNotes,
      completedExerciseIds:
        checkedExIds.length > 0 ? checkedExIds : current.exercises.map((e) => e.id),
      exerciseLogs: exerciseLogs.length > 0 ? exerciseLogs : undefined,
    });
    if (session) {
      clearWorkoutChecks(current.id);
      setSessionNotes('');
      setLoggedMsg(`Treino ${session.code} (${session.name}) concluído! +35 XP`);
      window.setTimeout(() => setLoggedMsg(null), 3000);
    }
  };

  const recentSessions = useMemo(
    () =>
      state.workoutSessions
        .filter((s) => !s.deletedAt)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [state.workoutSessions]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Dumbbell className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            Academia
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Treinos A, B, C, +, cargas com recordes (PR), timer de descanso e Heatmap Semanal
          </p>
        </div>

        {suggested && (
          <button
            type="button"
            onClick={() => {
              setSelectedId(suggested.id);
              setCreatingNew(false);
            }}
            className="self-start rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
            style={{
              borderColor: suggested.color,
              backgroundColor: `${suggested.color}18`,
              color: suggested.color,
            }}
          >
            Sugerido hoje: Treino {suggested.code} · {suggested.name}
          </button>
        )}
      </div>

      {/* Heatmap Semanal Exclusivo */}
      <GymWeeklyHeatmap />

      {/* Seletor de Treinos A, B, C, + */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {templates.map((tpl) => {
            const active = current?.id === tpl.id && !creatingNew;
            const isSuggested = suggested?.id === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setSelectedId(tpl.id);
                  setCreatingNew(false);
                  setEditingHeader(false);
                }}
                className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer"
                style={{
                  borderColor: active ? tpl.color : 'var(--border)',
                  backgroundColor: active ? `${tpl.color}20` : 'var(--surface-2)',
                  color: active ? tpl.color : 'var(--text)',
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold"
                  style={{ backgroundColor: tpl.color, color: '#03150e' }}
                >
                  {tpl.code}
                </span>
                <span>{tpl.name}</span>
                {isSuggested && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}
                  >
                    próx
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs font-semibold transition hover:opacity-90 cursor-pointer"
            style={{
              borderColor: creatingNew ? 'var(--accent)' : 'var(--border)',
              color: 'var(--accent)',
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Treino
          </button>
        </div>

        {/* Form Criar Novo Treino (+) */}
        {creatingNew && (
          <form
            onSubmit={handleCreateWorkout}
            className="rounded-xl border p-4 space-y-3 animate-fade-in"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Novo Treino</p>
              <button
                type="button"
                onClick={() => setCreatingNew(false)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr]">
              <input
                type="text"
                maxLength={4}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Ex: D"
                className="rounded-lg border px-3 py-2 text-sm font-bold uppercase outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome (ex: Ombros & Abdômen, Cardio)"
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Cor:
              </span>
              {WORKOUT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="h-6 w-6 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: c,
                    outline: newColor === c ? '2px solid var(--text)' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Criar Treino
            </button>
          </form>
        )}

        {/* Treino Atual */}
        {current && !creatingNew && (
          <div className="space-y-4">
            {/* Cabeçalho ou edição do cabeçalho (item 10) */}
            {editingHeader ? (
              <form
                onSubmit={handleSaveHeader}
                className="rounded-xl border p-3.5 space-y-3 animate-fade-in"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[90px_1fr]">
                  <input
                    type="text"
                    maxLength={4}
                    value={editTplCode}
                    onChange={(e) => setEditTplCode(e.target.value.toUpperCase())}
                    className="rounded-lg border px-3 py-1.5 text-sm font-bold uppercase outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <input
                    type="text"
                    value={editTplName}
                    onChange={(e) => setEditTplName(e.target.value)}
                    className="rounded-lg border px-3 py-1.5 text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      Cor:
                    </span>
                    {WORKOUT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditTplColor(c)}
                        className="h-5 w-5 rounded-full cursor-pointer"
                        style={{
                          backgroundColor: c,
                          outline: editTplColor === c ? '2px solid var(--text)' : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingHeader(false)}
                      className="rounded-lg border px-3 py-1 text-xs cursor-pointer"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ backgroundColor: current.color, color: '#03150e' }}
                  >
                    {current.code}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{current.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {current.exercises.length} exercícios · checks ficam salvos mesmo se mudar de tela
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleStartEditHeader}
                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition hover:opacity-80 cursor-pointer"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    title="Editar nome e cor do treino"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  {templates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteWorkoutTemplate(current.id)}
                      className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition hover:opacity-80 cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      title="Remover treino"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Timer de descanso entre séries (item 12) */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            >
              <div className="flex items-center gap-2 text-xs">
                <Timer className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                <span className="font-medium">Descanso entre séries:</span>
                {restTimer.isRunning ? (
                  <span className="font-bold tabular-nums text-sm" style={{ color: 'var(--accent)' }}>
                    {Math.floor(restTimer.secondsLeft / 60)}:
                    {String(restTimer.secondsLeft % 60).padStart(2, '0')}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>parado</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {[60, 90, 120].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => startRestTimer(sec)}
                    className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold tabular-nums cursor-pointer"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
                  >
                    {sec}s
                  </button>
                ))}
                {restTimer.isRunning && (
                  <button
                    type="button"
                    onClick={stopRestTimer}
                    className="rounded-lg border px-2 py-1 text-[11px] cursor-pointer"
                    style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
                    title="Parar descanso"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Exercícios */}
            <div className="space-y-2">
              {current.exercises.length === 0 ? (
                <p className="text-xs py-3" style={{ color: 'var(--muted)' }}>
                  Nenhum exercício adicionado neste treino ainda. Adicione abaixo!
                </p>
              ) : (
                current.exercises.map((ex) => {
                  const checked = checkedExIds.includes(ex.id);
                  const pr = getExercisePR(state, ex.id);
                  const lastW = getLastExerciseWeight(state, ex.id);
                  const isEditingThis = editingExId === ex.id;
                  const showHistory = historyExId === ex.id;
                  const hist = showHistory ? getExerciseHistory(state, ex.id) : [];

                  if (isEditingThis) {
                    return (
                      <form
                        key={ex.id}
                        onSubmit={handleSaveEditExercise}
                        className="rounded-xl border p-3 space-y-2 animate-fade-in"
                        style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--surface-2)' }}
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_70px_90px_100px]">
                          <input
                            type="text"
                            value={editExName}
                            onChange={(e) => setEditExName(e.target.value)}
                            className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            autoFocus
                          />
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={editExSets}
                            onChange={(e) => setEditExSets(e.target.value)}
                            className="rounded-lg border px-2 py-1.5 text-xs outline-none tabular-nums"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                          <input
                            type="text"
                            value={editExReps}
                            onChange={(e) => setEditExReps(e.target.value)}
                            className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                          <input
                            type="text"
                            value={editExWeight}
                            onChange={(e) => setEditExWeight(e.target.value)}
                            placeholder="Carga ref."
                            className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingExId(null)}
                            className="rounded-lg border px-2.5 py-1 text-xs cursor-pointer"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                          >
                            Salvar
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={ex.id}
                      className="rounded-xl border px-3 py-2.5 space-y-2"
                      style={{
                        borderColor: checked ? current.color : 'var(--border)',
                        backgroundColor: checked ? `${current.color}15` : 'var(--surface-2)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleWorkoutCheck(current.id, ex.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border cursor-pointer"
                          style={{
                            borderColor: checked ? current.color : 'var(--border)',
                            backgroundColor: checked ? current.color : 'transparent',
                            color: '#03150e',
                          }}
                        >
                          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-[160px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-medium ${checked ? 'line-through opacity-75' : ''}`}>
                              {ex.name}
                            </p>
                            {pr !== null && (
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                                title="Recorde pessoal"
                              >
                                <Trophy className="h-2.5 w-2.5" /> PR {pr}kg
                              </span>
                            )}
                          </div>
                          <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                            {ex.sets} séries × {ex.reps}
                            {ex.weight ? ` · ${ex.weight}` : ''}
                            {lastW !== null ? ` · último: ${lastW}kg` : ''}
                          </p>
                        </div>

                        {/* Carga usada hoje (kg) */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            value={sessionWeights[ex.id] ?? (lastW !== null ? String(lastW) : '')}
                            onChange={(e) =>
                              setSessionWeights((prev) => ({ ...prev, [ex.id]: e.target.value }))
                            }
                            placeholder="kg"
                            className="w-16 rounded-lg border px-2 py-1 text-xs outline-none tabular-nums text-center"
                            style={{
                              backgroundColor: 'var(--bg)',
                              borderColor: 'var(--border)',
                              color: 'var(--text)',
                            }}
                            title="Carga usada hoje (kg)"
                          />
                          <button
                            type="button"
                            onClick={() => setHistoryExId(showHistory ? null : ex.id)}
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
                            style={{ color: showHistory ? 'var(--accent)' : 'var(--muted)' }}
                            title="Ver evolução de carga"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditExercise(ex)}
                            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                            style={{ color: 'var(--muted)' }}
                            title="Editar exercício"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                            style={{ color: 'var(--muted)' }}
                            title="Remover exercício"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Gráfico simples de evolução de carga */}
                      {showHistory && (
                        <div
                          className="rounded-lg border p-2.5 text-xs animate-fade-in"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                        >
                          {hist.length === 0 ? (
                            <p style={{ color: 'var(--muted)' }}>
                              Sem histórico de carga ainda. Preencha os kg e conclua o treino para começar a acompanhar!
                            </p>
                          ) : (
                            <div>
                              <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
                                Evolução de carga ({hist.length} registros)
                              </p>
                              <div className="flex h-16 items-end gap-1.5">
                                {hist.slice(-10).map((pt, i) => {
                                  const maxW = Math.max(1, ...hist.slice(-10).map((p) => p.weightKg));
                                  const pct = Math.round((pt.weightKg / maxW) * 100);
                                  return (
                                    <div key={i} className="flex flex-1 flex-col items-center gap-0.5 h-full justify-end">
                                      <span className="text-[9px] tabular-nums" style={{ color: 'var(--muted)' }}>
                                        {pt.weightKg}
                                      </span>
                                      <div
                                        className="w-full rounded-t"
                                        style={{
                                          height: `${Math.max(15, pct * 0.65)}%`,
                                          backgroundColor: current.color,
                                        }}
                                        title={`${formatShortDatePT(pt.date)}: ${pt.weightKg}kg`}
                                      />
                                      <span className="text-[9px] tabular-nums" style={{ color: 'var(--muted)' }}>
                                        {pt.date.slice(8)}/{pt.date.slice(5, 7)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Adicionar Exercício */}
            <form
              onSubmit={handleAddExercise}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_72px_90px_100px_auto]"
            >
              <input
                type="text"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                placeholder="Novo exercício..."
                className="rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="number"
                min={1}
                max={20}
                value={exSets}
                onChange={(e) => setExSets(e.target.value)}
                placeholder="Séries"
                className="rounded-xl border px-2.5 py-2 text-xs outline-none tabular-nums"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="text"
                value={exReps}
                onChange={(e) => setExReps(e.target.value)}
                placeholder="Reps"
                className="rounded-xl border px-2.5 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="text"
                value={exWeight}
                onChange={(e) => setExWeight(e.target.value)}
                placeholder="Carga (opc.)"
                className="rounded-xl border px-2.5 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                type="submit"
                className="rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
              >
                + Exercício
              </button>
            </form>

            {/* Concluir & Registrar Treino */}
            <div
              className="rounded-xl border p-3.5 space-y-3"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                    Data do treino
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none tabular-nums"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                    Observação rápida
                  </label>
                  <input
                    type="text"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Ex: Aumentei carga no supino"
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: current.color, color: '#03150e' }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir Treino {current.code} (+35 XP)
                </button>

                {loggedMsg && (
                  <span className="text-xs font-medium animate-fade-in" style={{ color: 'var(--accent)' }}>
                    {loggedMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Histórico recente */}
      <section
        className="rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3">Histórico Recente de Treinos</h3>
        {recentSessions.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Nenhum treino registrado ainda. Conclua um treino acima para acender o Heatmap semanal!
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold"
                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {s.code}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {s.name}
                      {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                      {formatShortDatePT(s.date)}
                      {s.exerciseLogs && s.exerciseLogs.length > 0
                        ? ` · ${s.exerciseLogs.length} cargas salvas`
                        : ''}
                      {s.notes ? ` — ${s.notes}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteWorkoutSession(s.id)}
                  className="p-1.5 opacity-60 hover:opacity-100 cursor-pointer"
                  style={{ color: 'var(--muted)' }}
                  title="Excluir registro"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
