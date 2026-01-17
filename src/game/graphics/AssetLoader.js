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

    async loadAll(assets, onProgress) {
        // assets = { key: path, key2: path }
        const promises = [];
        const total = Object.keys(assets).length;
        let loaded = 0;

        for (const [key, path] of Object.entries(assets)) {
            promises.push(
                this.loadImage(key, path).then((img) => {
                    loaded++;
                    if (onProgress) {
                        onProgress(loaded / total);
                    }
                    return img;
                })
            );
        }
        return Promise.all(promises);
    }
};
