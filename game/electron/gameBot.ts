/**
 * 代打服务（GameBot）
 *
 * 将外部自动化引擎（BetterGI）封装在 Electron 主进程后端。
 * 前端只与 Ω 角色交互，不直接感知引擎实现。
 *
 * 当前引擎能力映射：
 *  - daily / resin / domain / fishing / wood / auto_pick / auto_skip
 *  - 任务触发点已预留（TODO: 接入 BetterGI 快捷键 / 配置接口）
 */

import { exec, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export type GameBotTaskId =
  | "daily"
  | "resin"
  | "domain"
  | "fishing"
  | "wood"
  | "auto_pick"
  | "auto_skip";

export interface GameBotStatus {
  running: boolean;
  engineReady: boolean;
  currentTask: GameBotTaskId | null;
  pid: number | null;
  startedAt: number | null;
}

export interface GameBotTaskResult {
  success: boolean;
  taskId: GameBotTaskId;
  message: string;
  error?: string;
}

const TASK_LABELS: Record<GameBotTaskId, string> = {
  daily: "每日委托",
  resin: "清空体力",
  domain: "秘境速刷",
  fishing: "自动钓鱼",
  wood: "自动伐木",
  auto_pick: "自动拾取",
  auto_skip: "剧情跳过",
};

const ENGINE_IMAGE = "BetterGI.exe";
const TASK_SIMULATE_MS = 8000;

class GameBotService {
  private currentTask: GameBotTaskId | null = null;
  private taskTimer: NodeJS.Timeout | null = null;
  private pid: number | null = null;
  private startedAt: number | null = null;

  private scriptPath(): string {
    return path.join(__dirname, "..", "scripts", "launch-bettergi.ps1");
  }

  /** 检测引擎进程是否在线 */
  isEngineRunning(): boolean {
    try {
      const out = execSync(
        `tasklist /FI "IMAGENAME eq ${ENGINE_IMAGE}" /NH 2>nul`,
        { encoding: "utf8", timeout: 5000 }
      );
      return out.includes(ENGINE_IMAGE);
    } catch {
      return false;
    }
  }

  private findPid(): number | null {
    try {
      const out = execSync(
        `tasklist /FI "IMAGENAME eq ${ENGINE_IMAGE}" /FO CSV /NH 2>nul`,
        { encoding: "utf8", timeout: 5000 }
      );
      const match = out.match(new RegExp(`"${ENGINE_IMAGE}","(\\d+)"`));
      return match ? Number(match[1]) : null;
    } catch {
      return null;
    }
  }

  /** 启动代打引擎 */
  start(): Promise<{ success: boolean; error?: string; pid?: number }> {
    const script = this.scriptPath();
    if (!existsSync(script)) {
      return Promise.resolve({ success: false, error: "engine launch script not found" });
    }

    if (this.isEngineRunning()) {
      this.pid = this.findPid();
      this.startedAt = Date.now();
      return Promise.resolve({ success: true, pid: this.pid ?? undefined });
    }

    return new Promise((resolve) => {
      exec(
        `powershell -ExecutionPolicy Bypass -File "${script}"`,
        { timeout: 20000 },
        (error, stdout) => {
          if (error) {
            resolve({ success: false, error: error.message });
            return;
          }
          try {
            const line = stdout
              .trim()
              .split("\n")
              .filter((l) => l.startsWith("{"))
              .pop();
            const parsed = line ? JSON.parse(line) : null;
            if (parsed?.success) {
              this.pid = parsed.pid ?? this.findPid();
              this.startedAt = Date.now();
              resolve({ success: true, pid: this.pid ?? undefined });
            } else {
              resolve({ success: false, error: "engine failed to start" });
            }
          } catch {
            resolve({ success: true, pid: this.findPid() ?? undefined });
          }
        }
      );
    });
  }

  /** 停止代打引擎 */
  stop(): { success: boolean; error?: string } {
    this.clearTaskTimer();
    try {
      execSync(`taskkill /IM ${ENGINE_IMAGE} /F 2>nul`, { timeout: 5000 });
      this.pid = null;
      this.startedAt = null;
      return { success: true };
    } catch {
      return { success: false, error: "engine stop failed" };
    }
  }

  /** 当前状态 */
  status(): GameBotStatus {
    const running = this.isEngineRunning();
    return {
      running,
      engineReady: running,
      currentTask: this.currentTask,
      pid: this.pid,
      startedAt: this.startedAt,
    };
  }

  /**
   * 接受一个代打任务。
   * 原型阶段：确保引擎在线并进入任务状态，执行逻辑为扩展点。
   */
  runTask(taskId: GameBotTaskId): GameBotTaskResult {
    const label = TASK_LABELS[taskId];
    if (!label) {
      return { success: false, taskId, message: "Ω 不认识这个指令", error: "unknown task" };
    }
    if (this.currentTask) {
      return {
        success: false,
        taskId,
        message: `Ω 正在处理${TASK_LABELS[this.currentTask]}`,
        error: "busy",
      };
    }

    // TODO: 接入 BetterGI 快捷键 / 配置触发对应自动化任务
    this.currentTask = taskId;
    this.taskTimer = setTimeout(() => this.clearTaskTimer(), TASK_SIMULATE_MS);
    return { success: true, taskId, message: `Ω 开始处理${label}` };
  }

  /** 停止当前任务 */
  stopTask(): GameBotTaskResult | null {
    if (!this.currentTask) return null;
    const taskId = this.currentTask;
    this.clearTaskTimer();
    return { success: true, taskId, message: "Ω 停下了手头的工作" };
  }

  private clearTaskTimer() {
    if (this.taskTimer) {
      clearTimeout(this.taskTimer);
      this.taskTimer = null;
    }
    this.currentTask = null;
  }
}

export const gameBot = new GameBotService();
