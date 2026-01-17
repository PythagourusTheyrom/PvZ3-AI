
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
            const response = await fetch(`/api/data/${filename}`);
            const data = await response.json();
            this.editorEl.value = JSON.stringify(data, null, 4);
            document.getElementById('status-left').textContent = `Editing ${filename}`;
        } catch (e) {
            this.editorEl.value = "// Error loading file";
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
            const response = await fetch(`/api/data/${this.currentFilename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: content
            });

            if (response.ok) {
                document.getElementById('status-left').textContent = `Saved ${this.currentFilename}`;
                setTimeout(() => document.getElementById('status-left').textContent = 'Ready', 2000);
            } else {
                alert("Save failed");
            }
        } catch (e) {
            alert("Save network error");
        }
    }
}
