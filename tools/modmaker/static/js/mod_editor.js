
export class ModEditor {
    constructor() {
        this.editorEl = document.getElementById('json-editor');
        this.currentFilename = null;

        // Auto-save or Cmd+S listener could go here
        this.editorEl.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.saveFile();
            }
        });
    }

    async loadFile(filename) {
        this.currentFilename = filename;
        this.editorEl.value = "Loading...";

        try {
            const data = await window.ClientAPI.read(filename);
            this.editorEl.value = JSON.stringify(data, null, 4);
            document.getElementById('status-left').textContent = `Editing ${filename}`;
        } catch (e) {
            this.editorEl.value = "// Error loading file: " + e.message;
            console.error(e);
        }
    }

    async saveFile() {
        if (!this.currentFilename) return;

        const content = this.editorEl.value;
        try {
            // Validate
            JSON.parse(content);
        } catch (e) {
            alert("Invalid JSON: " + e.message);
            return;
        }

        document.getElementById('status-left').textContent = `Saving ${this.currentFilename}...`;

        try {
            const result = await window.ClientAPI.save(this.currentFilename, content);

            document.getElementById('status-left').textContent = result.message;
            setTimeout(() => document.getElementById('status-left').textContent = 'Ready', 2000);
        } catch (e) {
            alert("Save failed: " + e.message);
        }
    }
}
