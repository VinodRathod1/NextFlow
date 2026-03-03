export type NodeDataType = 'text' | 'image' | 'video' | 'llm_output' | 'any';

export interface HandleDefinition {
    id: string;
    type: NodeDataType;
    label: string;
}

export interface NodeTypeDefinition {
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
}

export const NODE_DEFINITIONS: Record<string, NodeTypeDefinition> = {
    textNode: {
        inputs: [],
        outputs: [{ id: 'text-out', type: 'text', label: 'Text' }],
    },
    imageNode: {
        inputs: [],
        outputs: [{ id: 'image-out', type: 'image', label: 'Image' }],
    },
    videoNode: {
        inputs: [],
        outputs: [{ id: 'video-out', type: 'video', label: 'Video' }],
    },
    llmNode: {
        inputs: [
            { id: 'text-in', type: 'text', label: 'Text Input' },
            { id: 'image-in', type: 'image', label: 'Image Input' },
        ],
        outputs: [{ id: 'llm-out', type: 'llm_output', label: 'Output' }],
    },
    cropNode: {
        inputs: [{ id: 'image-in', type: 'image', label: 'Image Input' }],
        outputs: [{ id: 'image-out', type: 'image', label: 'Cropped Image' }],
    },
    extractFrameNode: {
        inputs: [{ id: 'video-in', type: 'video', label: 'Video Input' }],
        outputs: [{ id: 'image-out', type: 'image', label: 'Frame Image' }],
    },
};

export function validateConnection(
    sourceType: NodeDataType,
    targetType: NodeDataType
): boolean {
    if (sourceType === 'any' || targetType === 'any') return true;
    if (sourceType === targetType) return true;

    // Specific allowed mappings based on routing logic
    if (sourceType === 'llm_output' && targetType === 'text') return true;

    // Currently the only other place specific mappings arrive is into the LLM node:
    // We already check if `targetType` explicitly asks for 'text' or 'image' within the target handles,
    // so if sourceType === 'text' and targetType === 'text', the `sourceType === targetType` line catches it!
    // Therefore, if it didn't catch, the connection is strictly invalid.

    return false;
}
