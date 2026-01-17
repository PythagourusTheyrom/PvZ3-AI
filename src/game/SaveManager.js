export class SaveManager {
    static get ZEN_GARDEN_KEY() {
        return 'pvz3_zen_garden_data';
    }

    static saveGarden(plants) {
        const data = plants.map(p => ({
            x: p.x,
            y: p.y,
            type: p.type,
            lastWatered: p.lastWatered || Date.now()
        }));
        localStorage.setItem(this.ZEN_GARDEN_KEY, JSON.stringify(data));
        console.log('Zen Garden saved:', data.length, 'plants.');
    }

    static loadGarden() {
        const data = localStorage.getItem(this.ZEN_GARDEN_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to load Zen Garden data:', e);
            return [];
        }
    }
}
