async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/run-llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'hello' })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
run();
