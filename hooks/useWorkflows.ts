import { useState, useEffect } from 'react';

export interface Workflow {
    id: string;
    name: string;
    nodes: any;
    edges: any;
    createdAt: string | Date;
}

export function useWorkflows() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/workflows');
            if (!response.ok) {
                throw new Error('Failed to fetch workflows');
            }
            const data = await response.json();
            setWorkflows(data);
        } catch (error) {
            console.error('Error fetching workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    return {
        workflows,
        loading,
        refreshWorkflows: fetchWorkflows,
    };
}
