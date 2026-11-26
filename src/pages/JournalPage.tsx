import React, { useMemo, useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatLongDatePT, todayKey } from '../utils/date';

const MOOD_LABELS: Record<number, string> = {
  1: 'Exausto',
  2: 'Baixo',
  3: 'Neutro',
  4: 'Bom',
  5: 'Excelente',
};

export const JournalPage: React.FC = () => {
  const { state, saveJournalEntry, deleteJournalEntry } = useApp();
  const today = todayKey();

  const todayEntry = state.journalEntries.find((j) => !j.deletedAt && j.date === today);
  const [date, setDate] = useState(today);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(todayEntry?.mood ?? 4);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(todayEntry?.energy ?? 4);
  const [note, setNote] = useState(todayEntry?.note ?? '');
  const [gratitude, setGratitude] = useState(todayEntry?.gratitude ?? '');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const sortedEntries = useMemo(
    () => state.journalEntries.filter((j) => !j.deletedAt).sort((a, b) => b.date.localeCompare(a.date)),
    [state.journalEntries]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveJournalEntry({
      date,
      mood,
      energy,
      note: note || 'Registro do dia.',
      gratitude,
    });
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2200);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          Diário, Humor & Energia
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Registre como você se sentiu hoje para cruzar com sua produtividade (+15 XP)
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
              Humor ({MOOD_LABELS[mood]})
            </label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMood(n)}
                  className="flex-1 rounded-xl border py-2 text-xs font-semibold cursor-pointer"
                  style={{
                    borderColor: mood === n ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: mood === n ? 'var(--accent)' : 'var(--surface-2)',
                    color: mood === n ? 'var(--accent-fg)' : 'var(--text)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
              Energia ({energy}/5)
            </label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergy(n)}
                  className="flex-1 rounded-xl border py-2 text-xs font-semibold cursor-pointer"
                  style={{
                    borderColor: energy === n ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: energy === n ? 'var(--accent)' : 'var(--surface-2)',
                    color: energy === n ? 'var(--accent-fg)' : 'var(--text)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="O que marcou seu dia? Como foi seu foco e ritmo?"
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <input
          type="text"
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          placeholder="Uma vitória ou algo bom de hoje (opcional)..."
          className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Salvar Registro
          </button>
          {savedFeedback && (
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Registro salvo!
            </span>
          )}
        </div>
      </form>

      {/* Linha do tempo */}
      <div className="space-y-2.5">
        {sortedEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border p-4 space-y-1.5"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold capitalize">{formatLongDatePT(entry.date)}</span>
                <span
                  className="rounded-md px-2 py-0.5 tabular-nums"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--accent)' }}
                >
                  Humor {entry.mood}/5
                </span>
                <span
                  className="rounded-md px-2 py-0.5 tabular-nums"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
                >
                  Energia {entry.energy}/5
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteJournalEntry(entry.id)}
                className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: 'var(--muted)' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm">{entry.note}</p>
            {entry.gratitude && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Vitória: {entry.gratitude}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
