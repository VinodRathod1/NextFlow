'use client';

import { useState } from 'react';
import { History, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, AlertCircle, FileText, Loader2, Workflow as WorkflowIcon, Trash2 } from 'lucide-react';
import { useRuns, ExecutionRun } from '@/hooks/useRuns';

export function RightSidebar() {
    const { runs, loading, clearRuns } = useRuns();
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

    const toggleExpand = (runId: string) => {
        setExpandedRunId(prev => prev === runId ? null : runId);
    };

    const formatTimeAgo = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    // Calculate duration from startedAt to finishedAt
    const calculateDuration = (startedAt: string, finishedAt: string | null) => {
        if (!finishedAt) return 'Running';
        const start = new Date(startedAt).getTime();
        const end = new Date(finishedAt).getTime();
        return `${end - start}ms`;
    };

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true,
        }).format(date);
    };

    const renderOutputDetails = (run: ExecutionRun) => {
        const { output } = run;
        if (!output) return null;

        // If it's a direct JSON object representing the node outputs (from our executeWorkflow map)
        if (typeof output === 'object') {
            const keys = Object.keys(output);
            if (keys.length === 0) return null;

            return (
                <div className="flex flex-col gap-1.5 px-3 pb-3 pt-1 border-t border-slate-100 bg-white">
                    {keys.map((nodeId) => {
                        const nodeOutput = output[nodeId];
                        return (
                            <div key={nodeId} className="flex flex-col gap-1 p-2 rounded-md border border-slate-100 bg-slate-50/50 mt-1">
                                <span className="text-xs font-semibold text-slate-700">{nodeId}</span>
                                {nodeOutput?.type === 'text' || nodeOutput?.type === 'llm_output' ? (
                                    <p className="text-[11px] text-slate-600 bg-white p-2 border border-slate-200 rounded-md italic line-clamp-3">
                                        "{nodeOutput.value}"
                                    </p>
                                ) : nodeOutput?.type === 'image' || nodeOutput?.type === 'video' ? (
                                    <a href={nodeOutput.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-indigo-600 bg-white px-2 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50">
                                        <FileText className="w-3 h-3 text-indigo-400" />
                                        <span className="truncate max-w-[150px]">View Media Link</span>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white px-2 py-1.5 border border-slate-200 rounded-md">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        <span className="truncate max-w-[150px]">{JSON.stringify(nodeOutput)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return null;
    };


    return (
        <aside className="w-[320px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-lg z-10 relative transition-all duration-300">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2 text-slate-700">
                    <History className="w-4 h-4" />
                    <h2 className="font-semibold text-sm">Workflow History</h2>
                </div>
                {runs.length > 0 && (
                    <button
                        onClick={clearRuns}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                        title="Clear all history"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full p-4 flex flex-col gap-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 pb-20">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-xs font-medium">Loading runs...</p>
                    </div>
                ) : runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 pb-20">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                            <History className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">No runs yet</p>
                        <p className="text-xs text-center max-w-[200px]">
                            Execute your workflow to see the run history here.
                        </p>
                    </div>
                ) : (
                    runs.map((run: ExecutionRun) => {
                        const isExpanded = expandedRunId === run.id;

                        return (
                            <div
                                key={run.id}
                                className="group border border-slate-200 bg-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden"
                            >
                                {/* Header Toggle Area */}
                                <div
                                    className="p-3 cursor-pointer flex flex-col gap-2 relative bg-white hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleExpand(run.id)}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-1.5">
                                            {isExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                                                {run.workflowName}
                                            </span>
                                        </div>

                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${run.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            run.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            {run.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                                                run.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                                                    <Loader2 className="w-3 h-3 animate-spin" />}
                                            {run.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-5">
                                        <Clock className="w-3.5 h-3.5 opacity-60" />
                                        {formatTimeAgo(run.startedAt)}
                                        <span className="text-slate-300 mx-1">•</span>
                                        {calculateDuration(run.startedAt, run.finishedAt)}
                                    </div>
                                </div>

                                {/* Expanded Details Area */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                                        {/* Status & Timing Overview */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1 pr-2 border-r border-slate-200">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                    {run.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> :
                                                        run.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                                                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
                                                    <span className="capitalize">{run.status}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 pl-1">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timing</span>
                                                <div className="flex flex-col gap-0.5 text-[10px] text-slate-600 font-mono">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400">Start:</span>
                                                        <span>{formatTimestamp(run.startedAt)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400">End:</span>
                                                        <span>{run.finishedAt ? formatTimestamp(run.finishedAt) : '--'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error Message (if failed) */}
                                        {run.status === 'failed' && run.output?.error && (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Failed Reason</span>
                                                <div className="flex items-start gap-1.5 bg-red-100/50 p-2 border border-red-200 rounded-md">
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-red-700 font-medium leading-relaxed break-all">
                                                        {run.output.error}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* JSON Output */}
                                        {run.output && (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Execution Output</span>
                                                <div className="bg-slate-900 rounded-md p-2.5 overflow-x-auto custom-scrollbar border border-slate-800">
                                                    <pre className="text-[10px] text-slate-300 font-mono leading-relaxed">
                                                        {JSON.stringify(run.output, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}
