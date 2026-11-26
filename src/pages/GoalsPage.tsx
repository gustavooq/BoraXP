import React, { useMemo, useState } from 'react';
import { Check, Minus, Plus, Target, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Goal } from '../types';
import { getGoalProgress } from '../services/analytics';

const HORIZON_LABEL: Record<Goal['horizon'], string> = {
  short: 'Curto prazo',
  medium: 'Médio prazo',
  long: 'Longo prazo',
};

export const GoalsPage: React.FC = () => {
  const { state, addGoal, toggleGoalMilestone, incrementGoalValue, updateGoal, deleteGoal } = useApp();

  const [horizonFilter, setHorizonFilter] = useState<'all' | Goal['horizon']>('all');
  const [title, setTitle] = useState('');
  const [horizon, setHorizon] = useState<Goal['horizon']>('short');
  const [progressMode, setProgressMode] = useState<Goal['progressMode']>('milestones');
  const [milestonesInput, setMilestonesInput] = useState('');
  const [targetValue, setTargetValue] = useState('12');
  const [unit, setUnit] = useState('livros');
  const [linkedProjectId, setLinkedProjectId] = useState('');

  const goals = useMemo(() => {
    return state.goals
      .filter((g) => !g.deletedAt)
      .filter((g) => (horizonFilter === 'all' ? true : g.horizon === horizonFilter));
  }, [state.goals, horizonFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addGoal({
      title,
      horizon,
      progressMode,
      milestones:
        progressMode === 'milestones'
          ? milestonesInput
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      targetValue: progressMode === 'numeric' ? Number(targetValue) || 10 : 10,
      unit: progressMode === 'numeric' ? unit : undefined,
      linkedProjectId: progressMode === 'linked' ? linkedProjectId || undefined : undefined,
    });
    setTitle('');
    setMilestonesInput('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            Metas & Marcos
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Metas por marcos, contagem numérica ou vinculadas a projetos (+100 XP ao concluir)
          </p>
        </div>

        <div
          className="flex gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          {(['all', 'short', 'medium', 'long'] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizonFilter(h)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: horizonFilter === h ? 'var(--accent-soft)' : 'transparent',
                color: horizonFilter === h ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {h === 'all' ? 'Todas' : HORIZON_LABEL[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Nova meta */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_160px]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da meta (ex: Ler 12 livros, Correr 5km)..."
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as Goal['horizon'])}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="short">Curto prazo</option>
            <option value="medium">Médio prazo</option>
            <option value="long">Longo prazo</option>
          </select>
          <select
            value={progressMode}
            onChange={(e) => setProgressMode(e.target.value as Goal['progressMode'])}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="milestones">Por Marcos (checklist)</option>
            <option value="numeric">Contagem Numérica</option>
            <option value="linked">Vinculada a Projeto</option>
          </select>
        </div>

        {progressMode === 'milestones' && (
          <input
            type="text"
            value={milestonesInput}
            onChange={(e) => setMilestonesInput(e.target.value)}
            placeholder="Marcos separados por vírgula (ex: Pesquisar tema, Escrever rascunho, Revisar)"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        )}

        {progressMode === 'numeric' && (
          <div className="grid grid-cols-2 gap-2 sm:w-80">
            <input
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Alvo"
              className="rounded-xl border px-3 py-2 text-xs outline-none tabular-nums"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unidade (ex: livros, km)"
              className="rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
        )}

        {progressMode === 'linked' && (
          <select
            value={linkedProjectId}
            onChange={(e) => setLinkedProjectId(e.target.value)}
            className="w-full sm:w-72 rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="">Escolha um projeto...</option>
            {state.projects
              .filter((p) => !p.deletedAt)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}

        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <Plus className="h-4 w-4" /> Criar Meta
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-8 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma meta criada neste horizonte.
          </div>
        ) : (
          goals.map((g) => {
            const prog = getGoalProgress(g, state);
            return (
              <div
                key={g.id}
                className="rounded-2xl border p-4 space-y-3"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
                      >
                        {HORIZON_LABEL[g.horizon]}
                      </span>
                      <h3 className="text-sm font-semibold">{g.title}</h3>
                    </div>
                    <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--muted)' }}>
                      {prog.label} · {prog.percent}%
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateGoal(g.id, { completed: !g.completed })}
                      className="rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer"
                      style={{
                        borderColor: g.completed ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: g.completed ? 'var(--accent-soft)' : 'var(--surface-2)',
                        color: g.completed ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {g.completed ? 'Concluída ✓' : 'Concluir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGoal(g.id)}
                      className="p-1.5 opacity-60 hover:opacity-100 cursor-pointer"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${prog.percent}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>

                {g.progressMode === 'milestones' && g.milestones.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {g.milestones.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleGoalMilestone(g.id, m.id)}
                        className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-left cursor-pointer"
                        style={{
                          borderColor: m.done ? 'var(--accent)' : 'var(--border)',
                          backgroundColor: 'var(--surface-2)',
                        }}
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded"
                          style={{
                            backgroundColor: m.done ? 'var(--accent)' : 'transparent',
                            border: m.done ? 'none' : '1px solid var(--border)',
                            color: 'var(--accent-fg)',
                          }}
                        >
                          {m.done && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className={m.done ? 'line-through opacity-75' : ''}>{m.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {g.progressMode === 'numeric' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => incrementGoalValue(g.id, -1)}
                      className="rounded-lg border p-1.5 cursor-pointer"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-semibold tabular-nums">
                      {g.currentValue} / {g.targetValue} {g.unit ?? ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementGoalValue(g.id, 1)}
                      className="rounded-lg border p-1.5 cursor-pointer"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
