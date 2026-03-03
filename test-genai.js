const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
});
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hello");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
run();
