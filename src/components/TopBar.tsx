import React, { useEffect, useRef, useState } from 'react';
import { BellOff, Flame, MoreVertical, Pause, Play, Timer, Zap } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { PageId } from '../types';

const PAGE_LABELS: Record<PageId, string> = {
  dashboard: 'Dashboard',
  myday: 'Meu Dia',
  projects: 'Projetos & Tarefas',
  calendar: 'Calendário',
  gym: 'Academia',
  pomodoro: 'Foco (Pomodoro)',
  habits: 'Hábitos',
  goals: 'Metas',
  journal: 'Diário',
  planning: 'Planejamento & Revisão',
  stats: 'Estatísticas & XP',
  settings: 'Configurações',
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TopBar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    openDrawer,
    gamification,
    pomodoro,
    startPomodoro,
    pausePomodoro,
    state,
    isDndActive,
    setDndMinutes,
  } = useApp();

  const baseSeconds =
    pomodoro.mode === 'focus'
      ? state.settings.pomodoro.focusMinutes * 60
      : pomodoro.mode === 'shortBreak'
        ? state.settings.pomodoro.shortBreakMinutes * 60
        : state.settings.pomodoro.longBreakMinutes * 60;

  const showPomodoroPill = pomodoro.isRunning || pomodoro.secondsLeft !== baseSeconds;

  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pastHalf = scrollable > 120 && y > scrollable * 0.5;
      const goingDown = y > lastYRef.current + 6;
      const goingUp = y < lastYRef.current - 6;

      if (!pastHalf) {
        setHidden(false);
      } else if (goingDown) {
        setHidden(true);
      } else if (goingUp) {
        setHidden(false);
      }
      lastYRef.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setHidden(false);
  }, [activePage]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 border-b backdrop-blur-md transition-transform duration-200 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          borderColor: 'var(--border)',
          backgroundColor: 'color-mix(in srgb, var(--bg) 88%, transparent)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:opacity-85 cursor-pointer"
            title="Ir para o Dashboard"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Zap className="h-4 w-4 fill-current" />
            </span>
            <span className="text-sm font-semibold tracking-tight">BoraXP</span>
          </button>

          {activePage !== 'dashboard' && (
            <>
              <span className="text-xs" style={{ color: 'var(--border)' }}>
                /
              </span>
              <span className="truncate text-sm font-medium" style={{ color: 'var(--muted)' }}>
                {PAGE_LABELS[activePage]}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showPomodoroPill && (
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <button
                type="button"
                onClick={() => setActivePage('pomodoro')}
                className="flex items-center gap-1.5 cursor-pointer"
                title="Abrir Pomodoro"
              >
                <Timer className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                <span>{formatClock(pomodoro.secondsLeft)}</span>
              </button>
              <button
                type="button"
                onClick={() => (pomodoro.isRunning ? pausePomodoro() : startPomodoro())}
                className="ml-0.5 rounded-full p-0.5 hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--accent)' }}
                aria-label={pomodoro.isRunning ? 'Pausar Pomodoro' : 'Retomar Pomodoro'}
              >
                {pomodoro.isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
            </div>
          )}

          {isDndActive && (
            <button
              type="button"
              onClick={() => setDndMinutes(null)}
              className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium cursor-pointer"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
              }}
              title="Não perturbe ativo · clique para reativar notificações"
            >
              <BellOff className="h-3 w-3" />
              <span className="hidden sm:inline">Silencioso</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActivePage('stats')}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full border px-2 sm:px-2.5 py-1 text-xs font-medium tabular-nums transition hover:opacity-90 cursor-pointer"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
            }}
            title="Ver Estatísticas & XP"
          >
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              {gamification.globalStreak}d
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ color: 'var(--accent)' }}>Nv.{gamification.level}</span>
          </button>

          <button
            type="button"
            onClick={() => openDrawer(null)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer touch-manipulation"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
            }}
            aria-label="Abrir menu lateral e preenchimento rápido"
            title="Menu & Preencher rápido (⋮)"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      </header>
      <div
        aria-hidden="true"
        className="shrink-0"
        style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      />
    </>
  );
};
