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
    {
        id: 4,
        type: 'pool', // Fog levels are typically pool
        hasFog: true,
        rows: 6,
        laneTypes: ['grass', 'grass', 'water', 'water', 'grass', 'grass'],
        waves: [
            {
                spawns: [
                    { type: 'basic', delay: 2000 },
                    { type: 'conehead', delay: 4000 },
                    { type: 'basic', delay: 5000 },
                ],
                startDelay: 2000
            },
            {
                spawns: [
                    { type: 'buckethead', delay: 4000 },
                    { type: 'basic', delay: 3000 },
                    { type: 'conehead', delay: 3000 }
                ],
                startDelay: 5000,
                isFlag: true
            }
        ]
    },
    {
        id: 7,
        type: 'pool',
        rows: 6,
        laneTypes: ['grass', 'grass', 'water', 'water', 'grass', 'grass'],
        waves: [
            {
                spawns: [
                    { type: 'basic', delay: 2000 },
                    { type: 'conehead', delay: 4000 },
                    { type: 'basic', delay: 5000 },
                    { type: 'basic', delay: 5000 }
                ],
                startDelay: 2000
            },
            {
                spawns: [
                    { type: 'basic', delay: 2000 },
                    { type: 'buckethead', delay: 4000 },
                    { type: 'football', delay: 5000 },
                    { type: 'basic', delay: 5000 }
                ],
                startDelay: 5000,
                isFlag: true
            }
        ]
    }
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
