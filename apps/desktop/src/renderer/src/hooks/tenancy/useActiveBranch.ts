import { useEffect, useState } from 'react';
import {
  getTerminalBranch,
  TERMINAL_BRANCH_CHANGED_EVENT,
  type TerminalBranch,
} from '@/lib/terminal-branch';

export function useActiveBranch(): TerminalBranch | null {
  const [branch, setBranch] = useState<TerminalBranch | null>(() => getTerminalBranch());

  useEffect(() => {
    const sync = () => setBranch(getTerminalBranch());
    window.addEventListener(TERMINAL_BRANCH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(TERMINAL_BRANCH_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return branch;
}
