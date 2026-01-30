const fs = require('fs');
const path = require('path');
const { FormData } = require('node:util'); // Use native FormData if available, or just construct body manually

// Configuration
const WATCH_DIR = path.join(__dirname, '../watched-photos');
const API_URL = 'http://localhost:3000/api/upload';
const BUFFER_MS = 30000; // 30 seconds

// State
const pendingUploads = new Map();

// Ensure watch directory exists
if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
    console.log(`Created watch directory: ${WATCH_DIR}`);
}

console.log(`\n📷  PROJECTPOINT WATCHER ACTIVE`);
console.log(`📂  Watching: ${WATCH_DIR}`);
console.log(`⏳  Buffer: ${BUFFER_MS / 1000} seconds`);
console.log(`🚀  Target: ${API_URL}\n`);

// Watcher Logic
fs.watch(WATCH_DIR, (eventType, filename) => {
    if (!filename || filename.startsWith('.')) return; // Ignore hidden files

    const filePath = path.join(WATCH_DIR, filename);

    // Only process new files (rename or change event usually covers creation)
    if (eventType === 'rename') {
        // Check if file still exists (it might be a deletion event)
        if (fs.existsSync(filePath)) {
            handleNewFile(filename, filePath);
        } else {
            // File was deleted
            if (pendingUploads.has(filename)) {
                console.log(`🗑️  File deleted before upload: ${filename}`);
                clearTimeout(pendingUploads.get(filename));
                pendingUploads.delete(filename);
            }
        }
    }
});

function handleNewFile(filename, filePath) {
    if (pendingUploads.has(filename)) return; // Already tracking

    console.log(`👀  New file detected: ${filename}`);
    console.log(`Calm down... waiting ${BUFFER_MS / 1000}s for edits/deletes...`);

    const timeoutId = setTimeout(() => {
        uploadFile(filename, filePath);
        pendingUploads.delete(filename);
    }, BUFFER_MS);

    pendingUploads.set(filename, timeoutId);
}

async function uploadFile(filename, filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`❌  File vanished: ${filename}`);
        return;
    }

    console.log(`📤  Uploading ${filename}...`);

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);

        // Native fetch with FormData (Node 18+)
        // create a boundary manually or use a reliable way to send file
        // For simplicity in a script without dependencies, we can use a custom request or try to use `fetch` with a blob if supported.
        // Node's native fetch supports FormData but it requires the `undici` based implementation or strict adherence.
        // Let's try native fetch with a simple body if possible, or multipart.

        // Actually, without `form-data` package, constructing multipart/form-data is tricky.
        // Let's implement a simple boundary constructor.

        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

        let postData = [];
        // File Part
        postData.push(`--${boundary}\r\n`);
        postData.push(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`);
        postData.push(`Content-Type: image/jpeg\r\n\r\n`);
        postData.push(fileBuffer);
        postData.push(`\r\n--${boundary}--\r\n`);

        // Combine into one buffer
        const finalBuffer = Buffer.concat(postData.map(d => typeof d === 'string' ? Buffer.from(d) : d));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': finalBuffer.length
            },
            body: finalBuffer
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅  Upload Complete: ${filename}`);
            console.log(`    Status: ${data.status || 'Received'}`);
            // Optional: Move to 'processed' folder
        } else {
            console.error(`❌  Upload Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('    ' + text);
        }

    } catch (err) {
        console.error(`❌  Error uploading ${filename}:`, err.message);
    }
}
