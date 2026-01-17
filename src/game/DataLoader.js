export class DataLoader {
    static async loadAllData() {
        const [levels, plants, zombies] = await Promise.all([
            fetch('data/levels.json').then(r => r.json()),
            fetch('data/plants.json').then(r => r.json()),
            fetch('data/zombies.json').then(r => r.json())
        ]);
        return { levels, plants, zombies };
    }
}
