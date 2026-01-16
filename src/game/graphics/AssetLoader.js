export const AssetLoader = {
    images: {},

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            if (this.images[key]) {
                resolve(this.images[key]);
                return;
            }
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    },

    getImage(key) {
        return this.images[key];
    },

    async loadAll(assets) {
        // assets = { key: path, key2: path }
        const promises = [];
        for (const [key, path] of Object.entries(assets)) {
            promises.push(this.loadImage(key, path));
        }
        return Promise.all(promises);
    }
};
