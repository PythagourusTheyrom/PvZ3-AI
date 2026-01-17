
const ClientAPI = {
    // Known files in public/data (since we can't list directory statically easily without a manifest)
    // We can also fetch a manifest.json if we add one during build.
    knownFiles: [
        "levels.json",
        "plants.json",
        "zombies.json",
        // Add other JSON files found in public/data
    ],

    // Helper to check if we are running against the Go server
    isLocalServer: async () => {
        try {
            const res = await fetch('/api/list', { method: 'HEAD' });
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    list: async () => {
        // Try real API first
        try {
            const response = await fetch('/api/list');
            if (response.ok) return await response.json();
        } catch (e) {
            console.log("Server API not available, using client mode.");
        }

        // Fallback: Return known files + any in LocalStorage not in known list
        const localKeys = Object.keys(localStorage).filter(k => k.startsWith('mod_'));
        const localFiles = localKeys.map(k => k.replace('mod_', ''));
        return [...new Set([...ClientAPI.knownFiles, ...localFiles])];
    },

    read: async (filename) => {
        // 1. Check LocalStorage (User edits override default)
        const localData = localStorage.getItem('mod_' + filename);
        if (localData) {
            console.log(`Loaded ${filename} from LocalStorage`);
            return JSON.parse(localData);
        }

        // 2. Try real API
        try {
            const response = await fetch(`/api/data/${filename}`);
            if (response.ok) return await response.json();
        } catch (e) { }

        // 3. Fallback: Fetch from static public/data
        try {
            const response = await fetch(`/data/${filename}`);
            if (response.ok) return await response.json();
        } catch (e) { }

        throw new Error(`File ${filename} not found`);
    },

    save: async (filename, content) => {
        // Try real API first
        let serverSaved = false;
        try {
            const response = await fetch(`/api/data/${filename}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: content
            });
            if (response.ok) serverSaved = true;
        } catch (e) { }

        // Always save to LocalStorage as backup/primary for client mode
        localStorage.setItem('mod_' + filename, content);

        if (!serverSaved) {
            // If server save failed (e.g. GitHub Pages), we simulate success
            // and maybe trigger a download if desired, but for now just LS is fine.
            console.log(`Saved ${filename} to LocalStorage (Server unavailable)`);
            return { savedTo: 'local', message: 'Saved to Browser Storage (Download to persist)' };
        }

        return { savedTo: 'server', message: 'Saved to Server' };
    },

    download: (filename) => {
        const content = localStorage.getItem('mod_' + filename);
        if (!content) {
            alert("No changes saved in browser to download.");
            return;
        }
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.ClientAPI = ClientAPI;
