import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals, useEdges } from 'reactflow';
import { Sparkles, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useDebounce } from '@/hooks/useDebounce';

interface LLMNodeProps {
    id: string;
    data: {
        prompt?: string;
        output?: {
            type: 'llm_output';
            value: string;
        };
        executionStatus?: 'idle' | 'running' | 'success' | 'failed';
        [key: string]: any;
    };
}

function LLMNodeComponent({ id, data }: LLMNodeProps) {
    const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();

    const { executionStatus } = data;

    // Local state
    const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
    const [isExecuting, setIsExecuting] = useState(false);
    const [outputResult, setOutputResult] = useState<string | null>(data.output?.value || null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const debouncedPrompt = useDebounce(localPrompt, 300);

    // Check connections
    const isTextConnected = edges.some(edge => edge.target === id && edge.targetHandle === 'text-in');
    const isImageConnected = edges.some(edge => edge.target === id && edge.targetHandle === 'image-in');

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    // Sync prompt 
    useEffect(() => {
        updateNodeData(id, { prompt: debouncedPrompt });
    }, [debouncedPrompt, id, updateNodeData]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalPrompt(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    };

    const handleExecute = () => {
        if (isExecuting || executionStatus === 'running') return;
        setIsExecuting(true);
        setOutputResult(null); // Clear previous output

        // Simulate AI execution
        setTimeout(() => {
            const dummyResponse = "AI processed your input successfully. This is a simulated response based on your prompt and connected inputs.";
            setOutputResult(dummyResponse);
            setIsExecuting(false);

            // Save to global store
            updateNodeData(id, {
                output: {
                    type: 'llm_output',
                    value: dummyResponse,
                },
            });
        }, 1500);
    };

    // Compute dynamic border/shadow based on execution status
    let containerClasses = "bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 w-[280px] overflow-visible group flex flex-col relative ";
    if (executionStatus === 'running') {
        containerClasses += "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] -translate-y-1";
    } else if (executionStatus === 'success') {
        containerClasses += "border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]";
    } else if (executionStatus === 'failed') {
        containerClasses += "border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]";
    } else {
        containerClasses += "border-slate-200";
    }

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className={`px-3 py-2 flex items-center justify-between rounded-t-[10px] z-20 border-b w-full ${executionStatus === 'running' ? 'bg-amber-50/80 border-amber-200' :
                executionStatus === 'success' ? 'bg-emerald-50/80 border-emerald-200' :
                    executionStatus === 'failed' ? 'bg-red-50/80 border-red-200' :
                        'bg-amber-50/50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${executionStatus === 'running' ? 'text-amber-500' :
                            executionStatus === 'success' ? 'text-emerald-500' :
                                executionStatus === 'failed' ? 'text-red-500' :
                                    'text-amber-500'
                        }`} />
                    <span className="text-sm font-semibold text-slate-700 tracking-wide">
                        Run LLM
                    </span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1">
                    {/* Keep legacy pulse if running manually */}
                    {isExecuting && !executionStatus && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}

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

            <div className="p-3 bg-white rounded-b-xl relative flex flex-col gap-3 min-h-[150px]">
                {/* Input Connections Display */}
                <div className="flex flex-col gap-1.5 pt-1">
                    <div className={`flex items-center gap-2 text-[11px] font-medium px-2 py-1 rounded-md border ${isTextConnected ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {isTextConnected ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <CircleDashed className="w-3.5 h-3.5" />}
                        {isTextConnected ? 'Text Input Connected' : 'Waiting for Text Input...'}
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium px-2 py-1 rounded-md border ${isImageConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {isImageConnected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <CircleDashed className="w-3.5 h-3.5" />}
                        {isImageConnected ? 'Image Input Connected' : 'Waiting for Image Input...'}
                    </div>
                </div>

                {/* Prompt Input Area */}
                <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Prompt</span>
                    <textarea
                        ref={textareaRef}
                        value={localPrompt}
                        onChange={handleInput}
                        placeholder="Describe what you want the AI to do..."
                        disabled={isExecuting}
                        className="w-full text-xs text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none transition-all duration-200 nodrag cursor-text min-h-[60px] disabled:opacity-50"
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Output Area */}
                {outputResult && (
                    <div className="flex flex-col gap-1 mt-1 bg-amber-50/50 p-2 rounded-md border border-amber-100/50">
                        <span className="text-[10px] font-semibold text-amber-600/80 uppercase tracking-wider">Output</span>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic line-clamp-3">
                            "{outputResult}"
                        </p>
                    </div>
                )}

                {/* Execute Button */}
                <button
                    onClick={handleExecute}
                    disabled={isExecuting || (!localPrompt.trim() && !isTextConnected && !isImageConnected)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold py-2 rounded-md transition-all active:scale-[0.98]"
                >
                    {isExecuting ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Running AI...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Run AI
                        </>
                    )}
                </button>

                {/* --- Handles --- */}
                {/* Left Inputs */}
                <div className="absolute left-0 top-1/4 flex flex-col gap-6 -translate-x-1/2">
                    <div className="relative group/handle flex items-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="text-in"
                            data-type="text"
                            className={`w-3.5 h-3.5 border-2 shadow-sm transition-all !static translate-x-0 translate-y-0 ${isTextConnected ? 'bg-blue-400 border-blue-400' : 'bg-white border-slate-300 hover:scale-125'}`}
                        />
                        <span className="absolute left-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Text Input
                        </span>
                    </div>
                    <div className="relative group/handle flex items-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="image-in"
                            data-type="image"
                            className={`w-3.5 h-3.5 border-2 shadow-sm transition-all !static translate-x-0 translate-y-0 ${isImageConnected ? 'bg-emerald-400 border-emerald-400' : 'bg-white border-slate-300 hover:scale-125'}`}
                        />
                        <span className="absolute left-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Image Input
                        </span>
                    </div>
                </div>

                {/* Right Output */}
                <div className="absolute right-0 top-1/2 flex flex-col justify-center translate-x-1/2 -translate-y-1/2">
                    <div className="relative group/handle flex items-center justify-end">
                        <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            LLM Output
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="llm-out"
                            data-type="llm_output"
                            className="w-3.5 h-3.5 bg-amber-400 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in React.memo to prevent unnecessary re-renders when internal state isn't changing
export const LLMNode = memo(LLMNodeComponent);
