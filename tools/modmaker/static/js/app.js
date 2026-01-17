
// App.js - Main Controller

import { ModEditor } from './mod_editor.js';
// We'll import AnimationEditor later once we refactor it
// import { AnimationEditor } from './anim_module.js';

class App {
    constructor() {
        this.currentView = 'welcome';
        this.modEditor = new ModEditor();
        this.animationEditor = null; // Lazy load?

        this.initUI();
    }

    initUI() {
        // Activity Bar
        document.getElementById('act-explorer').onclick = () => this.switchActivity('explorer');
        document.getElementById('act-animation').onclick = () => this.switchActivity('animation');

        // Initial Load
        this.loadFileList();
    }

    switchActivity(activity) {
        // Toggle active states
        document.querySelectorAll('.activity-icon').forEach(el => el.classList.remove('active'));
        document.getElementById(`act-${activity}`).classList.add('active');

        if (activity === 'explorer') {
            document.getElementById('sidebar-explorer').style.display = 'flex';
            // If we were in animation view, maybe switch back to code view or just keep sidebar visible?
            // For now, let's say Explorer = File List, Animation = Animation Tool full view
        } else if (activity === 'animation') {
            // For this specific 'Activity', we might want to actually switch the MAIN VIEW to Animation Editor
            this.openAnimationEditor();
        }
    }

    async loadFileList() {
        const container = document.getElementById('file-list-container');
        container.innerHTML = '<div style="padding:10px; color:#666;">Loading...</div>';

        try {
            const response = await fetch('/api/list'); // Assuming existing API works
            const files = await response.json();

            container.innerHTML = '';
            files.forEach(file => {
                // Determine icon based on extension?
                const div = document.createElement('div');
                div.className = 'file-list-item';
                div.textContent = file;
                div.onclick = () => this.openFile(file);
                container.appendChild(div);
            });
        } catch (e) {
            container.innerHTML = '<div style="color:red; padding:10px;">Error loading files</div>';
        }
    }

    openFile(filename) {
        // Check if it's an animation file?
        if (filename.endsWith('.json') && filename.includes('anim')) {
            // Maybe ask user or just open as JSON for now?
            // Let's open as JSON first
        }

        this.currentView = 'json';
        this.updateViewVisibility();

        // Update Tabs
        const tabsBar = document.getElementById('tabs-bar');
        tabsBar.innerHTML = `
            <div class="tab active">
                <span>${filename}</span>
                <span class="close-icon">&times;</span>
            </div>
        `;

        this.modEditor.loadFile(filename);
    }

    openAnimationEditor() {
        this.currentView = 'anim';
        this.updateViewVisibility();

        const tabsBar = document.getElementById('tabs-bar');
        tabsBar.innerHTML = `
            <div class="tab active">
                <span>Animation Editor</span>
                <span class="close-icon">&times;</span>
            </div>
        `;

        // Initialize Animation Editor Module if not already
        if (!this.animationEditor) {
            import('./anim_module.js').then(module => {
                this.animationEditor = new module.AnimationEditor(document.getElementById('view-anim'));
                this.animationEditor.init();
            });
        } else {
            // this.animationEditor.resize();
        }
    }

    updateViewVisibility() {
        document.getElementById('view-welcome').classList.add('view-hidden');
        document.getElementById('view-json').classList.add('view-hidden');
        document.getElementById('view-anim').classList.add('view-hidden');

        if (this.currentView === 'json') {
            document.getElementById('view-json').classList.remove('view-hidden');
        } else if (this.currentView === 'anim') {
            document.getElementById('view-anim').classList.remove('view-hidden');
        } else {
            document.getElementById('view-welcome').classList.remove('view-hidden');
        }
    }
}

// Start
window.app = new App();
