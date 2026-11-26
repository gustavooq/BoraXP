import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Cloud,
  Copy,
  Download,
  Droplets,
  FolderOpen,
  LogOut,
  Palette,
  RefreshCw,
  RotateCcw,
  Settings,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { AccentColor, NotificationFrequency, ThemeMode } from '../types';
import {
  getNotificationPermission,
  getRandomNudgeMessage,
  getRandomWaterMessage,
  NUDGE_SCHEDULES,
  requestNotificationPermission,
  sendLocalNotification,
} from '../services/notifications';
import {
  BackupFolderStatus,
  forgetBackupFolder,
  getBackupFolderStatus,
  getLastBackupDate,
  isAutoBackupSupported,
  pickBackupFolder,
  requestBackupPermission,
  writeBackupToFolder,
} from '../services/backup';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  SUPABASE_SCHEMA_SQL,
} from '../services/sync';
import { todayKey } from '../utils/date';

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'dark', label: 'Dark Minimalista' },
  { id: 'oled', label: 'OLED Preto' },
  { id: 'light', label: 'Claro' },
];

const ACCENTS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'emerald', label: 'Esmeralda', hex: '#10b981' },
  { id: 'indigo', label: 'Índigo', hex: '#6366f1' },
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { id: 'cyan', label: 'Ciano', hex: '#06b6d4' },
  { id: 'rose', label: 'Rosa', hex: '#f43f5e' },
];

const NOTIFICATION_FREQUENCIES: { id: NotificationFrequency; label: string; sub: string }[] = [
  { id: 'low', label: 'Poucas notificações', sub: '3 por dia' },
  { id: 'medium', label: 'Médias', sub: '5 por dia' },
  { id: 'high', label: 'Altas', sub: '8 por dia' },
];

