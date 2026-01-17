
const fileList = document.getElementById('file-list');
const editorContainer = document.getElementById('editor-container');
const currentFileHeader = document.getElementById('current-file');
const jsonEditor = document.getElementById('json-editor');
const saveBtn = document.getElementById('save-btn');
const statusSpan = document.getElementById('status');

let currentFilename = '';

// Load file list on startup
async function loadFileList() {
    try {
        const response = await fetch('/api/list');
        const files = await response.json();

        fileList.innerHTML = '';
        files.forEach(file => {
            const btn = document.createElement('div');
            btn.className = 'file-item';
            btn.textContent = file;
            btn.onclick = () => loadFile(file);
            fileList.appendChild(btn);
        });
    } catch (err) {
        console.error('Failed to load file list:', err);
        statusSpan.textContent = 'Error loading file list.';
    }
}

async function loadFile(filename) {
    currentFilename = filename;
    currentFileHeader.textContent = `Editing: ${filename}`;

    // Highlight active
    document.querySelectorAll('.file-item').forEach(el => {
        el.classList.remove('active');
        if (el.textContent === filename) el.classList.add('active');
    });

    try {
        const response = await fetch(`/api/data/${filename}`);
        const data = await response.json();
        jsonEditor.value = JSON.stringify(data, null, 4); // Pretty print
        editorContainer.style.display = 'block';
        statusSpan.textContent = '';
    } catch (err) {
        console.error('Failed to load file:', err);
        statusSpan.textContent = 'Error loading file.';
    }
}

async function saveFile() {
    if (!currentFilename) return;

    const content = jsonEditor.value;
    try {
        // Validate JSON locally first
        JSON.parse(content);
    } catch (e) {
        alert('Invalid JSON: ' + e.message);
        return;
    }

    statusSpan.textContent = 'Saving...';
    try {
        const response = await fetch(`/api/data/${currentFilename}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: content
        });

        if (response.ok) {
            statusSpan.textContent = 'Saved successfully!';
            setTimeout(() => statusSpan.textContent = '', 3000);
        } else {
            const text = await response.text();
            statusSpan.textContent = 'Error saving: ' + text;
        }
    } catch (err) {
        console.error('Failed to save:', err);
        statusSpan.textContent = 'Network error during save.';
    }
}

saveBtn.onclick = saveFile;

// Init
loadFileList();
