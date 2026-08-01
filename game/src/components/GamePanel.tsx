/**
 * 游戏面板
 *
 * 合成游戏机后解锁，提供简单的游戏任务辅助界面。
 */

import { useCallback, useEffect, useState } from "react";
import type { OmegaState } from "../types";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
};

export default function GamePanel({ state, updateState, onClose, setClickBubble }: Props) {
  const [action, setAction] = useState<string | null>(null);
  const [bettergiStatus, setBettergiStatus] = useState<"idle" | "launching" | "running" | "error">("idle");
  const [bettergiError, setBettergiError] = useState<string | null>(null);

  // 启动时检查 BetterGI 状态
  useEffect(() => {
    if (window.omega?.bettergi) {
      window.omega.bettergi.status().then((res) => {
        setBettergiStatus(res.running ? "running" : "idle");
      }).catch(() => {});
    }
  }, []);

  const handleLaunchBetterGI = useCallback(async () => {
    if (!window.omega?.bettergi) {
      setBettergiError("BetterGI 仅支持 Electron 桌面模式");
      setBettergiStatus("error");
      return;
    }

    setBettergiStatus("launching");
    setBettergiError(null);

    try {
      const result = await window.omega.bettergi.launch();
      if (result.success) {
        setBettergiStatus("running");
        setClickBubble("Ω启动了 BetterGI……她的手指悬在键盘上方，眼睛亮了一下。");
        setTimeout(() => setClickBubble(null), 3000);
      } else {
        setBettergiStatus("error");
                setBettergiError(result.error || "启动失败");
        // 如果是未解压状态，显示更具操作性的提示
        if (result.error && result.error.includes("压缩包")) {
          setBettergiError("BetterGI 压缩包已下载，需要先右键点击 extract-bettergi.ps1 用 PowerShell 运行解压");
        }
      }
    } catch (err) {
      setBettergiStatus("error");
      setBettergiError(String(err));
    }
  }, [setClickBubble]);

  async function handleAction(type: "daily" | "resin") {
    setAction(type);
    await new Promise((r) => setTimeout(r, 2000));

    const messages: Record<string, string> = {
      daily: "每日任务完成了，Ω揉了揉眼睛，但看起来很开心。",
      resin: "体力清完了。Ω说：'下次还可以找我。'",
    };

    await updateState({
      emotion: "happy",
      lastActiveTime: Date.now(),
    });

    setClickBubble(messages[type]);
    setTimeout(() => {
      setClickBubble(null);
      setAction(null);
    }, 3000);
  }

  return (
    <section className="floating-panel compact-panel game-panel">
      <h2>游戏</h2>

      {action ? (
        <div className="game-panel__running">
          <p>Ω 正在处理{action === "daily" ? "每日任务" : "体力"}……</p>
          <div className="game-panel__spinner" />
        </div>
      ) : (
        <>
          <p className="game-panel__desc">
            好感度 {state.affinity} · Ω已经学会了怎么操作那款游戏。
            你可以让Ω帮忙做一些简单的事。
          </p>

          {state.unlocked.game && (
            <div className="game-panel__actions">
              <button
                type="button"
                className="game-panel__btn"
                onClick={(e) => { e?.stopPropagation(); handleAction("daily"); }}
              >
                做每日任务
              </button>
              <button
                type="button"
                className="game-panel__btn"
                onClick={(e) => { e?.stopPropagation(); handleAction("resin"); }}
              >
                清体力
              </button>
            </div>
          )}

          {/* BetterGI 一键启动 */}
          <div className="game-panel__bettergi">
            <hr className="game-panel__divider" />
            <p className="game-panel__bettergi-label">
              外部辅助 · BetterGI
              <span className={`game-panel__status-dot game-panel__status-dot--${bettergiStatus}`} />
            </p>

            {bettergiStatus === "launching" ? (
              <div className="game-panel__running">
                <p>正在启动 BetterGI……</p>
                <div className="game-panel__spinner" />
              </div>
            ) : (
              <button
                type="button"
                className="game-panel__btn game-panel__btn--launch"
                onClick={(e) => { e?.stopPropagation(); handleLaunchBetterGI(); }}
                disabled={bettergiStatus === "running"}
              >
                {bettergiStatus === "running" ? "BetterGI 运行中" : "一键启动 BetterGI"}
              </button>
            )}

            {bettergiError && (
              <p className="game-panel__error">{bettergiError}</p>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={(e) => { e?.stopPropagation(); onClose(); }}
        disabled={action !== null}
      >
        关闭
      </button>
    </section>
  );
}
