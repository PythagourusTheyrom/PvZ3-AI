
document.addEventListener('DOMContentLoaded', () => {
    const marketplaceBtn = document.getElementById('marketplace-btn');
    const backToEditorBtn = document.getElementById('back-to-editor-btn');
    const marketplaceContainer = document.getElementById('marketplace-container');
    const fileList = document.getElementById('file-list');
    const editorContainer = document.getElementById('editor-container');
    const modList = document.getElementById('mod-list');

    marketplaceBtn.addEventListener('click', async () => {
        // Show Marketplace, Hide Editor
        fileList.style.display = 'none';
        editorContainer.style.display = 'none';
        marketplaceContainer.style.display = 'block';

        await loadMarketplace();
    });

    backToEditorBtn.addEventListener('click', () => {
        // Show Editor, Hide Marketplace
        marketplaceContainer.style.display = 'none';
        fileList.style.display = 'block';
        // We don't necessarily show editorContainer unless a file was open, 
        // but typically we go back to the list.
        // If a file was open, it might be nice to restore state, but for now just going back to list is fine.
        if (document.getElementById('current-file').textContent !== "Thinking...") {
            // If a file was open, we could show it, but the simplest UX is back to file list.
        }

        // Refresh the file list in case we installed something
        if (window.loadFileList) {
            window.loadFileList();
        }
    });

    async function loadMarketplace() {
        modList.innerHTML = '<p>Loading mods...</p>';
        const mods = await ClientAPI.getMarketplaceMods();

        modList.innerHTML = '';
        if (!mods || mods.length === 0) {
            modList.innerHTML = '<p>No mods available.</p>';
            return;
        }

        mods.forEach(mod => {
            const card = document.createElement('div');
            card.style.background = '#333';
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.border = '1px solid #444';

            const title = document.createElement('h3');
            title.textContent = mod.name;
            title.style.marginTop = '0';
            title.style.color = '#8bc34a';

            const desc = document.createElement('p');
            desc.textContent = mod.description;
            desc.style.color = '#ccc';

            const type = document.createElement('span');
            type.textContent = `Type: ${mod.type}`;
            type.style.fontSize = '0.8em';
            type.style.background = '#444';
            type.style.padding = '2px 6px';
            type.style.borderRadius = '4px';

            const installBtn = document.createElement('button');
            installBtn.textContent = 'Install';
            installBtn.style.width = '100%';
            installBtn.style.marginTop = '10px';
            installBtn.addEventListener('click', () => installMod(mod));

            card.appendChild(title);
            card.appendChild(type);
            card.appendChild(desc);
            card.appendChild(installBtn);

            modList.appendChild(card);
        });
    }

    async function installMod(mod) {
        if (!confirm(`Install "${mod.name}"? This will overwrite local files.`)) return;

        const result = await ClientAPI.installMarketplaceMod(mod.id, mod);
        alert(result.message);
    }
});