export const SettingsPage: React.FC = () => {
  const {
    state,
    updateSettings,
    canInstallPwa,
    installPwa,
    exportBackup,
    importBackup,
    resetAllData,
    isDndActive,
    setDndMinutes,
    syncUserEmail,
    syncStatus,
    syncError,
    signInSupabase,
    signUpSupabase,
    signOutSupabase,
    syncNow,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [permState, setPermState] = useState(() => getNotificationPermission());

  // Backup em pasta
  const [folderStatus, setFolderStatus] = useState<BackupFolderStatus>({ name: null, permission: 'none' });
  const [lastBackupDate, setLastBackupDateState] = useState<string | null>(() => getLastBackupDate());

  // Supabase
  const initialCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(initialCfg?.url ?? '');
  const [sbKey, setSbKey] = useState(initialCfg?.anonKey ?? '');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    getBackupFolderStatus().then(setFolderStatus);
  }, []);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleEnableNotifications = async () => {
    if (state.settings.notificationsEnabled && permState === 'granted') {
      updateSettings({ notificationsEnabled: false });
      showStatus('Notificações gerais pausadas.');
      return;
    }
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res === 'granted') {
      updateSettings({ notificationsEnabled: true });
      const msg = getRandomNudgeMessage();
      sendLocalNotification(msg.title, msg.body);
      showStatus('Notificações ativadas!');
    } else {
      updateSettings({ notificationsEnabled: false });
      showStatus('Permissão de notificação negada ou indisponível no navegador.');
    }
  };

  const handleSelectFrequency = async (freq: NotificationFrequency) => {
    if (!state.settings.notificationsEnabled) {
      const res = await requestNotificationPermission();
      setPermState(res);
      if (res === 'granted') {
        updateSettings({ notificationFrequency: freq, notificationsEnabled: true });
        showStatus(`Frequência definida: ${NOTIFICATION_FREQUENCIES.find((f) => f.id === freq)?.sub}.`);
        return;
      }
    }
    updateSettings({ notificationFrequency: freq });
    showStatus(`Frequência definida: ${NOTIFICATION_FREQUENCIES.find((f) => f.id === freq)?.sub}.`);
  };

  const handleTestNudge = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res !== 'granted') {
      showStatus('Permita as notificações no navegador para testar.');
      return;
    }
    const pendingTasks = state.tasks.filter((t) => !t.deletedAt && !t.completed).length;
    const msg = getRandomNudgeMessage({ pendingTasks });
    sendLocalNotification(msg.title, msg.body);
    showStatus(`Enviada: "${msg.body}"`);
  };

  const handleToggleWaterReminder = async () => {
    const next = !state.settings.waterReminderEnabled;
    if (next) {
      const res = await requestNotificationPermission();
      setPermState(res);
      if (res !== 'granted') {
        showStatus('Permita as notificações no navegador para ativar o lembrete de água.');
        return;
      }
    }
    updateSettings({ waterReminderEnabled: next });
    showStatus(next ? 'Lembrete de água ligado (08h–19h, exceto 13h e 14h).' : 'Lembrete de água desligado.');
  };

  const handleTestWater = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res !== 'granted') {
      showStatus('Permita as notificações no navegador para testar.');
      return;
    }
    const msg = getRandomWaterMessage();
    sendLocalNotification(msg.title, msg.body, {
      actions: [{ action: 'drink', title: 'Bebi ✓' }],
    });
    showStatus(`Enviada: "${msg.body}"`);
  };

  const handlePickBackupFolder = async () => {
    try {
      const name = await pickBackupFolder();
      if (!name) return;
      const ok = await writeBackupToFolder(exportBackup(), todayKey());
      setFolderStatus(await getBackupFolderStatus());
      setLastBackupDateState(getLastBackupDate());
      showStatus(ok ? `Backup automático ativado na pasta "${name}"!` : `Pasta "${name}" selecionada.`);
    } catch {
      showStatus('Seleção de pasta cancelada.');
    }
  };

  const handleRunFolderBackupNow = async () => {
    try {
      const okPerm = await requestBackupPermission();
      if (!okPerm) {
        showStatus('Permissão negada para gravar na pasta.');
        return;
      }
      const ok = await writeBackupToFolder(exportBackup(), todayKey());
      setFolderStatus(await getBackupFolderStatus());
      setLastBackupDateState(getLastBackupDate());
      if (ok) showStatus('Backup salvo na pasta agora!');
    } catch {
      showStatus('Erro ao gravar backup na pasta.');
    }
  };

  const handleForgetFolder = async () => {
    await forgetBackupFolder();
    setFolderStatus({ name: null, permission: 'none' });
    showStatus('Pasta de backup automático removida.');
  };

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boraxp-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Backup exportado!');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackup(text);
      showStatus('Backup restaurado com sucesso!');
    } catch {
      showStatus('Erro: arquivo JSON inválido.');
    }
    e.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja zerar todos os dados do BoraXP?')) {
      resetAllData();
      showStatus('Dados restaurados para o padrão inicial.');
    }
  };

  const handleSaveSupabaseCfg = () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      saveSupabaseConfig(null);
      showStatus('Configuração do Supabase removida.');
      return;
    }
    saveSupabaseConfig({ url: sbUrl, anonKey: sbKey });
    showStatus('Configuração do Supabase salva!');
  };

  const handleSupabaseLogin = async (mode: 'signin' | 'signup') => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      showStatus('Preencha a URL e a Chave Anon do Supabase.');
      return;
    }
    saveSupabaseConfig({ url: sbUrl, anonKey: sbKey });
    setAuthBusy(true);
    try {
      if (mode === 'signin') {
        await signInSupabase(authEmail, authPass);
        showStatus('Conectado e sincronizado com a nuvem!');
      } else {
        const msg = await signUpSupabase(authEmail, authPass);
        showStatus(msg);
      }
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Erro na autenticação');
    } finally {
      setAuthBusy(false);
    }
  };

  const minutesUntilTomorrow = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
    return Math.max(15, Math.round((tomorrow.getTime() - now.getTime()) / 60000));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          Configurações
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Temas, widgets do Dashboard, notificações, backup automático e nuvem Supabase
        </p>
      </div>

      {statusMsg && (
        <div
          className="rounded-xl border px-3.5 py-2.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--accent-soft)',
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Aparência */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Tema & Cor de Destaque
        </h2>

        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateSettings({ theme: t.id })}
              className="rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer"
              style={{
                borderColor: state.settings.theme === t.id ? 'var(--accent)' : 'var(--border)',
                backgroundColor: state.settings.theme === t.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: state.settings.theme === t.id ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => updateSettings({ accent: a.id })}
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                borderColor: state.settings.accent === a.id ? a.hex : 'var(--border)',
                backgroundColor: 'var(--surface-2)',
              }}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.hex }} />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* Widgets do Dashboard */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold">Widgets na Primeira Tela (Dashboard)</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['gym', 'Academia da Semana'],
              ['water', 'Água Hoje (Bebi ✓)'],
              ['habits', 'Hábitos de Hoje'],
              ['pomodoro', 'Foco Hoje (Pomodoro)'],
              ['journal', 'Humor & Energia'],
              ['goals', 'Metas em Andamento'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={state.settings.dashboardWidgets[key]}
                onChange={(e) =>
                  updateSettings({
                    dashboardWidgets: {
                      ...state.settings.dashboardWidgets,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>

      {/* Notificações & PWA */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Notificações & Aplicativo (PWA)
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="rounded-xl border px-3.5 py-2 text-xs font-semibold cursor-pointer"
            style={{
              borderColor: state.settings.notificationsEnabled && permState === 'granted' ? 'var(--accent)' : 'var(--border)',
              backgroundColor: state.settings.notificationsEnabled && permState === 'granted' ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: state.settings.notificationsEnabled && permState === 'granted' ? 'var(--accent)' : 'var(--text)',
            }}
          >
            {state.settings.notificationsEnabled && permState === 'granted'
              ? 'Notificações Ativas ✓ (Clique para pausar)'
              : 'Ativar Notificações'}
          </button>

          <button
            type="button"
            onClick={handleTestNudge}
            className="rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            Testar estilo
          </button>
        </div>

        {/* Frequência */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Frequência dos lembretes diários (“Já concluiu?”, “Oi?”, “Tá pronto?” — pula 13h–14h)
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {NOTIFICATION_FREQUENCIES.map((opt) => {
              const active = state.settings.notificationFrequency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectFrequency(opt.id)}
                  className="flex flex-col items-start rounded-xl border px-3.5 py-2.5 text-left transition cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: active ? 'var(--accent)' : 'var(--text)' }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
            Horários previstos: {NUDGE_SCHEDULES[state.settings.notificationFrequency].join(' · ')}
          </p>
        </div>

        {/* Lembrete beber água 08h às 19h (exceto 13h e 14h) */}
        <div
          className="rounded-xl border p-3.5 space-y-3"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Droplets className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Lembrete de beber água (08h às 19h)</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  1 vez por hora das 08h às 19h, exceto às 13h e 14h.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleTestWater}
                className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              >
                Testar
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={state.settings.waterReminderEnabled}
                onClick={handleToggleWaterReminder}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                style={{
                  borderColor: state.settings.waterReminderEnabled ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: state.settings.waterReminderEnabled ? 'var(--accent)' : 'var(--bg)',
                  color: state.settings.waterReminderEnabled ? 'var(--accent-fg)' : 'var(--muted)',
                }}
              >
                {state.settings.waterReminderEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Meta diária de água (copos):</span>
            <div className="flex items-center gap-1">
              {[6, 8, 10, 12].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateSettings({ waterGoal: g })}
                  className="h-6 px-2 rounded-md text-[11px] font-semibold tabular-nums cursor-pointer"
                  style={{
                    backgroundColor: (state.settings.waterGoal || 8) === g ? 'var(--accent)' : 'var(--bg)',
                    color: (state.settings.waterGoal || 8) === g ? 'var(--accent-fg)' : 'var(--muted)',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modo Não Perturbe (item 16) */}
        <div
          className="flex flex-col gap-2.5 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
        >
          <div className="flex items-center gap-2 text-xs">
            <BellOff className="h-4 w-4" style={{ color: isDndActive ? 'var(--accent)' : 'var(--muted)' }} />
            <div>
              <p className="font-semibold">Modo Não Perturbe</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {isDndActive && state.settings.dndUntil
                  ? `Silenciado até ${new Date(state.settings.dndUntil).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Pausa temporariamente todas as notificações'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isDndActive ? (
              <button
                type="button"
                onClick={() => {
                  setDndMinutes(null);
                  showStatus('Modo Não Perturbe desativado.');
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Reativar agora
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDndMinutes(60);
                    showStatus('Silenciado por 1 hora.');
                  }}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  1h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDndMinutes(120);
                    showStatus('Silenciado por 2 horas.');
                  }}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  2h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDndMinutes(minutesUntilTomorrow());
                    showStatus('Silenciado até amanhã às 08h.');
                  }}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  Até amanhã
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          {canInstallPwa ? (
            <button
              type="button"
              onClick={installPwa}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Instalar BoraXP como App
            </button>
          ) : (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Para instalar: no Chrome/Edge clique no ícone de instalar na barra de endereço (ou “Adicionar à tela inicial” no celular).
            </span>
          )}
        </div>
      </section>

      {/* Backup Automático & Manual (item 6) */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FolderOpen className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Backup Automático & Manual
        </h2>

        {isAutoBackupSupported() && (
          <div
            className="rounded-xl border p-3.5 space-y-2.5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-semibold">
                  {folderStatus.name
                    ? `Pasta vinculada: ${folderStatus.name}`
                    : 'Backup automático diário em pasta do PC'}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {lastBackupDate
                    ? `Último backup automático: ${lastBackupDate} (mantém os últimos 14 dias)`
                    : 'Escolha uma pasta (ex: Documentos/Backups BoraXP) para salvar automaticamente todo dia.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handlePickBackupFolder}
                  className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  {folderStatus.name ? 'Trocar pasta' : 'Escolher pasta'}
                </button>
                {folderStatus.name && (
                  <>
                    <button
                      type="button"
                      onClick={handleRunFolderBackupNow}
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Salvar agora
                    </button>
                    <button
                      type="button"
                      onClick={handleForgetFolder}
                      className="rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      Desvincular
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Backup JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            <Upload className="h-3.5 w-3.5" />
            Importar Backup JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetar Dados
          </button>
        </div>
      </section>

      {/* Sincronização na Nuvem (Supabase — item 22) */}
      <section
        className="rounded-2xl border p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            Sincronização na Nuvem (Supabase)
          </h2>
          {syncUserEmail && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {syncStatus === 'syncing'
                ? 'Sincronizando...'
                : syncStatus === 'error'
                  ? 'Erro na nuvem'
                  : 'Sincronizado ✓'}
            </span>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Conecte seu projeto gratuito do Supabase para sincronizar tarefas, academia, hábitos e XP entre PC e celular.
        </p>

        {syncError && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>
            {syncError}
          </p>
        )}

        {syncUserEmail ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
          >
            <div>
              <p className="font-semibold">Conectado como {syncUserEmail}</p>
              {state.settings.syncConfig.lastSyncedAt && (
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  Última sincronização:{' '}
                  {new Date(state.settings.syncConfig.lastSyncedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={syncNow}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sincronizar agora
              </button>
              <button
                type="button"
                onClick={signOutSupabase}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="url"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="Supabase URL (https://xxx.supabase.co)"
                className="rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="Supabase Anon Key"
                className="rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <input
                type="password"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                placeholder="Sua senha"
                className="rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => handleSupabaseLogin('signin')}
                className="rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Entrar e Sincronizar
              </button>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => handleSupabaseLogin('signup')}
                className="rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={handleSaveSupabaseCfg}
                className="rounded-xl border px-3 py-2 text-xs cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Salvar URL/Chave
              </button>
              <button
                type="button"
                onClick={() => setShowSql((v) => !v)}
                className="text-xs underline ml-auto cursor-pointer"
                style={{ color: 'var(--muted)' }}
              >
                {showSql ? 'Ocultar SQL' : 'Ver SQL da tabela'}
              </button>
            </div>
          </div>
        )}

        {showSql && (
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--muted)' }}>Cole uma vez no SQL Editor do Supabase:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
                  showStatus('SQL copiado!');
                }}
                className="flex items-center gap-1 text-xs font-medium cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                <Copy className="h-3 w-3" /> Copiar SQL
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};
