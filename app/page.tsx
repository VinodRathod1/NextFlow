import { AppLayout } from '@/components/layout/AppLayout';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';

export default function Home() {
  return (
    <AppLayout>
      <div className="h-full w-full flex-grow relative">
        <WorkflowCanvas />
      </div>
    </AppLayout>
  );
}
