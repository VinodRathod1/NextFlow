import { Edge } from 'reactflow';
import { AppNode, NodeType } from '@/store/workflowStore';
import { logger } from '../logger';

export type ExecutionResult = Record<string, any>;

/**
 * Simulates executing a single node based on its type and current data
 * In a real application, this would call APIs or run heavier processing logic
 */
async function executeNode(
    node: AppNode,
    inputs: Record<string, any>,
    updateNodeData?: (id: string, data: any) => void
): Promise<any> {
    const { type, data } = node;

    // Simulate processing time for non-LLM nodes so UI updates are visible
    if (type !== 'llmNode') {
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    switch (type as NodeType) {
        case 'textNode':
            if (!data.value) throw new Error('Text node missing value');
            return { type: 'text', value: data.value };

        case 'imageNode':
            if (!data.output?.url) throw new Error('Image node missing uploaded URL');
            return { type: 'image', url: data.output.url };

        case 'videoNode':
            if (!data.output?.url) throw new Error('Video node missing uploaded URL or thumbnail');
            return {
                type: 'video',
                url: data.output.url,
                thumbnail: data.output.thumbnail,
            };

        case 'cropNode':
            // If a manual crop was performed, use the cropped result
            if (data.output?.url) {
                return { type: 'image', url: data.output.url };
            }
            // Otherwise, pass through the connected input image as-is
            if (inputs['image-in'] && inputs['image-in'].url) {
                return { type: 'image', url: inputs['image-in'].url };
            }
            throw new Error('Crop node is missing an input image');

        case 'extractFrameNode':
            if (!data.output?.url) {
                throw new Error('Extract Frame node requires a manual capture action before execution');
            }
            return { type: 'image', url: data.output.url };

        case 'llmNode': {
            let combinedPrompt = data.prompt || '';
            const systemPrompt = data.systemPrompt || '';
            const images: { base64: string; mimeType: string }[] = [];

            // Gather inputs from connected nodes
            for (const [key, value] of Object.entries(inputs)) {
                if (value && value.type === 'text') {
                    combinedPrompt += (combinedPrompt ? '\n\n' : '') + value.value;
                } else if (value && value.type === 'image' && value.url) {
                    try {
                        const response = await fetch(value.url);
                        const blob = await response.blob();
                        const buffer = await blob.arrayBuffer();

                        // Buffer object isn't available natively in the browser without polyfills sometimes.
                        // Let's use standard Base64 conversion
                        const base64String = btoa(
                            new Uint8Array(buffer)
                                .reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );

                        images.push({ base64: base64String, mimeType: blob.type });
                    } catch (err) {
                        console.error('Failed to read image for LLM:', err);
                        throw new Error('Failed to process incoming image data');
                    }
                }
            }

            if (!combinedPrompt && images.length === 0) {
                throw new Error('LLM Node requires a prompt or image input');
            }

            const response = await fetch('/api/run-llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: combinedPrompt, systemPrompt, images })
            });

            if (!response.ok) {
                let errMessage = 'Failed to trigger LLM task';
                try {
                    const errorData = await response.json();
                    if (errorData.error) errMessage = errorData.error;
                } catch (e) { }
                throw new Error(errMessage);
            }

            // Handle streaming response
            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;

                    // Update the node data in real-time for visual streaming feedback
                    if (updateNodeData) {
                        updateNodeData(node.id, {
                            output: {
                                type: 'llm_output',
                                value: fullText
                            }
                        });
                    }
                }
            } finally {
                reader.releaseLock();
            }

            const outputText = fullText || "No response generated";

            return { type: 'llm_output', value: outputText };
        }

        default:
            throw new Error(`Unknown node type: ${type}`);
    }
}

import { NodeExecutionLog } from '@/store/historyStore';
import { createRun, completeRun, failRun } from '../executionLogger';

// Helper to get a human-readable name for a node
function getNodeTitle(type: string): string {
    switch (type) {
        case 'textNode': return 'Text';
        case 'imageNode': return 'Upload Image';
        case 'videoNode': return 'Upload Video';
        case 'cropNode': return 'Crop Image';
        case 'extractFrameNode': return 'Extract Frame';
        case 'llmNode': return 'Run LLM';
        default: return type;
    }
}

