export class WasmLoader {
    static instance = null;

    constructor() {
        if (WasmLoader.instance) return WasmLoader.instance;
        WasmLoader.instance = this;

        this.isReady = false;
        this.readyPromise = this.init();
    }

    async init() {
        if (this.isReady) return;

        // Load Go's wasm_exec.js helper if not present
        if (!window.Go) {
            // We assume wasm_exec.js is loaded via script tag in index.html for simplicity, 
            // OR we can dynamically load it. Let's assume dynamic load.
            await this.loadScript('./wasm_exec.js');
        }

        const go = new window.Go();
        // WebAssembly.instantiateStreaming is the modern way
        // Use relative path for GitHub Pages compatibility
        const result = await WebAssembly.instantiateStreaming(fetch('./lib.wasm'), go.importObject);
        go.run(result.instance);

        console.log("Wasm Module Loaded");
        this.isReady = true;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    static async waitForReady() {
        const loader = new WasmLoader();
        await loader.readyPromise;
    }
}
