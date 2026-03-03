import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Handle, Position, useUpdateNodeInternals, useEdges, useNodes } from 'reactflow';
import { Crop as CropIcon, CheckCircle2, CircleDashed, Scissors, RefreshCcw, Loader2, XCircle } from 'lucide-react';
import { useWorkflowStore, AppNode } from '@/store/workflowStore';
import { uploadFile } from '@/lib/uploadFile';

interface CropNodeProps {
    id: string;
    data: {
        output?: {
            type: 'image';
            url: string;
        };
        executionStatus?: 'idle' | 'running' | 'success' | 'failed';
        [key: string]: any;
    };
}

// Bounding box for crop selection
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

function CropNodeComponent({ id, data }: CropNodeProps) {
    const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();
    const nodes = useNodes<AppNode['data']>();

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Connection State
    const connectedEdge = edges.find((edge) => edge.target === id && edge.targetHandle === 'image-in');
    const sourceNode = connectedEdge ? nodes.find((n) => n.id === connectedEdge.source) : null;
    const inputImageUrl = sourceNode?.data?.output?.blobUrl || sourceNode?.data?.output?.url;

    // Crop State
    const [cropRect, setCropRect] = useState<Rect | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [croppedResultUrl, setCroppedResultUrl] = useState<string | null>(data.output?.url || null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals, inputImageUrl]);

    // Reset local state if incoming image changes to avoid cropping the wrong thing
    useEffect(() => {
        setCropRect(null);
        setCroppedResultUrl(null);
    }, [inputImageUrl]);

    // Mouse Handlers for Crop Box Drawing
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag on the image surface, not if we already have a crop and are clicking outside
        if (!containerRef.current || croppedResultUrl) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDragging(true);
        setDragStart({ x, y });
        setCropRect({ x, y, width: 0, height: 0 }); // start point
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStart || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        const newX = Math.min(dragStart.x, currentX);
        const newY = Math.min(dragStart.y, currentY);
        const width = Math.abs(currentX - dragStart.x);
        const height = Math.abs(currentY - dragStart.y);

        setCropRect({ x: newX, y: newY, width, height });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Discard tiny clicks
        if (cropRect && (cropRect.width < 10 || cropRect.height < 10)) {
            setCropRect(null);
        }
    };

    const resetSelection = () => {
        setCropRect(null);
        setCroppedResultUrl(null);
        updateNodeData(id, { output: undefined });
    };

    const performCrop = useCallback(async () => {
        if (!imageRef.current || !cropRect || !containerRef.current || !inputImageUrl) return;

        try {
            updateNodeData(id, { executionStatus: 'running' });

            // 1. Fetch the blob from the current preview URL
            const response = await fetch(inputImageUrl);
            const blob = await response.blob();
            const file = new File([blob], "input-image.png", { type: blob.type });

            // 2. Upload using chunked upload utility
            const uploadData = await uploadFile(file);

            // Calculate the actual scale ratio
            const img = imageRef.current;
            const scaleX = img.naturalWidth / img.width;
            const scaleY = img.naturalHeight / img.height;

            const x = Math.round(cropRect.x * scaleX);
            const y = Math.round(cropRect.y * scaleY);
            const width = Math.round(cropRect.width * scaleX);
            const height = Math.round(cropRect.height * scaleY);

            // 3. Trigger the FFmpeg task
            const processRes = await fetch('/api/process-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'crop-image',
                    inputPath: uploadData.filePath, // Server filepath
                    crop: { x, y, width, height }
                })
            });

            const processData = await processRes.json();
            if (!processData.success) {
                throw new Error(processData.error || "Failed to process media.");
            }

            // 4. Update the node with the processed image URL
            setCroppedResultUrl(processData.publicUrl);

            updateNodeData(id, {
                executionStatus: 'success',
                output: {
                    type: 'image',
                    url: processData.publicUrl
                }
            });
            setErrorMsg(null); // Clear errors on success

        } catch (error: any) {
            console.error("Crop error:", error);
            updateNodeData(id, { executionStatus: 'failed' });

            // Categorize Error
            let message = "Server processing failed";
            if (error.message?.includes("fetch") || error.message?.includes("Network")) {
                message = "Worker unavailable";
            } else if (error.message?.includes("Invalid") || error.message?.includes("Unsupported")) {
                message = "Unsupported media";
            } else if (error.message) {
                message = error.message;
            }

            setErrorMsg(message);

            // Auto-clear after 4 seconds
            setTimeout(() => {
                setErrorMsg(null);
                // Optionally reset execution status if it's still 'failed' so the node doesn't stay red forever,
                // but usually we keep it failed until retried. We'll just clear the message text for cleaner UI.
            }, 4000);
        }
    }, [cropRect, id, inputImageUrl, updateNodeData]);

    // Styling helper for the crop box
    const overlayStyle = useMemo(() => {
        if (!cropRect) return {};
        return {
            left: `${cropRect.x}px`,
            top: `${cropRect.y}px`,
            width: `${cropRect.width}px`,
            height: `${cropRect.height}px`,
        };
    }, [cropRect]);

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
            <div className={`px-3 py-2 border-b flex items-center justify-between rounded-t-[10px] z-20 w-full ${executionStatus === 'running' ? 'bg-amber-50/80 border-amber-200' :
                executionStatus === 'success' ? 'bg-emerald-50/80 border-emerald-200' :
                    executionStatus === 'failed' ? 'bg-red-50/80 border-red-200' :
                        'bg-rose-50/50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <CropIcon className={`w-4 h-4 ${executionStatus === 'running' ? 'text-amber-500' :
                        executionStatus === 'success' ? 'text-emerald-500' :
                            executionStatus === 'failed' ? 'text-red-500' :
                                'text-rose-500'
                        }`} />
                    <span className="text-sm font-semibold text-slate-700 tracking-wide">
                        Crop Image
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

            <div className="p-3 bg-white rounded-b-xl relative flex flex-col gap-3 min-h-[120px]">
                {/* Input Connections Display */}
                <div className="flex flex-col gap-1.5 pt-1">
                    <div className={`flex items-center gap-2 text-[11px] font-medium px-2 py-1 rounded-md border ${inputImageUrl ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {inputImageUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <CircleDashed className="w-3.5 h-3.5" />}
                        {inputImageUrl ? 'Image Connected' : 'Connect an image input'}
                    </div>
                </div>

                {/* Main Interface */}
                {inputImageUrl ? (
                    <div className="flex flex-col gap-2 relative mt-1">
                        {/* Visualizer */}
                        <div
                            ref={containerRef}
                            className={`relative rounded overflow-hidden select-none bg-slate-900 flex items-center justify-center border border-slate-200 ${!croppedResultUrl ? 'cursor-crosshair' : ''} nodrag`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={croppedResultUrl || inputImageUrl}
                                ref={imageRef}
                                src={croppedResultUrl || inputImageUrl}
                                alt="Crop target"
                                draggable={false}
                                className={`max-h-[160px] w-full object-contain block pointer-events-none transition-opacity duration-300 ${executionStatus === 'running' ? 'opacity-50' : 'opacity-100'}`}
                            />

                            {/* Processing Overlay */}
                            {executionStatus === 'running' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[1px] z-30">
                                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                                    <span className="text-xs font-semibold text-white drop-shadow-md">Processing on server...</span>
                                </div>
                            )}

                            {/* Success Overlay */}
                            {executionStatus === 'success' && croppedResultUrl && (
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-30 animate-in fade-in zoom-in duration-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    SUCCESS
                                </div>
                            )}

                            {/* Rendering the crop selection rectangle only if not finished */}
                            {cropRect && !croppedResultUrl && (
                                <>
                                    {/* Darkening overlay for everything OUTSIDE the crop */}
                                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                                    {/* The transparent cutout window */}
                                    <div
                                        className="absolute border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none"
                                        style={overlayStyle}
                                    >
                                        {/* Simulated Handles */}
                                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm" />
                                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm" />
                                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm" />
                                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm" />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={performCrop}
                                disabled={!cropRect || !!croppedResultUrl || executionStatus === 'running'}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[11px] font-semibold py-1.5 rounded-md transition-all"
                            >
                                {executionStatus === 'running' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Scissors className="w-3.5 h-3.5" />
                                )}
                                {executionStatus === 'running' ? 'Cropping...' : 'Crop Image'}
                            </button>

                            <button
                                onClick={resetSelection}
                                disabled={(!cropRect && !croppedResultUrl) || executionStatus === 'running'}
                                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-[11px] font-semibold px-2.5 rounded-md transition-all"
                                title="Reset Selection"
                            >
                                <RefreshCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Error Message */}
                        {executionStatus === 'failed' && errorMsg && (
                            <div className="mt-1 text-[10px] text-red-500 w-full text-center font-medium bg-red-50 p-1.5 rounded animate-in fade-in zoom-in duration-200">
                                {errorMsg}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                        <CropIcon className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-xs text-center font-medium opacity-60">Waiting for data...</span>
                    </div>
                )}

                {/* --- Handles --- */}
                <Handle
                    type="target"
                    position={Position.Left}
                    id="image-in"
                    data-type="image"
                    className={`w-3.5 h-3.5 border-2 shadow-sm transition-all !absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 ${inputImageUrl ? 'bg-emerald-400 border-emerald-400' : 'bg-white border-slate-300 hover:scale-125'}`}
                />

                <div className="absolute right-0 top-1/2 flex flex-col justify-center translate-x-1/2 -translate-y-1/2">
                    <div className="relative group/handle flex items-center justify-end">
                        <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Crop Output (image)
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="image-out"
                            data-type="image"
                            className="w-3.5 h-3.5 bg-rose-400 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in React.memo to prevent unnecessary re-renders when internal state isn't changing
export const CropNode = memo(CropNodeComponent);
