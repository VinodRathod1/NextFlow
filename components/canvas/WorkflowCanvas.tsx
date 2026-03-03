'use client';

import { useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    Panel,
    useReactFlow,
    Connection,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore, NodeType } from '@/store/workflowStore';
import { BaseNode } from '../nodes/BaseNode';
import { validateConnection, NodeDataType, NODE_DEFINITIONS } from '@/lib/nodeTypes';

import { TextNode } from '../nodes/TextNode';

import { ImageNode } from '../nodes/ImageNode';
import { VideoNode } from '../nodes/VideoNode';
import { LLMNode } from '../nodes/LLMNode';
import { CropNode } from '../nodes/CropNode';
import { ExtractFrameNode } from '../nodes/ExtractFrameNode';

// Map all our custom types to the BaseNode component for now
const nodeTypes = {
    textNode: TextNode,
    imageNode: ImageNode,
    videoNode: VideoNode,
    llmNode: LLMNode,
    cropNode: CropNode,
    extractFrameNode: ExtractFrameNode,
};

const defaultEdgeOptions = {
    style: { stroke: '#a855f7', strokeWidth: 2 },
    animated: true,
    type: 'smoothstep',
};

export function WorkflowCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition, getViewport } = useReactFlow();

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect: storeOnConnect,
        addNode
    } = useWorkflowStore();

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current) return;

            const type = event.dataTransfer.getData('application/reactflow') as NodeType;

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            // Important: React Flow requires the position relative to the canvas itself
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addNode(type, position);
        },
        [screenToFlowPosition, addNode]
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);

            if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
                console.warn('Invalid connection: Self connections are not allowed.');
                return;
            }

            // Check if target handle is already connected
            const isTargetConnected = edges.some(
                (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle
            );

            if (isTargetConnected) {
                console.warn('Invalid connection: Target handle is already connected.');
                return;
            }

            // Instead of querying the DOM (which can be flaky depending on React Flow's render tree),
            // let's look up the actual required types directly from our central schema via node type!
            const sourceNodeType = sourceNode.type;
            const targetNodeType = targetNode.type;

            if (!sourceNodeType || !targetNodeType) return;

            const sourceNodeDef = (NODE_DEFINITIONS as any)[sourceNodeType];
            const targetNodeDef = (NODE_DEFINITIONS as any)[targetNodeType];

            if (!sourceNodeDef || !targetNodeDef) return;

            // Find the specific handles matching the connection IDs
            const sourceHandleDef = sourceNodeDef.outputs.find((h: any) => h.id === connection.sourceHandle);
            const targetHandleDef = targetNodeDef.inputs.find((h: any) => h.id === connection.targetHandle);

            const sourceType = sourceHandleDef?.type || 'any';
            const targetType = targetHandleDef?.type || 'any';

            if (!validateConnection(sourceType, targetType)) {
                console.warn(`Invalid connection: Cannot connect ${sourceType} to ${targetType}`);
                return;
            }

            storeOnConnect(connection);
        },
        [nodes, edges, storeOnConnect]
    );

    return (
        <div className="reactflow-wrapper h-full w-full bg-slate-50 relative flex-grow" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 2 }}
                snapToGrid
                snapGrid={[15, 15]}
                defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
                className="transition-opacity duration-500 ease-in-out"
            >
                <Background
                    color="#cbd5e1"
                    gap={15}
                    size={1.5}
                    variant={BackgroundVariant.Dots}
                />
                <Controls
                    className="bg-white border-slate-200 fill-slate-600 shadow-sm rounded-md overflow-hidden"
                    showInteractive={false}
                />
                <MiniMap
                    className="rounded-lg shadow-md border border-slate-200 overflow-hidden bg-white/50 backdrop-blur-sm"
                    nodeColor="#94a3b8"
                    maskColor="rgba(248, 250, 252, 0.7)"
                    zoomable
                    pannable
                />

                <Panel position="top-left" className="m-4 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-500">
                        Canvas
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
