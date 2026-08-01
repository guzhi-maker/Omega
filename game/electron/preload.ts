import { contextBridge, ipcRenderer } from "electron";

const omegaApi = {
  window: {
    openCapsule: () => ipcRenderer.invoke("window:openCapsule"),
    closeCapsule: () => ipcRenderer.invoke("window:closeCapsule"),
    showFloating: () => ipcRenderer.invoke("window:showFloating"),
    setFloatingPosition: (x: number, y: number) =>
      ipcRenderer.invoke("window:setFloatingPosition", { x, y }),
    quit: () => ipcRenderer.invoke("window:quit"),
    hideFloating: () => ipcRenderer.invoke("window:hideFloating"),
    setResizable: (resizable: boolean) =>
      ipcRenderer.invoke("window:setResizable", resizable),
  },
  state: {
    getOmegaState: () => ipcRenderer.invoke("state:getOmegaState"),
    updateOmegaState: (partialState: unknown) =>
      ipcRenderer.invoke("state:updateOmegaState", partialState),
    getSessionLog: () => ipcRenderer.invoke("state:getSessionLog"),
    clearChatMemory: () => ipcRenderer.invoke("state:clearChatMemory")
  },
  memory: {
    saveSummary: (summary: string) =>
      ipcRenderer.invoke("memory:saveSummary", summary),
    getSummaries: () => ipcRenderer.invoke("memory:getSummaries")
  },
  ai: {
    sendMessage: (payload: { text: string; includeScreenshot: boolean }) =>
      ipcRenderer.invoke("ai:sendMessage", payload)
  },
  // BetterGI: launch & status
  bettergi: {
    launch: () => ipcRenderer.invoke("bettergi:launch"),
    status: () => ipcRenderer.invoke("bettergi:status"),
  },
  options: {
    generate: (omegaText: string, history?: { speaker: string; text: string; createdAt: string }[]) =>
      ipcRenderer.invoke("options:generate", { omegaText, history: history ?? [] })
  },
  onOmegaThinking: (callback: (msg: string) => void) => {
    ipcRenderer.on("omega-thinking", (_event, msg) => callback(msg));
    return () => { ipcRenderer.removeAllListeners("omega-thinking"); };
  },
  onShowContextMenu: (callback: () => void) => {
    ipcRenderer.on("show-context-menu", () => callback());
    return () => { ipcRenderer.removeAllListeners("show-context-menu"); };
  },
};

contextBridge.exposeInMainWorld("omega", omegaApi);

export type OmegaBridge = typeof omegaApi;
