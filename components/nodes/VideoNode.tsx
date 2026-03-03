import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { Video as VideoIcon, UploadCloud, X, Film, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { uploadFile } from '@/lib/uploadFile';

interface VideoNodeProps {
    id: string;
    data: {
        output?: {
            type: 'video';
            url: string;
            localPath?: string;
            thumbnail: string;
        };
        executionStatus?: 'idle' | 'running' | 'success' | 'failed';
        [key: string]: any;
    };
    [key: string]: any;
};

function VideoNodeComponent({ id, data }: VideoNodeProps) {
    const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
    const updateNodeInternals = useUpdateNodeInternals();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isHovering, setIsHovering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    // Read initial from store if it exists
    const [previewUrl, setPreviewUrl] = useState<string | null>(data.output?.url || null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(data.output?.thumbnail || null);

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, previewUrl, updateNodeInternals]);

    // Generate thumbnail from the video element once it's able to play
    const handleVideoLoadedMetadata = useCallback(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        // Seek to 1 second (or the end if it's shorter than 1 second)
        video.currentTime = Math.min(1, video.duration || 0);
    }, []);

    const handleSeeked = useCallback(() => {
        if (!videoRef.current || thumbnailUrl) return; // Don't regenerate if we already have it
        const video = videoRef.current;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setThumbnailUrl(dataUrl);

                // Now save everything to store since we have both pieces
                if (previewUrl) {
                    const latestNode = useWorkflowStore.getState().nodes.find(n => n.id === id);
                    const latestOutput = latestNode?.data?.output || {};

                    updateNodeData(id, {
                        output: {
                            ...latestOutput, // Preserve localPath from latest state
                            type: 'video',
                            url: previewUrl,
                            thumbnail: dataUrl,
                        },
                    });
                }
            }
        } catch (err) {
            console.error('Error generating video thumbnail:', err);
        }
    }, [id, previewUrl, thumbnailUrl, updateNodeData]);

    const handleFile = async (file: File | null) => {
        setError(null);
        if (!file) return;

        // Validate type
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            setError('Invalid format. Please upload MP4, WEBM, or MOV.');
            return;
        }

        // Create local blob URL for instant feedback (no network needed)
        const localBlobUrl = URL.createObjectURL(file);
        setPreviewUrl(localBlobUrl);
        setFileName(file.name);
        setIsUploading(true);
        setThumbnailUrl(null);

        // Update store immediately with blob URL so downstream nodes (Extract Frame) can see it too
        updateNodeData(id, {
            output: {
                type: 'video',
                url: localBlobUrl,
                thumbnail: '',
            }
        });

        try {
            // Chunked upload — handles files > 10MB automatically
            const uploadData = await uploadFile(file);

            // Update store with permanent publicUrl and localPath for FFmpeg
            updateNodeData(id, {
                output: {
                    type: 'video',
                    url: uploadData.publicUrl,
                    blobUrl: localBlobUrl,
                    localPath: uploadData.filePath,
                    thumbnail: thumbnailUrl || '',
                }
            });

        } catch (err: any) {
            setError(err.message || 'Upload failed');
            console.error('Video upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(true);
    };

    const onDragLeave = () => {
        setIsHovering(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);

        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const clearVideo = () => {
        setPreviewUrl(null);
        setThumbnailUrl(null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        updateNodeData(id, {
            output: undefined,
        });
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
                        'bg-purple-50/50 border-slate-100'
                }`}>
                <div className="flex items-center gap-2">
                    <Film className={`w-3.5 h-3.5 ${executionStatus === 'running' ? 'text-amber-500' :
                        executionStatus === 'success' ? 'text-emerald-500' :
                            executionStatus === 'failed' ? 'text-red-500' :
                                'text-purple-500'
                        }`} />
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Video
                    </span>
                </div>

                <div className="flex items-center gap-2">
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

                    {previewUrl && (
                        <button
                            onClick={clearVideo}
                            className="text-slate-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 rounded-full p-1 ml-1"
                            title="Remove video"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Body: Upload Area or Preview */}
            <div className="p-3 bg-white rounded-b-xl relative min-h-[100px] flex flex-col items-center justify-center">
                {!previewUrl ? (
                    <div
                        className={`w-full h-full min-h-[100px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors ${isHovering ? 'border-purple-400 bg-purple-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                            }`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFile(e.target.files?.[0] || null)}
                            accept="video/mp4, video/webm, video/quicktime"
                            className="hidden"
                        />
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-slate-500 font-medium tracking-wide">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className={`w-6 h-6 mb-2 ${isHovering ? 'text-purple-500' : 'text-slate-400'}`} />
                                <span className="text-xs font-medium text-slate-600">
                                    Click or drop video
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">MP4, WEBM, MOV</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex flex-col gap-2">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                            <video
                                key={previewUrl}
                                ref={videoRef}
                                src={previewUrl}
                                controls
                                onLoadedMetadata={handleVideoLoadedMetadata}
                                onSeeked={handleSeeked}
                                className="max-h-[140px] w-full object-contain nodrag"
                            />
                        </div>

                        {/* Info overlay below player */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[140px]" title={fileName || 'video file'}>
                                {fileName || 'video file'}
                            </span>

                            {thumbnailUrl && (
                                <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                    <VideoIcon className="w-3 h-3" />
                                    Frame Cap
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-2 text-[10px] text-red-500 w-full text-center font-medium bg-red-50 p-1.5 rounded">
                        {error}
                    </div>
                )}

                {/* Output Handle */}
                <div className="absolute right-0 top-1/2 flex flex-col justify-center translate-x-1/2 -translate-y-1/2">
                    <div className="relative group/handle flex items-center justify-end">
                        <span className="absolute right-4 opacity-0 group-hover/handle:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                            Video Output (video)
                        </span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="video-out"
                            data-type="video"
                            className="w-3.5 h-3.5 bg-purple-400 border-2 border-white shadow-sm transition-all hover:scale-125 hover:shadow-md !static translate-x-0 translate-y-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap in React.memo to prevent unnecessary re-renders when preview is unchanged
export const VideoNode = memo(VideoNodeComponent);
