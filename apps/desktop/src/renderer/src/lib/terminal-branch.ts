const TERMINAL_BRANCH_STORAGE_KEY = 'gastroai-terminal-branch';

export interface TerminalBranch {
  id: string;
  name: string;
}

export function getTerminalBranch(): TerminalBranch | null {
  try {
    const raw = window.localStorage.getItem(TERMINAL_BRANCH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<TerminalBranch>;
    if (!parsed.id || !parsed.name) {
      return null;
    }
    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function setTerminalBranch(branch: TerminalBranch): void {
  window.localStorage.setItem(TERMINAL_BRANCH_STORAGE_KEY, JSON.stringify(branch));
}
