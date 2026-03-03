import { task, logger } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runLLMTask = task({
    id: "run-llm-task",
    run: async (payload: { prompt: string }) => {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured. Set it in your environment variables.");
        }

        logger.info("Running LLM task", { promptLength: payload.prompt.length });

        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const result = await model.generateContent(payload.prompt);
        const text = result.response.text();

        logger.info("LLM task complete", { responseLength: text.length });

        return text;
    },
});