export async function executeWorkflow(
    workflowId: string,
    nodes: AppNode[],
    edges: Edge[],
    updateNodeData: (id: string, data: any) => void
): Promise<{ results: ExecutionResult, nodeLogs: NodeExecutionLog[] }> {
    const results: ExecutionResult = {};
    const nodeLogs: NodeExecutionLog[] = [];

    // Log the run in the database
    const dbRun = await createRun(workflowId);

    try {
        // 1. Build adjacency list for incoming dependencies
        // node id -> list of incoming node ids
        const dependencies: Record<string, string[]> = {};
        // node id -> mapping of { targetHandle -> sourceNodeId }
        const inputMap: Record<string, Record<string, string>> = {};

        nodes.forEach((node) => {
            dependencies[node.id] = [];
            inputMap[node.id] = {};
        });

        edges.forEach((edge) => {
            if (dependencies[edge.target]) {
                dependencies[edge.target].push(edge.source);
            }
            if (inputMap[edge.target] && edge.targetHandle) {
                inputMap[edge.target][edge.targetHandle] = edge.source;
            }
        });

        // Track execution states
        const completed = new Set<string>();
        const inProgress = new Set<string>();
        const pending = new Set<string>(nodes.map(n => n.id));

        // 2. Execution Loop
        while (pending.size > 0) {
            // Find all nodes that are ready to run (all incoming dependencies are in the 'completed' set)
            const readyNodes = Array.from(pending).filter((nodeId) => {
                const nodeDeps = dependencies[nodeId];
                return nodeDeps.every((depId) => completed.has(depId));
            });

            // If we have pending nodes but nothing is ready, we have a circular dependency or dangling edge
            if (readyNodes.length === 0) {
                throw new Error('Workflow contains circular dependencies or unresolvable nodes.');
            }

            // Move ready nodes to in-progress queue
            readyNodes.forEach(id => {
                pending.delete(id);
                inProgress.add(id);
            });

            // 3. Parallel Execution step
            // We fire off Promise.all for all nodes in the current topological layer
            await Promise.all(
                readyNodes.map(async (nodeId) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (!node) return;

                    // Gather the actual input values from previously completed nodes
                    const nodeInputs: Record<string, any> = {};
                    const requiredInputs = inputMap[nodeId];

                    for (const [targetHandle, sourceNodeId] of Object.entries(requiredInputs)) {
                        // We know sourceNodeId is in `results` because it's guaranteed by the dependency check above
                        nodeInputs[targetHandle] = results[sourceNodeId];
                    }

                    const startTime = performance.now();
                    const nodeTitle = getNodeTitle(node.type as string);

                    try {
                        logger.info(`Executing node: ${nodeId} (${node.type})`);

                        // Mark as running visually
                        updateNodeData(nodeId, { executionStatus: 'running' });

                        const output = await executeNode(node, nodeInputs, updateNodeData);
                        results[nodeId] = output;

                        const endTime = performance.now();
                        const duration = Math.round(endTime - startTime);

                        // Mark as completed visually
                        updateNodeData(nodeId, { executionStatus: 'success' });

                        nodeLogs.push({
                            nodeId,
                            nodeTitle,
                            status: 'success',
                            startTime,
                            endTime,
                            duration,
                            output
                        });

                    } catch (error: any) {
                        logger.warn(`WARNING: Skipping node ${nodeId} due to error: ${error.message}`);
                        results[nodeId] = null;

                        const endTime = performance.now();
                        const duration = Math.round(endTime - startTime);

                        // Mark as failed visually
                        updateNodeData(nodeId, { executionStatus: 'failed' });

                        nodeLogs.push({
                            nodeId,
                            nodeTitle,
                            status: 'failed',
                            startTime,
                            endTime,
                            duration,
                            output: null,
                            error: error.message
                        });
                    } finally {
                        inProgress.delete(nodeId);
                        completed.add(nodeId);
                    }
                })
            );
        }

        // Sort logs by start time so the UI renders them in the actual order they fired
        nodeLogs.sort((a, b) => a.startTime - b.startTime);

        // Mark database run as completed successfully
        await completeRun(dbRun.id, results);

        return { results, nodeLogs };
    } catch (err) {
        await failRun(dbRun.id, err);
        throw err;
    }
}

export async function runSingleNode(
    node: AppNode,
    nodes: AppNode[],
    edges: Edge[],
    updateNodeData: (id: string, data: any) => void
): Promise<any> {
    // Gather inputs for this specific node
    const inputMap = edges
        .filter(edge => edge.target === node.id && edge.targetHandle)
        .reduce((acc, edge) => {
            acc[edge.targetHandle!] = edge.source;
            return acc;
        }, {} as Record<string, string>);

    const nodeInputs: Record<string, any> = {};
    for (const [targetHandle, sourceNodeId] of Object.entries(inputMap)) {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (sourceNode?.data?.output) {
            nodeInputs[targetHandle] = sourceNode.data.output;
        }
    }

    try {
        updateNodeData(node.id, { executionStatus: 'running' });
        const output = await executeNode(node, nodeInputs, updateNodeData);
        updateNodeData(node.id, { executionStatus: 'success', output });
        return output;
    } catch (error: any) {
        updateNodeData(node.id, { executionStatus: 'failed' });
        throw error;
    }
}
