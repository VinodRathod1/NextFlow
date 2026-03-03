import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, useUpdateNodeInternals, useEdges, useNodes } from 'reactflow';
import { SquareMousePointer, CheckCircle2, CircleDashed, Camera, RefreshCcw, Play, Pause, Loader2, XCircle } from 'lucide-react';
import { useWorkflowStore, AppNode, NodeType } from '@/store/workflowStore';

interface ExtractFrameNodeProps {
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

function ExtractFrameNodeComponent({ id, data }: ExtractFrameNodeProps) {
    const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();
    const nodes = useNodes<AppNode['data']>();

    const videoRef = useRef<HTMLVideoElement>(null);

    // Connection State
    const connectedEdge = edges.find((edge) => edge.target === id && edge.targetHandle === 'video-in');
    const sourceNode = connectedEdge ? nodes.find((n) => n.id === connectedEdge.source) : null;
    const inputVideoUrl = sourceNode?.data?.output?.blobUrl || sourceNode?.data?.output?.url;
    const inputLocalPath = sourceNode?.data?.output?.localPath;

    // Local State
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(1); // Default to 1 second
    const [isPlaying, setIsPlaying] = useState(false);
    const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(data.output?.url || null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals, inputVideoUrl, extractedFrameUrl]);

    // Reset local state if incoming video changes
    useEffect(() => {
        setExtractedFrameUrl(null);
        setCurrentTime(1);
        setIsPlaying(false);
    }, [inputVideoUrl]);

