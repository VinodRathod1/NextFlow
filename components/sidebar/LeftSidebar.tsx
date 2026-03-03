'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, FileText, Image as ImageIcon, Video, Cpu, Crop, SquareMousePointer, Workflow as WorkflowIcon, Trash2 } from 'lucide-react';
import { NodeType, useWorkflowStore } from '@/store/workflowStore';
import { useWorkflows } from '@/hooks/useWorkflows';
import { UserButton } from '@clerk/nextjs';

const nodeItems: { type: NodeType; label: string; icon: any }[] = [
    { type: 'textNode', label: 'Text Node', icon: FileText },
    { type: 'imageNode', label: 'Upload Image', icon: ImageIcon },
    { type: 'videoNode', label: 'Upload Video', icon: Video },
    { type: 'llmNode', label: 'Run LLM', icon: Cpu },
    { type: 'cropNode', label: 'Crop Image', icon: Crop },
    { type: 'extractFrameNode', label: 'Extract Frame', icon: SquareMousePointer },
];

export function LeftSidebar() {
    const [isNodesOpen, setIsNodesOpen] = useState(true);
    const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(true);
    const { workflows, loading, refreshWorkflows } = useWorkflows();

    // We'll need a way to track the currently selected workflow from the store later (or add it if missing)
    // For now, let's just use placeholder logic or add it to the workflowStore.
    // Assuming there is a way to set nodes/edges, we could load them on click.
    const { setWorkflow, clearWorkflow, currentWorkflowId, setCurrentWorkflowId } = useWorkflowStore();
    const [isLoadingWorkflow, setIsLoadingWorkflow] = useState<boolean>(false);

    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleWorkflowClick = async (workflow: any) => {
        try {
            setCurrentWorkflowId(workflow.id);
            setIsLoadingWorkflow(true);

            // Clear current canvas before loading the new one
            clearWorkflow();

            // Fetch workflow by id
            const response = await fetch(`/api/workflows/${workflow.id}`);
            if (!response.ok) throw new Error('Failed to fetch workflow');

            const fullWorkflow = await response.json();

            // Load parsed nodes and edges into React Flow state
            setWorkflow(
                fullWorkflow.nodes ? (typeof fullWorkflow.nodes === 'string' ? JSON.parse(fullWorkflow.nodes) : fullWorkflow.nodes) : [],
                fullWorkflow.edges ? (typeof fullWorkflow.edges === 'string' ? JSON.parse(fullWorkflow.edges) : fullWorkflow.edges) : []
            );

        } catch (error) {
            console.error('Error loading workflow:', error);
            // Optionally could add a toast here
        } finally {
            setIsLoadingWorkflow(false);
        }
    };

    const handleDeleteWorkflow = async (e: React.MouseEvent, workflowId: string) => {
        e.stopPropagation(); // Don't trigger the click-to-load
        try {
            const res = await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            // If we deleted the currently active workflow, clear the canvas
            if (currentWorkflowId === workflowId) {
                clearWorkflow();
                setCurrentWorkflowId(null as any);
            }
            refreshWorkflows();
        } catch (err) {
            console.error('Failed to delete workflow:', err);
        }
    };

    const handleDeleteAllUnsaved = async () => {
        try {
            const res = await fetch('/api/workflows/delete-unsaved', { method: 'POST' });
            if (!res.ok) {
                const errBody = await res.text();
                console.error('Delete response:', res.status, errBody);
                throw new Error('Delete failed');
            }
            const data = await res.json();
            console.log(`Deleted ${data.deleted} unsaved workflows`);
            // Clear canvas if current workflow was unsaved
            const currentWf = workflows.find(w => w.id === currentWorkflowId);
            if (currentWf?.name === 'Unsaved Workflow') {
                clearWorkflow();
                setCurrentWorkflowId(null as any);
            }
            refreshWorkflows();
        } catch (err) {
            console.error('Failed to delete unsaved workflows:', err);
        }
    };

    return (
        <aside className="w-[260px] flex-shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col h-full overflow-hidden transition-all duration-300">
            {/* Logo Area */}
            <div className="h-14 flex items-center px-4 border-b border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Layers className="w-5 h-5" />
                    <span className="font-semibold text-lg tracking-wide text-white">NextFlow</span>
                </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">

                {/* Workflows / Quick Access Section */}
                <div className="px-3">
                    <button
                        onClick={() => setIsWorkflowsOpen(!isWorkflowsOpen)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors duration-200 rounded-md hover:bg-slate-800/60"
                    >
                        <span>Quick Access</span>
                        {isWorkflowsOpen ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>

                    {isWorkflowsOpen && (
                        <div className="mt-3 space-y-1 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                            {loading ? (
                                <div className="px-3 py-2 text-sm text-slate-400">Loading workflows...</div>
                            ) : workflows.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-slate-400 italic">No saved workflows</div>
                            ) : (
                                workflows.map((wf) => (
                                    <div
                                        key={wf.id}
                                        onClick={() => handleWorkflowClick(wf)}
                                        className={`group flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-200 ${currentWorkflowId === wf.id
                                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        <WorkflowIcon className={`w-4 h-4 shrink-0 ${currentWorkflowId === wf.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                                        <span className="truncate flex-1">{wf.name}</span>
                                        <button
                                            onClick={(e) => handleDeleteWorkflow(e, wf.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all duration-200"
                                            title="Delete workflow"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                            {/* Clear All Unsaved button */}
                            {!loading && workflows.some(wf => wf.name === 'Unsaved Workflow' || wf.name === 'Untitled Workflow') && (
                                <button
                                    onClick={handleDeleteAllUnsaved}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all duration-200"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear All Unsaved
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Nodes Section */}
                <div className="px-3">
                    <button
                        onClick={() => setIsNodesOpen(!isNodesOpen)}
                        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors duration-200 rounded-md hover:bg-slate-800/60"
                    >
                        <span>Nodes</span>
                        {isNodesOpen ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>

                    {isNodesOpen && (
                        <div className="mt-3 space-y-2">
                            {nodeItems.map((item) => (
                                <div
                                    key={item.type}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 bg-slate-800/30 border border-slate-700/50 rounded-lg cursor-grab hover:bg-slate-800 hover:text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-slate-600/50"
                                    onDragStart={(event) => onDragStart(event, item.type)}
                                    draggable
                                >
                                    <item.icon className="w-4 h-4 text-indigo-400" />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* User Profile / Sign Out */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32 }}>
                    <UserButton
                        afterSignOutUrl="/sign-in"
                        appearance={{
                            elements: {
                                rootBox: "w-8 h-8",
                                avatarBox: "w-8 h-8",
                            },
                        }}
                    />
                </div>
                <span className="text-sm text-slate-400 truncate">Account</span>
            </div>
        </aside>
    );
}
