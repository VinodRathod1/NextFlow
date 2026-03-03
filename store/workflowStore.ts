import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';

export type NodeType =
    | 'textNode'
    | 'imageNode'
    | 'videoNode'
    | 'llmNode'
    | 'cropNode'
    | 'extractFrameNode';

export type AppNode = Node & {
    type: NodeType;
    data: {
        label?: string;
        value?: any;
        executionStatus?: 'idle' | 'running' | 'completed' | 'failed';
        [key: string]: any;
    };
};

interface WorkflowState {
    nodes: AppNode[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (type: NodeType, position: { x: number; y: number }) => void;
    updateNodeData: (id: string, data: Partial<AppNode['data']>) => void;
    removeNode: (id: string) => void;
    clearWorkflow: () => void;
    setWorkflow: (nodes: AppNode[], edges: Edge[]) => void;
    currentWorkflowId: string | null;
    setCurrentWorkflowId: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    nodes: [],
    edges: [],
    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    addNode: (type: NodeType, position: { x: number; y: number }) => {
        const newNode: AppNode = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label: type },
        };
        set({ nodes: [...get().nodes, newNode] });
    },
    updateNodeData: (id: string, data: Partial<AppNode['data']>) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
        });
    },
    removeNode: (id: string) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== id),
            edges: get().edges.filter(
                (edge) => edge.source !== id && edge.target !== id
            ),
        });
    },
    clearWorkflow: () => {
        set({ nodes: [], edges: [], currentWorkflowId: null });
    },
    setWorkflow: (nodes: AppNode[], edges: Edge[]) => {
        set({ nodes, edges });
    },
    currentWorkflowId: null,
    setCurrentWorkflowId: (id: string | null) => {
        set({ currentWorkflowId: id });
    },
}));
