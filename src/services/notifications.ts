import { NotificationFrequency } from '../types';

/**
 * Horários dos lembretes de check-in.
 * Nenhum cai entre 13h e 14h59 (horário de almoço/descanso).
 */
export const NUDGE_SCHEDULES: Record<NotificationFrequency, string[]> = {
  low: ['09:30', '15:30', '19:30'], // 3 por dia
  medium: ['09:00', '11:30', '15:00', '17:30', '20:00'], // 5 por dia
  high: ['08:30', '10:00', '11:30', '12:30', '15:00', '16:30', '18:30', '20:30'], // 8 por dia
};

/** Horas sem cutucões (almoço). */
export const QUIET_HOURS = [13, 14];

// 1 vez por hora das 08h às 19h, exceto 13h e 14h
export const WATER_REMINDER_HOURS = [8, 9, 10, 11, 12, 15, 16, 17, 18, 19];

const NOTIF_LOG_KEY = 'boraxp_notif_log_v1';
const LAST_NUDGE_KEY = 'boraxp_last_nudge_msg';

const NUDGE_MESSAGES = [
  'Já concluiu?',
  'Oi?',
  'Tá pronto?',
  'Oi? E aquelas tarefas de hoje?',
  'Tá pronto ou tá enrolando? 👀',
  'Já concluiu? Seu heatmap tá te esperando.',
  'Ei! Bora ganhar mais XP hoje ⚡',
  'Oi? 5 minutinhos de foco já contam!',
  'Tá pronto pra marcar mais uma?',
];

/** Usadas quando não há nada pendente no dia. */
const PRAISE_MESSAGES = [
  'Mandou bem hoje! 🔥 Tudo concluído.',
  'Dia zerado! Seu heatmap agradece 💚',
  'Oi? Ah, você já fez tudo. Respeito ⚡',
  'Tá pronto? Tá sim — tudo feito hoje! 🏆',
  'Nada pendente. Aproveita o descanso 😎',
];

const WATER_MESSAGES = [
  'Hora de beber água! 💧',
  'Oi? Já bebeu água nessa hora? 💧',
  'Pausa rápida: um copo d’água agora!',
  'Hidratação = foco. Bebe água! 💧',
];

function pickAvoidingLast(pool: string[]): string {
  let last = '';
  try {
    last = localStorage.getItem(LAST_NUDGE_KEY) ?? '';
  } catch {
    last = '';
  }
  const candidates = pool.length > 1 ? pool.filter((m) => m !== last) : pool;
  const msg = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    localStorage.setItem(LAST_NUDGE_KEY, msg);
  } catch {
    // ignorar
  }
  return msg;
}

export interface NudgeContext {
  pendingTasks?: number;
  pendingHabits?: number;
}

export function getRandomNudgeMessage(ctx: NudgeContext = {}): { title: string; body: string } {
  const pendingTasks = ctx.pendingTasks ?? -1;
  const pendingHabits = ctx.pendingHabits ?? -1;

  // Tudo feito hoje -> mensagem de comemoração
  if (pendingTasks === 0 && pendingHabits <= 0) {
    return { title: 'BoraXP', body: pickAvoidingLast(PRAISE_MESSAGES) };
  }

  const pool = [...NUDGE_MESSAGES];
  if (pendingTasks > 0) {
    pool.push(
      `Oi? Você ainda tem ${pendingTasks} ${pendingTasks === 1 ? 'tarefa pendente' : 'tarefas pendentes'} hoje.`,
      `Já concluiu? Faltam ${pendingTasks} para zerar hoje.`
    );
  }
  if (pendingHabits > 0) {
    pool.push(`Tá pronto? Faltam ${pendingHabits} ${pendingHabits === 1 ? 'hábito' : 'hábitos'} hoje.`);
  }
  return { title: 'BoraXP', body: pickAvoidingLast(pool) };
}

export function getRandomWaterMessage(): { title: string; body: string } {
  const idx = Math.floor(Math.random() * WATER_MESSAGES.length);
  return {
    title: 'BoraXP · Água 💧',
    body: WATER_MESSAGES[idx],
  };
}

interface NotifLogStore {
  date: string;
  keys: string[];
}

function readNotifLog(today: string): NotifLogStore {
  try {
    const raw = localStorage.getItem(NOTIF_LOG_KEY);
    if (!raw) return { date: today, keys: [] };
    const parsed = JSON.parse(raw) as Partial<NotifLogStore>;
    if (parsed.date !== today || !Array.isArray(parsed.keys)) {
      return { date: today, keys: [] };
    }
    return { date: today, keys: parsed.keys };
  } catch {
    return { date: today, keys: [] };
  }
}

export function hasSentNotificationKey(key: string, today: string): boolean {
  return readNotifLog(today).keys.includes(key);
}

export function markNotificationKeySent(key: string, today: string): void {
  try {
    const store = readNotifLog(today);
    if (!store.keys.includes(key)) store.keys.push(key);
    localStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(store));
  } catch {
    // ignorar
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export interface LocalNotificationOptions {
  tag?: string;
  /** Botões da notificação (só funcionam via Service Worker no app instalado/produção) */
  actions?: { action: string; title: string }[];
  data?: Record<string, unknown>;
}

/**
 * Envia notificação. Usa o Service Worker quando disponível (fica na Central de Ações
 * do Windows e permite botões como "Bebi ✓"); senão cai para `new Notification`.
 */
export function sendLocalNotification(title: string, body: string, tagOrOptions?: string | LocalNotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const opts: LocalNotificationOptions =
    typeof tagOrOptions === 'string' ? { tag: tagOrOptions } : (tagOrOptions ?? {});

  const baseOptions = {
    body,
    tag: opts.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: opts.data,
  };

  const fallback = () => {
    try {
      const n = new Notification(title, baseOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // ignorar
    }
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(title, {
          ...baseOptions,
          ...(opts.actions ? { actions: opts.actions } : {}),
        } as NotificationOptions)
      )
      .catch(fallback);
    return;
  }
  fallback();
}

export function playSoftChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.11 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.42);
    });
  } catch {
    // Ignorar se áudio estiver bloqueado
  }
}
