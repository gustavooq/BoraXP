/**
 * Sincronização opcional com Supabase (PC ⇄ celular).
 * O estado inteiro fica em uma linha por usuário (tabela `boraxp_states`) e é mesclado
 * registro a registro usando `updatedAt` — a alteração mais recente vence.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppState, DailyPlan } from '../types';

const CONFIG_KEY = 'boraxp_supabase_config';
export const SUPABASE_TABLE = 'boraxp_states';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupabaseConfig;
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch {
    // ignorar
  }
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey };
  return null;
}

export function saveSupabaseConfig(cfg: SupabaseConfig | null): void {
  if (!cfg) {
    localStorage.removeItem(CONFIG_KEY);
  } else {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: cfg.url.trim(), anonKey: cfg.anonKey.trim() }));
  }
  cachedClient = null;
  cachedKey = '';
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

/** Carrega o cliente Supabase sob demanda (não pesa no app se a nuvem não for usada). */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const key = `${cfg.url}|${cfg.anonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;
  const { createClient } = await import('@supabase/supabase-js');
  cachedClient = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'boraxp_supabase_auth' },
  });
  cachedKey = key;
  return cachedClient;
}

export async function pullRemoteState(client: SupabaseClient, userId: string): Promise<Partial<AppState> | null> {
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as Partial<AppState> | undefined) ?? null;
}

export async function pushRemoteState(client: SupabaseClient, userId: string, state: AppState): Promise<void> {
  const { error } = await client
    .from(SUPABASE_TABLE)
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

type Stampable = { updatedAt?: string; completedAt?: string | null; createdAt?: string };

function stamp(x: Stampable): string {
  return x.updatedAt || x.completedAt || x.createdAt || '';
}

function mergeById<T extends { id: string } & Stampable>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of a) map.set(item.id, item);
  for (const item of b) {
    const cur = map.get(item.id);
    if (!cur || stamp(item) > stamp(cur)) map.set(item.id, item);
  }
  return [...map.values()];
}

const byCreatedDesc = (x: { createdAt?: string }, y: { createdAt?: string }) =>
  (y.createdAt ?? '').localeCompare(x.createdAt ?? '');
const byCreatedAsc = (x: { createdAt?: string }, y: { createdAt?: string }) =>
  (x.createdAt ?? '').localeCompare(y.createdAt ?? '');

export function mergeStates(local: AppState, remote: AppState): AppState {
  const remoteIsNewer = (remote.updatedAt ?? '') > (local.updatedAt ?? '');

  const plansMap = new Map<string, DailyPlan>();
  for (const p of [...local.dailyPlans, ...remote.dailyPlans]) {
    const cur = plansMap.get(p.date);
    if (!cur || (p.completedAt ?? '') > (cur.completedAt ?? '')) plansMap.set(p.date, p);
  }

  const waterLogs: Record<string, number> = { ...local.waterLogs };
  for (const [date, glasses] of Object.entries(remote.waterLogs ?? {})) {
    waterLogs[date] = remoteIsNewer ? glasses : Math.max(waterLogs[date] ?? 0, glasses);
  }

  return {
    version: 1,
    updatedAt: remoteIsNewer ? remote.updatedAt : local.updatedAt,
    waterLogs,
    projects: mergeById(local.projects, remote.projects).sort(byCreatedAsc),
    tasks: mergeById(local.tasks, remote.tasks).sort(byCreatedDesc),
    habits: mergeById(local.habits, remote.habits).sort(byCreatedAsc),
    workoutTemplates: mergeById(local.workoutTemplates, remote.workoutTemplates).sort(byCreatedAsc),
    workoutSessions: mergeById(local.workoutSessions, remote.workoutSessions).sort(byCreatedDesc),
    pomodoroSessions: mergeById(
      local.pomodoroSessions.map((p) => ({ ...p })),
      remote.pomodoroSessions.map((p) => ({ ...p }))
    ).sort((x, y) => x.completedAt.localeCompare(y.completedAt)),
    goals: mergeById(local.goals, remote.goals).sort(byCreatedDesc),
    journalEntries: mergeById(local.journalEntries, remote.journalEntries).sort((x, y) => y.date.localeCompare(x.date)),
    dailyPlans: [...plansMap.values()].sort((x, y) => y.date.localeCompare(x.date)),
    weeklyReviews: mergeById(local.weeklyReviews, remote.weeklyReviews).sort((x, y) =>
      y.weekStart.localeCompare(x.weekStart)
    ),
    settings: remoteIsNewer ? remote.settings : local.settings,
  };
}

export const SUPABASE_SCHEMA_SQL = `-- BoraXP: rode uma vez no SQL Editor do Supabase
create table if not exists public.boraxp_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.boraxp_states enable row level security;

create policy "boraxp_select_own" on public.boraxp_states
  for select using (auth.uid() = user_id);
create policy "boraxp_insert_own" on public.boraxp_states
  for insert with check (auth.uid() = user_id);
create policy "boraxp_update_own" on public.boraxp_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
`;
