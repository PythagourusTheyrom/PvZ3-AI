export const LEVELS = [
    { id: 1, zombiesToSpawn: 10, zombieTypes: ['basic'], spawnInterval: 5000 },
    { id: 2, zombiesToSpawn: 15, zombieTypes: ['basic', 'conehead'], spawnInterval: 4500 },
    { id: 3, zombiesToSpawn: 20, zombieTypes: ['basic', 'conehead'], spawnInterval: 4000 },
    { id: 4, zombiesToSpawn: 25, zombieTypes: ['basic', 'conehead', 'buckethead'], spawnInterval: 3500 },
    { id: 5, zombiesToSpawn: 30, zombieTypes: ['basic', 'conehead', 'buckethead'], spawnInterval: 3000 },
];

export function getLevelConfig(levelId) {
    const config = LEVELS.find(l => l.id === levelId);
    if (config) return config;

    // Endless Mode Scaling for levels undefined in config
    return {
        id: levelId,
        zombiesToSpawn: 30 + (levelId - 5) * 5,
        zombieTypes: ['basic', 'conehead', 'buckethead'],
        spawnInterval: Math.max(1000, 3000 - (levelId - 5) * 200)
    };
}
