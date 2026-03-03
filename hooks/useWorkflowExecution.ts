import { useState, useCallback } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { executeWorkflow, ExecutionResult, runSingleNode } from '@/lib/execution/executeWorkflow';
import { useHistoryStore } from '@/store/historyStore';

export function useWorkflowExecution() {
    const { nodes, edges } = useWorkflowStore();
    const [isExecuting, setIsExecuting] = useState(false);
    const [results, setResults] = useState<ExecutionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runWorkflow = useCallback(async () => {
        if (nodes.length === 0) {
            setError('Workflow is empty. Add some nodes to run.');
            return;
        }

        setIsExecuting(true);
        setError(null);
        setResults(null);
        const addRun = useHistoryStore.getState().addRun;
        const updateNodeData = useWorkflowStore.getState().updateNodeData;
        const workflowStore = useWorkflowStore.getState();
        let currentWorkflowId = workflowStore.currentWorkflowId;

        // Ensure a workflow record exists for execution logging
        try {
            if (currentWorkflowId) {
                // Update existing workflow with latest nodes/edges
                await fetch(`/api/workflows/${currentWorkflowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nodes, edges })
                });
            } else {
                // Auto-create a workflow so run history is tracked
                const res = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Untitled Workflow', nodes, edges })
                });
                if (res.ok) {
                    const data = await res.json();
                    currentWorkflowId = data.id;
                    workflowStore.setCurrentWorkflowId(data.id);
                }
            }
        } catch (err: any) {
            console.warn('Could not save workflow:', err.message);
        }

        // Reset all node statuses before starting
        nodes.forEach(node => {
            updateNodeData(node.id, { executionStatus: undefined });
        });

        const startTime = performance.now();
        const runId = `run-${Date.now()}`;
        const timestamp = new Date().toISOString();

        try {
            console.log('--- Workflow Execution Started ---');
            const { results: executionResults, nodeLogs } = await executeWorkflow(currentWorkflowId || 'local-run', nodes, edges, updateNodeData);

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            setResults(executionResults);
            console.log('--- Workflow Execution Completed ---');
            console.log('Final Results:', executionResults);
            console.log('Node Logs:', nodeLogs);

            addRun({
                id: runId,
                timestamp,
                status: 'success',
                duration,
                results: executionResults,
                nodeLogs,
            });

        } catch (err: any) {
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            console.error('Workflow Execution Failed:', err);
            setError(err.message || 'An unknown error occurred during execution');

            addRun({
                id: runId,
                timestamp,
                status: 'failed',
                duration,
                results: null,
                nodeLogs: [],
            });
        } finally {
            setIsExecuting(false);
        }
    }, [nodes, edges]);

    const runNode = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsExecuting(true);
        setError(null);
        const updateNodeData = useWorkflowStore.getState().updateNodeData;

        try {
            await runSingleNode(node, nodes, edges, updateNodeData);
        } catch (err: any) {
            setError(err.message || 'Node execution failed');
        } finally {
            setIsExecuting(false);
        }
    }, [nodes, edges]);

    return {
        isExecuting,
        results,
        error,
        runWorkflow,
        runNode,
        clearResults: () => setResults(null),
    };
}