    // Video Event Handlers
    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
            // Ensure we seek to the default 1s mark if the video is at least that long
            videoRef.current.currentTime = Math.min(1, videoRef.current.duration || 0);
        }
    }, []);

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current && isPlaying) {
            setCurrentTime(videoRef.current.currentTime);
        }
    }, [isPlaying]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);

        if (videoRef.current) {
            // Pause video if scrubbing
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
            videoRef.current.currentTime = time;
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !inputVideoUrl || !inputLocalPath) {
            console.error("Missing video source or physical path");
            if (!inputLocalPath) setErrorMsg("Video path missing. Please try re-uploading.");
            return;
        }

        try {
            updateNodeData(id, { executionStatus: 'running' });

            // Trigger the FFmpeg task
            const processRes = await fetch('/api/process-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'extract-frame',
                    inputPath: inputLocalPath, // Server filepath
                    timestamp: currentTime,
                })
            });

            const processData = await processRes.json();
            if (!processData.success) {
                throw new Error(processData.error || "Failed to process media.");
            }

            // Update the node with the processed image URL
            setExtractedFrameUrl(processData.publicUrl);

            updateNodeData(id, {
                executionStatus: 'success',
                output: {
                    type: 'image',
                    url: processData.publicUrl
                }
            });
            setErrorMsg(null); // Clear errors on success

        } catch (error: any) {
            console.error("Extract frame error:", error);
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
            }, 4000);
        }
    }, [id, inputVideoUrl, inputLocalPath, currentTime, updateNodeData]);

    const resetCapture = () => {
        setExtractedFrameUrl(null);
        updateNodeData(id, { output: undefined });
    };

    // Compute dynamic border/shadow based on execution status
    const { executionStatus } = data;
    let containerClasses = "bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 w-[260px] overflow-visible group flex flex-col relative ";
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
                        'bg-indigo-50/50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <SquareMousePointer className={`w-4 h-4 ${executionStatus === 'running' ? 'text-amber-500' :
                        executionStatus === 'success' ? 'text-emerald-500' :
                            executionStatus === 'failed' ? 'text-red-500' :
                                'text-indigo-500'
                        }`} />
                    <span className="text-sm font-semibold text-slate-700 tracking-wide">
                        Extract Frame
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
                    <div className={`flex items-center gap-2 text-[11px] font-medium px-2 py-1 rounded-md border ${inputVideoUrl ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {inputVideoUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" /> : <CircleDashed className="w-3.5 h-3.5" />}
                        {inputVideoUrl ? 'Video Connected' : 'Connect a video input'}
                    </div>
                </div>

                {/* Main Interface */}
                {inputVideoUrl ? (
                    <div className="flex flex-col gap-3 relative mt-1">
                        {/* Visualizer */}
                        <div className="relative rounded overflow-hidden select-none bg-slate-900 border border-slate-200">
                            <video
                                key={inputVideoUrl} // Force remount if URL changes (e.g. from blob to server)
                                ref={videoRef}
                                src={inputVideoUrl}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => setIsPlaying(false)}
                                className="max-h-[140px] w-full object-contain block nodrag"
                                playsInline
                                muted
                            />
                        </div>

                        {/* Playback Controls & Scrubber */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 px-1">
                                <button
                                    onClick={togglePlay}
                                    className="text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none"
                                >
                                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                </button>

                                <input
                                    type="range"
                                    min={0}
                                    max={duration > 0 ? duration : 100}
                                    step={0.01}
                                    value={currentTime}
                                    onChange={handleSliderChange}
                                    disabled={duration === 0}
                                    className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 nodrag disabled:opacity-30"
                                />
                            </div>

                            <div className="flex justify-between items-center px-1 text-[10px] font-mono text-slate-500">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Action Buttons & Results */}
                        <div className="flex flex-col gap-2 mt-1">
                            <div className="flex gap-2">
                                <button
                                    onClick={captureFrame}
                                    disabled={executionStatus === 'running'}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[11px] font-semibold py-1.5 rounded-md transition-all"
                                >
                                    {executionStatus === 'running' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Camera className="w-3.5 h-3.5" />
                                    )}
                                    {executionStatus === 'running' ? 'Extracting...' : 'Capture Frame'}
                                </button>

                                {extractedFrameUrl && (
                                    <button
                                        onClick={resetCapture}
                                        disabled={executionStatus === 'running'}
                                        className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-[11px] font-semibold px-2.5 rounded-md transition-all"
                                        title="Reset Capture"
                                    >
                                        <RefreshCcw className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Processing Overlay inside Results Area */}
                            {executionStatus === 'running' && !extractedFrameUrl && (
                                <div className="flex flex-col items-center justify-center p-3 mt-1 bg-slate-50 border border-slate-200 rounded-md">
                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mb-1.5" />
                                    <span className="text-[10px] font-semibold text-slate-500">Processing on server...</span>
                                </div>
                            )}

                            {extractedFrameUrl && executionStatus === 'success' && (
                                <div className="flex items-center gap-2 p-1.5 bg-emerald-50 border border-emerald-100 rounded-md mt-1 animate-in fade-in zoom-in duration-200 relative">
                                    {/* Success Badge */}
                                    <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                    </div>

                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={extractedFrameUrl}
                                        alt="Captured frame"
                                        className="w-10 h-10 object-cover rounded bg-slate-200 shadow-sm border border-emerald-200"
                                    />
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[10px] font-bold text-emerald-700">SUCCESS</span>
                                        <span className="text-[9px] font-semibold text-slate-600">Frame Captured at</span>
                                        <span className="text-[10px] font-mono text-emerald-600">{formatTime(currentTime)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {executionStatus === 'failed' && errorMsg && (
                                <div className="mt-1 text-[10px] text-red-500 w-full text-center font-medium bg-red-50 p-1.5 rounded animate-in fade-in zoom-in duration-200">
                                    {errorMsg}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                        <SquareMousePointer className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-xs text-center font-medium opacity-60">Waiting for data...</span>
                    </div>
                )}

                {/* --- Handles --- */}
                <Handle
                    type="target"
                    position={Position.Left}
                    id="video-in"
                    data-type="video"
                    className={`w-3.5 h-3.5 border-2 shadow-sm transition-all !absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 ${inputVideoUrl ? 'bg-purple-400 border-purple-400' : 'bg-white border-slate-300 hover:scale-125'}`}
                />

                <div className="absolute right-0 top-1/2 flex flex-col justify-center translate-x-1/2 -translate-y-1/2">
                    <div className="relative group/handle flex items-center justify-end">
                        <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Frame Output (image)
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="image-out"
                            data-type="image"
                            className="w-3.5 h-3.5 bg-indigo-400 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in React.memo to prevent unnecessary re-renders when internal state isn't changing
export const ExtractFrameNode = memo(ExtractFrameNodeComponent);
