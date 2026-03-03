import { Handle, Position, useUpdateNodeInternals, useEdges } from 'reactflow';
import { Layers, CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';
import { NODE_DEFINITIONS, NodeDataType } from '@/lib/nodeTypes';
import { useEffect } from 'react';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';

interface BaseNodeProps {
    id: string;
    type: string;
    data: {
        label?: string;
        executionStatus?: 'idle' | 'running' | 'success' | 'failed';
        [key: string]: any;
    };
}

const nodeTypeLabels: Record<string, string> = {
    textNode: 'Text',
    imageNode: 'Image',
    videoNode: 'Video',
    llmNode: 'LLM',
    cropNode: 'Crop Image',
    extractFrameNode: 'Extract Frame',
};

const typeColors: Record<NodeDataType, string> = {
    text: 'bg-blue-400',
    image: 'bg-emerald-400',
    video: 'bg-purple-400',
    llm_output: 'bg-amber-400',
    any: 'bg-slate-400',
};

export function BaseNode({ id, data, type }: BaseNodeProps) {
    const displayLabel = data.label || nodeTypeLabels[type] || type;
    const def = NODE_DEFINITIONS[type] || { inputs: [], outputs: [] };
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();
    const { runNode, isExecuting } = useWorkflowExecution();

    const { executionStatus } = data;

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    // Compute dynamic border/shadow based on execution status
    let containerClasses = "bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 w-[200px] overflow-visible group flex flex-col relative ";
    if (executionStatus === 'running') {
        containerClasses += "border-amber-400 animate-pulse-glow z-50";
    } else if (executionStatus === 'success') {
        containerClasses += "border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]";
    } else if (executionStatus === 'failed') {
        containerClasses += "border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]";
    } else {
        containerClasses += "border-slate-200";
    }

    return (
        <div className={containerClasses}>
            <div className={`px-3 py-2 flex items-center justify-between rounded-t-[10px] z-10 border-b ${executionStatus === 'running' ? 'bg-amber-50/80 border-amber-200' :
                executionStatus === 'success' ? 'bg-emerald-50/80 border-emerald-200' :
                    executionStatus === 'failed' ? 'bg-red-50/80 border-red-200' :
                        'bg-slate-50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <Layers className={`w-3.5 h-3.5 ${executionStatus === 'running' ? 'text-amber-500' :
                        executionStatus === 'success' ? 'text-emerald-500' :
                            executionStatus === 'failed' ? 'text-red-500' :
                                'text-indigo-500'
                        }`} />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {nodeTypeLabels[type] || 'Node'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Individual Run Button */}
                    {!executionStatus && (
                        <button
                            onClick={(e) => { e.stopPropagation(); runNode(id); }}
                            disabled={isExecuting}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                            title="Run single node"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                    )}

                    {/* Status Indicator */}
                    {executionStatus === 'running' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100/50 rounded-full">
                            <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Running</span>
                        </div>
                    )}
                    {executionStatus === 'success' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100/50 rounded-full animate-in fade-in zoom-in duration-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Done</span>
                        </div>
                    )}
                    {executionStatus === 'failed' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100/50 rounded-full animate-in fade-in zoom-in duration-300">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Failed</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="py-3 px-3 relative min-h-[50px] flex flex-col justify-center bg-white rounded-b-[10px]">
                {/* Render Inputs (Left) */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center gap-3 -translate-x-1/2">
                    {def.inputs.map((input) => {
                        const isConnected = edges.some(
                            (edge) => edge.target === id && edge.targetHandle === input.id
                        );

                        return (
                            <div key={input.id} className="relative group/handle flex items-center">
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={input.id}
                                    data-type={input.type}
                                    className={`w-3.5 h-3.5 border-2 shadow-sm transition-all !static translate-x-0 translate-y-0 ${isConnected
                                        ? `${typeColors[input.type]} border-${typeColors[input.type].replace('bg-', '')}`
                                        : `bg-white border-slate-300 hover:scale-125 hover:shadow-md`
                                        }`}
                                />
                                <span className="absolute left-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                                    {input.label} ({input.type}) {isConnected ? '(Connected)' : ''}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Node Content */}
                <div className="text-sm text-slate-600 font-medium text-center z-10">
                    {displayLabel}
                </div>

                {/* Render Outputs (Right) */}
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-3 translate-x-1/2">
                    {def.outputs.map((output) => (
                        <div key={output.id} className="relative group/handle flex items-center justify-end">
                            <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                                {output.label} ({output.type})
                            </span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={output.id}
                                data-type={output.type}
                                className={`w-3.5 h-3.5 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0 ${typeColors[output.type]}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
