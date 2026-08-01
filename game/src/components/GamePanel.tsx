/**
 * Ω 代打工作台
 *
 * 前端只与 Ω 角色交互，代打引擎由 Electron 后端封装。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { OmegaState } from "../types";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
};

type BotStatus = {
  running: boolean;
  engineReady: boolean;
  currentTask: string | null;
};

const TASKS: Array<{ id: string; label: string; emoji: string; desc: string }> = [
  { id: "daily", label: "每日委托", emoji: "✦", desc: "日常任务一条龙" },
  { id: "resin", label: "清空体力", emoji: "◉", desc: "把今天的体力用掉" },
  { id: "domain", label: "秘境速刷", emoji: "◆", desc: "快速清理秘境" },
  { id: "fishing", label: "自动钓鱼", emoji: "≈", desc: "帮你盯住鱼漂" },
  { id: "wood", label: "自动伐木", emoji: "⌖", desc: "收集木材建材" },
  { id: "auto_pick", label: "自动拾取", emoji: "●", desc: "掉落物不遗漏" },
  { id: "auto_skip", label: "剧情跳过", emoji: "»", desc: "重复对话快速过" },
];

const TASK_LABELS: Record<string, string> = Object.fromEntries(
  TASKS.map((t) => [t.id, t.label])
);

export default function GamePanel({ state, updateState, onClose, setClickBubble }: Props) {
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus>({
    running: false,
    engineReady: false,
    currentTask: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!window.omega?.gamebot) return;
    try {
      const s = await window.omega.gamebot.status();
      setBotStatus({
        running: s.running,
        engineReady: s.engineReady,
        currentTask: s.currentTask,
      });
      if (s.currentTask) setBusyTask(s.currentTask);
      else setBusyTask((prev) => prev && !s.running ? prev : null);
    } catch {
      /* 忽略状态轮询错误 */
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    pollRef.current = setInterval(() => void refreshStatus(), 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshStatus]);

  const speak = useCallback((msg: string) => {
    setClickBubble(msg);
    setTimeout(() => setClickBubble(null), 3200);
  }, [setClickBubble]);

  const ensureEngine = useCallback(async (): Promise<boolean> => {
    if (!window.omega?.gamebot) {
      setError("代打服务仅支持 Electron 桌面模式");
      return false;
    }
    const s = await window.omega.gamebot.status();
    if (s.engineReady) return true;
    setStarting(true);
    setError(null);
    try {
      const r = await window.omega.gamebot.start();
      if (!r.success) {
        setError(r.error || "引擎启动失败");
        return false;
      }
      speak("稍等，我先把自己的手洗干净……好了，我可以开始了。");
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setStarting(false);
    }
  }, [speak]);

  const handleRunTask = useCallback(async (taskId: string) => {
    if (busyTask || starting || !window.omega?.gamebot) return;
    setError(null);
    const ready = await ensureEngine();
    if (!ready) return;
    try {
      const r = await window.omega.gamebot.runTask(taskId);
      if (r.success) {
        setBusyTask(taskId);
        speak(`好，${TASK_LABELS[taskId]}交给我。你歇一会儿。`);
        await updateState({ emotion: "proud", lastActiveTime: Date.now() });
      } else {
        setError(r.message);
        speak(r.message);
      }
    } catch (err) {
      setError(String(err));
    }
  }, [busyTask, starting, ensureEngine, speak, updateState]);

  const handleStopTask = useCallback(async () => {
    if (!window.omega?.gamebot) return;
    try {
      const r = await window.omega.gamebot.stopTask();
      if (r) {
        setBusyTask(null);
        speak(r.message);
      }
    } catch {
      /* ignore */
    }
  }, [speak]);

  const statusText = busyTask
    ? `正在处理${TASK_LABELS[busyTask] ?? busyTask}`
    : starting
      ? "正在准备……"
      : botStatus.engineReady
        ? "待命中"
        : "引擎未就绪";

  const statusClass = busyTask ? "working" : starting ? "starting" : botStatus.engineReady ? "ready" : "offline";

  return (
    <section className="floating-panel compact-panel game-panel game-bot-panel">
      <h2>Ω 的代打工作台</h2>

      <div className="game-bot__omega">
        <div className="game-bot__avatar">Ω</div>
        <div className="game-bot__status">
          <span className={`game-bot__dot game-bot__dot--${statusClass}`} />
          <span>{statusText}</span>
        </div>
      </div>

      {error && <p className="game-bot__error">{error}</p>}

      {busyTask || starting ? (
        <div className="game-bot__working">
          <div className="game-bot__spinner" />
          <p>{starting ? "Ω 正在准备辅助引擎……" : `Ω 正在处理${TASK_LABELS[busyTask!] ?? "任务"}……`}</p>
          {busyTask && (
            <button type="button" className="game-bot__stop-btn" onClick={(e) => { e?.stopPropagation(); handleStopTask(); }}>
              让 Ω 停下
            </button>
          )}
        </div>
      ) : (
        <div className="game-bot__tasks">
          {TASKS.map((task) => (
            <button
              key={task.id}
              type="button"
              className="game-bot__task"
              onClick={(e) => { e?.stopPropagation(); handleRunTask(task.id); }}
            >
              <span className="game-bot__task-icon">{task.emoji}</span>
              <span className="game-bot__task-body">
                <strong>{task.label}</strong>
                <small>{task.desc}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="game-bot__footnote">好感度 {state.affinity} · Ω 说她可以试试</p>

      <button type="button" onClick={(e) => { e?.stopPropagation(); onClose(); }}>
        关闭
      </button>
    </section>
  );
}
