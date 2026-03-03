import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { Type, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useDebounce } from '@/hooks/useDebounce';

interface TextNodeProps {
    id: string;
    data: {
        value?: string;
        executionStatus?: 'idle' | 'running' | 'success' | 'failed';
        [key: string]: any;
    };
}

function TextNodeComponent({ id, data }: TextNodeProps) {
    const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
    const updateNodeInternals = useUpdateNodeInternals();

    // Local state for instant typing feel
    const [localText, setLocalText] = useState(data.value || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Debounce the update to the global store by 150ms
    const debouncedText = useDebounce(localText, 150);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    // Sync to store when debounced value changes
    useEffect(() => {
        updateNodeData(id, {
            value: debouncedText,
            // Provide typing explicitly for connections based on schema rules
            type: 'text',
            label: 'Text',
        });
    }, [debouncedText, id, updateNodeData]);

    // Handle auto-resizing
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalText(e.target.value);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    // Compute dynamic border/shadow based on execution status
    const { executionStatus } = data;
    let containerClasses = "bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 w-[240px] overflow-visible group flex flex-col relative ";
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
            <div className={`px-3 py-2 border-b flex items-center justify-between rounded-t-[10px] z-10 w-full ${executionStatus === 'running' ? 'bg-amber-50/80 border-amber-200' :
                    executionStatus === 'success' ? 'bg-emerald-50/80 border-emerald-200' :
                        executionStatus === 'failed' ? 'bg-red-50/80 border-red-200' :
                            'bg-blue-50/50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <Type className={`w-3.5 h-3.5 ${executionStatus === 'running' ? 'text-amber-500' :
                            executionStatus === 'success' ? 'text-emerald-500' :
                                executionStatus === 'failed' ? 'text-red-500' :
                                    'text-blue-500'
                        }`} />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Text
                    </span>
                </div>

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

            {/* Body: Textarea */}
            <div className="p-3 bg-white rounded-b-xl relative">
                <textarea
                    ref={textareaRef}
                    value={localText}
                    onChange={handleInput}
                    placeholder="Enter text..."
                    className="w-full text-sm text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 resize-none transition-all duration-200 nodrag cursor-text min-h-[60px]"
                    // Prevent React Flow from capturing drag events when typing
                    onKeyDown={(e) => e.stopPropagation()}
                />

                {/* Output Handle */}
                <div className="absolute right-0 top-1/2 flex flex-col justify-center translate-x-1/2 -translate-y-1/2">
                    <div className="relative group/handle flex items-center justify-end">
                        <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Text Output (text)
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="text-out"
                            data-type="text"
                            className="w-3.5 h-3.5 bg-blue-400 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in React.memo to prevent unnecessary re-renders of the node shell itself
export const TextNode = memo(TextNodeComponent);
