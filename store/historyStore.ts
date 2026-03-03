import { create } from 'zustand';
import { ExecutionResult } from '@/lib/execution/executeWorkflow';

export type RunStatus = 'success' | 'failed' | 'running';

export interface NodeExecutionLog {
    nodeId: string;
    nodeTitle: string;
    status: RunStatus;
    startTime: number;
    endTime: number;
    duration: number;
    output: any;
    error?: string;
}

export interface WorkflowRun {
    id: string;
    timestamp: string; // ISO string Date representation
    status: RunStatus;
    duration: number; // in milliseconds
    results: ExecutionResult | null;
    nodeLogs: NodeExecutionLog[];
}

interface HistoryState {
    runs: WorkflowRun[];
    addRun: (run: WorkflowRun) => void;
    clearRuns: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
    runs: [],
    addRun: (run) => set((state) => ({ runs: [run, ...state.runs] })), // Prefix to show newest at the top
    clearRuns: () => set({ runs: [] }),
}));
