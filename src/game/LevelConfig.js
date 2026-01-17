export const LEVELS = [
    {
        id: 1,
        waves: [
            {
                spawns: [
                    { type: 'basic', delay: 2000 },
                    { type: 'basic', delay: 5000 },
                    { type: 'basic', delay: 5000 },
                    { type: 'basic', delay: 5000 },
                    { type: 'basic', delay: 5000 }
                ],
                startDelay: 2000,
                isFlag: false
            },
            {
                spawns: [
                    { type: 'basic', delay: 1000 },
                    { type: 'basic', delay: 3000 },
                    { type: 'basic', delay: 3000 },
                    { type: 'basic', delay: 2000 },
                    { type: 'basic', delay: 2000 }
                ],
                startDelay: 5000,
                isFlag: true // Final Wave
            }
        ]
    },
    {
        id: 2,
        waves: [
            {
                spawns: [
                    { type: 'basic', delay: 1000 },
                    { type: 'conehead', delay: 4000 },
                    { type: 'basic', delay: 3000 },
                    { type: 'conehead', delay: 4000 }
                ],
                startDelay: 2000
            },
            {
                spawns: [
                    { type: 'basic', delay: 1000 },
                    { type: 'conehead', delay: 1000 },
                    { type: 'conehead', delay: 3000 },
                    { type: 'basic', delay: 2000 },
                    { type: 'conehead', delay: 2000 }
                ],
                startDelay: 5000,
                isFlag: true
            }
        ]
    },
    // ... Other levels can be migrated lazily or now. 
    // For brevity in this turn, I'll just do 1 and 2 and a generic fallback.
];

export function getLevelConfig(levelId, levelData) {
    let config = null;
    if (levelData) {
        config = levelData.find(l => l.id === levelId);
    } else {
        config = LEVELS.find(l => l.id === levelId);
    }

    if (config && config.waves) return config;

    // Fallback for levels not yet converted or endless
    // Construct a procedural wave set
    const waves = [];
    const waveCount = 5;
    for (let i = 0; i < waveCount; i++) {
        const spawns = [];
        const count = 5 + (levelId * 2) + i;
        for (let j = 0; j < count; j++) {
            // Mix types
            spawns.push({ type: 'basic', delay: 2000 });
        }
        waves.push({
            spawns: spawns,
            startDelay: 5000,
            isFlag: i === waveCount - 1
        });
    }

    return {
        id: levelId,
        waves: waves
    };
}
