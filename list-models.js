const fs = require('fs');
let key = '';
try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/GEMINI_API_KEY=(.+)/);
    if (match) key = match[1].trim(); // trim removes \r

    fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
        .then(r => r.json())
        .then(data => {
            if (data.models) {
                fs.writeFileSync('models_out.txt', data.models.map(m => m.name).join('\n'));
            } else {
                fs.writeFileSync('models_out.txt', JSON.stringify(data));
            }
        })
        .catch(e => fs.writeFileSync('models_out.txt', e.message));
} catch (e) {
    fs.writeFileSync('models_out.txt', e.message);
}
