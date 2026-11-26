import React, { useMemo } from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { PomodoroMode, useApp } from '../store/AppContext';
import { formatMinutes, todayKey } from '../utils/date';

export const PomodoroPage: React.FC = () => {
  const {
    state,
    pomodoro,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    switchPomodoroMode,
    setPomodoroTask,
    updateSettings,
  } = useApp();

  const today = todayKey();
  const pendingTasks = useMemo(
    () => state.tasks.filter((t) => !t.deletedAt && !t.completed),
    [state.tasks]
  );

  const todaySessions = useMemo(
    () => state.pomodoroSessions.filter((p) => p.date === today && p.mode === 'focus'),
    [state.pomodoroSessions, today]
  );

  const totalSeconds =
    pomodoro.mode === 'focus'
      ? state.settings.pomodoro.focusMinutes * 60
      : pomodoro.mode === 'shortBreak'
        ? state.settings.pomodoro.shortBreakMinutes * 60
        : state.settings.pomodoro.longBreakMinutes * 60;

  const progress = totalSeconds > 0 ? (totalSeconds - pomodoro.secondsLeft) / totalSeconds : 0;
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const mins = Math.floor(pomodoro.secondsLeft / 60);
  const secs = pomodoro.secondsLeft % 60;

  const modes: { id: PomodoroMode; label: string }[] = [
    { id: 'focus', label: `Foco (${state.settings.pomodoro.focusMinutes}m)` },
    { id: 'shortBreak', label: `Pausa Curta (${state.settings.pomodoro.shortBreakMinutes}m)` },
    { id: 'longBreak', label: `Pausa Longa (${state.settings.pomodoro.longBreakMinutes}m)` },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Timer className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          Foco (Pomodoro)
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Cada ciclo de foco concluído soma +25 XP e alimenta seu Heatmap
        </p>
      </div>

      <section
        className="rounded-2xl border p-6 flex flex-col items-center space-y-6"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Seletor de modo */}
        <div
          className="flex flex-wrap justify-center gap-1 rounded-xl border p-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
        >
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchPomodoroMode(m.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: pomodoro.mode === m.id ? 'var(--accent-soft)' : 'transparent',
                color: pomodoro.mode === m.id ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Relógio circular SVG */}
        <div className="relative flex h-56 w-56 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="10"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-5xl font-bold tracking-tight tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              Ciclo #{pomodoro.completedCycles + 1}
            </span>
          </div>
        </div>

        {/* Vincular tarefa */}
        <div className="w-full max-w-sm">
          <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
            Tarefa em foco
          </label>
          <select
            value={pomodoro.activeTaskId ?? ''}
            onChange={(e) => setPomodoroTask(e.target.value || null)}
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="">Foco livre (sem tarefa vinculada)</option>
            {pendingTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (pomodoro.isRunning ? pausePomodoro() : startPomodoro())}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {pomodoro.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {pomodoro.isRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            type="button"
            onClick={resetPomodoro}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </button>
        </div>
      </section>

      {/* Ajuste de tempos + Resumo do dia */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section
          className="rounded-2xl border p-4 space-y-3"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold">Duração dos Ciclos (min)</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                Foco
              </label>
              <input
                type="number"
                min={5}
                max={90}
                value={state.settings.pomodoro.focusMinutes}
                onChange={(e) =>
                  updateSettings({
                    pomodoro: {
                      ...state.settings.pomodoro,
                      focusMinutes: Math.max(5, Number(e.target.value) || 25),
                    },
                  })
                }
                className="w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none tabular-nums"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                Pausa curta
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={state.settings.pomodoro.shortBreakMinutes}
                onChange={(e) =>
                  updateSettings({
                    pomodoro: {
                      ...state.settings.pomodoro,
                      shortBreakMinutes: Math.max(1, Number(e.target.value) || 5),
                    },
                  })
                }
                className="w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none tabular-nums"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                Pausa longa
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={state.settings.pomodoro.longBreakMinutes}
                onChange={(e) =>
                  updateSettings({
                    pomodoro: {
                      ...state.settings.pomodoro,
                      longBreakMinutes: Math.max(5, Number(e.target.value) || 15),
                    },
                  })
                }
                className="w-full rounded-xl border px-2.5 py-1.5 text-xs outline-none tabular-nums"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.pomodoro.soundEnabled}
              onChange={(e) =>
                updateSettings({
                  pomodoro: { ...state.settings.pomodoro, soundEnabled: e.target.checked },
                })
              }
            />
            <span>Tocar alerta sonoro suave ao terminar</span>
          </label>
        </section>

        <section
          className="rounded-2xl border p-4 space-y-2"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold">Sessões de Hoje</h3>
          <p className="text-2xl font-bold tabular-nums">
            {todaySessions.length} ciclos ·{' '}
            <span style={{ color: 'var(--accent)' }}>
              {formatMinutes(todaySessions.reduce((a, b) => a + b.durationMinutes, 0))}
            </span>
          </p>
          <div className="space-y-1 max-h-28 overflow-y-auto text-xs" style={{ color: 'var(--muted)' }}>
            {todaySessions.map((s) => {
              const t = state.tasks.find((task) => task.id === s.taskId);
              return (
                <div key={s.id} className="flex justify-between">
                  <span className="truncate">{t ? t.title : 'Foco livre'}</span>
                  <span className="tabular-nums">{s.durationMinutes}m</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
