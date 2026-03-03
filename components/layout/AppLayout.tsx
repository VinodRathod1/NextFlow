'use client';

import { ReactNode } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { LeftSidebar } from '../sidebar/LeftSidebar';
import { RightSidebar } from '../sidebar/RightSidebar';
import { Play, Download, Upload, Save } from 'lucide-react';
import { useRef, useState } from 'react';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import { useWorkflowStore } from '@/store/workflowStore';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { runWorkflow, isExecuting, error } = useWorkflowExecution();

    const nodes = useWorkflowStore((state) => state.nodes);
    const edges = useWorkflowStore((state) => state.edges);
    const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
    const currentWorkflowId = useWorkflowStore((state) => state.currentWorkflowId);
    const setCurrentWorkflowId = useWorkflowStore((state) => state.setCurrentWorkflowId);

    const [importError, setImportError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const workflowData = { nodes, edges };
        const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const parsed = JSON.parse(result);
                    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
                        setWorkflow(parsed.nodes, parsed.edges);
                    } else {
                        throw new Error("Invalid format");
                    }
                }
            } catch (err: any) {
                setImportError("Failed to parse workflow JSON.");
                setTimeout(() => setImportError(null), 4000);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 relative selection:bg-indigo-100 selection:text-indigo-900">
            <LeftSidebar />

            <main className="flex-grow relative h-full flex flex-col min-w-0">
                {/* Top Navbar Area for Execution Controls */}
                <div className="h-14 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between px-4 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-slate-800">Workflow Editor</h2>
                        {error && (
                            <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-medium animate-in fade-in zoom-in">
                                Error: {error}
                            </span>
                        )}
                        {importError && (
                            <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-medium animate-in fade-in zoom-in">
                                {importError}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={handleImportClick}
                            disabled={isExecuting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-200 text-xs font-semibold"
                            title="Import Workflow"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Import
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExecuting || nodes.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-200 text-xs font-semibold"
                            title="Export Workflow"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>



                        <button
                            onClick={runWorkflow}
                            disabled={isExecuting}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md justify-center font-semibold text-xs transition-all duration-200 shadow-sm active:scale-95 ${isExecuting
                                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm text-white'
                                }`}
                        >
                            {isExecuting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Run Workflow
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-grow relative w-full h-full">
                    <ReactFlowProvider>
                        {children}
                    </ReactFlowProvider>
                </div>
            </main>

            <RightSidebar />
        </div>
    );
}
