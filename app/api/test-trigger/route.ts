import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { helloTask } from "@/trigger/tasks/helloTask";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const name = body.name || "World";

        // Trigger the task
        const handle = await tasks.trigger<typeof helloTask>("hello-task", { name });

        return NextResponse.json({ success: true, handle });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
