import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
    const healthStatus = {
        db: "ok",
        trigger: "ok",
        auth: "ok"
    };

    let hasError = false;

    // 1. Verify Database
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
        console.error("Health check DB error:", error);
        healthStatus.db = "error";
        hasError = true;
    }

    // 2. Verify Trigger.dev
    try {
        env.TRIGGER_PROJECT_ID;
    } catch {
        healthStatus.trigger = "error";
        hasError = true;
    }

    // 3. Verify Clerk
    try {
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    } catch {
        healthStatus.auth = "error";
        hasError = true;
    }

    const status = hasError ? 503 : 200;

    return NextResponse.json(healthStatus, { status });
}
