import { contextBridge } from 'electron';

/**
 * Minimal, typed bridge exposed to the renderer. Only safe, non-sensitive
 * data crosses the context boundary (AGENTS.md §12).
 */
const api = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
} as const;

contextBridge.exposeInMainWorld('gastroai', api);

export type GastroBridge = typeof api;
