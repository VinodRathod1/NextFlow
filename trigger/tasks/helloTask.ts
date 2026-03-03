import { task, wait } from "@trigger.dev/sdk/v3";

export const helloTask = task({
    id: "hello-task",
    run: async (payload: { name: string }) => {
        // Wait for 1 second using Trigger's wait.for, or plain Promise
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return `Hello ${payload.name}`;
    },
});
