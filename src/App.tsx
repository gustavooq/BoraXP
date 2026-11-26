import React from 'react';
import { RotateCcw, X, Zap } from 'lucide-react';
import { AppProvider, useApp } from './store/AppContext';
import { TopBar } from './components/TopBar';
import { SideDrawer } from './components/SideDrawer';
import { DashboardPage } from './pages/DashboardPage';
import { MyDayPage } from './pages/MyDayPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GymPage } from './pages/GymPage';
import { PomodoroPage } from './pages/PomodoroPage';
import { HabitsPage } from './pages/HabitsPage';
import { GoalsPage } from './pages/GoalsPage';
import { JournalPage } from './pages/JournalPage';
import { PlanningPage } from './pages/PlanningPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';

const FloatingFeedback: React.FC = () => {
  const { undoToast, executeUndo, dismissUndo, xpToast, dismissXpToast } = useApp();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 left-4 sm:left-auto z-40 flex flex-col items-end gap-2">
      {xpToast && (
        <div
          key={xpToast.id}
          onClick={dismissXpToast}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-lg animate-fade-in cursor-pointer"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
          }}
        >
          <Zap className="h-3.5 w-3.5 fill-current" />
          <span>{xpToast.headline}</span>
          {xpToast.subline && (
            <span className="font-normal" style={{ color: 'var(--muted)' }}>
              · {xpToast.subline}
            </span>
          )}
        </div>
      )}

      {undoToast && (
        <div
          key={undoToast.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs shadow-xl animate-fade-in"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          <span className="truncate max-w-[220px]">{undoToast.message}</span>
          <button
            type="button"
            onClick={executeUndo}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <RotateCcw className="h-3 w-3" />
            Desfazer
          </button>
          <button
            type="button"
            onClick={dismissUndo}
            className="p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

const AppShell: React.FC = () => {
  const { activePage } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'myday':
        return <MyDayPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'gym':
        return <GymPage />;
      case 'pomodoro':
        return <PomodoroPage />;
      case 'habits':
        return <HabitsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'journal':
        return <JournalPage />;
      case 'planning':
        return <PlanningPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {renderPage()}
      </main>
      <SideDrawer />
      <FloatingFeedback />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
