import { useState, useEffect, useCallback } from 'react';

export interface ExecutionRun {
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    output: any;
}

export function useRuns() {
    const [runs, setRuns] = useState<ExecutionRun[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRuns = useCallback(async () => {
        try {
            const response = await fetch('/api/runs');
            if (!response.ok) {
                throw new Error('Failed to fetch runs');
            }
            const data = await response.json();
            setRuns(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching runs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and auto-refresh setup
    useEffect(() => {
        fetchRuns();

        // Auto refresh every 10 seconds
        const intervalId = setInterval(() => {
            fetchRuns();
        }, 10000);

        return () => clearInterval(intervalId);
    }, [fetchRuns]);

    const clearRuns = useCallback(async () => {
        try {
            const response = await fetch('/api/runs', { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('Failed to clear runs');
            }
            setRuns([]);
            setError(null);
        } catch (err: any) {
            console.error('Error clearing runs:', err);
            setError(err.message);
        }
    }, []);

    return {
        runs,
        loading,
        error,
        refreshRuns: fetchRuns,
        clearRuns,
    };
}
