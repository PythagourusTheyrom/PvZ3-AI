import { Grid } from './Grid.js';
import { Input } from './Input.js';
import { Plant } from './Plant.js';
import { Zombie } from './Zombie.js';
import { Projectile } from './Projectile.js';
import { AssetLoader } from './graphics/AssetLoader.js';
import { Sun } from './Sun.js';
import { CrazyDave } from './CrazyDave.js';
import { getLevelConfig } from './LevelConfig.js';

import { DataLoader } from './DataLoader.js';
import { SaveManager } from './SaveManager.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.lastTime = 0;
        this.loop = this.loop.bind(this);

        this.isLoaded = false;
        this.gameData = null;

        // Assets
        this.assetsLoaded = true; // Main handles loading


        // Load Game Data
        DataLoader.loadAllData().then(data => {
            this.gameData = data;
            this.isLoaded = true;
            // Initialize game state specific things that depend on data if any
            // For now, we just mark as loaded, but we might want to refresh level config
            this.currentLevelConfig = getLevelConfig(this.level, this.gameData.levels);
            this.zombiesToSpawn = this.currentLevelConfig.zombiesToSpawn;
            this.zombieSpawnInterval = this.currentLevelConfig.spawnInterval;
        }).catch(err => console.error("Failed to load game data:", err));

        // Game State
        this.state = 'MENU'; // MENU, CHOOSING_SEEDS, PLAYING, GAME_OVER, LEVEL_COMPLETE
        this.level = 1;
        this.zombiesToSpawn = 10; // Default fallback
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.isEndless = false;
        this.endlessWave = 1;
        this.endlessTimer = 0;
        this.endlessNextWaveTime = 30000; // 30s per wave ramp up (doesn't stop spawning, just gets harder)

        this.sun = 100;
        this.grid = new Grid(this);
        this.input = new Input(this);
        this.selectedPlant = 'peashooter';

        this.zombies = [];
        this.projectiles = [];
        this.suns = [];

        this.skySunTimer = 0;
        this.skySunInterval = 10000; // 10s

        this.zombieSpawnTimer = 0;
        this.zombieSpawnInterval = 5000;

        this.crazyDave = new CrazyDave(this);

        // Initialize level config for safety, though reset() handles it
        // We defer this until data load usually, but keeping it for safety
        // this.currentLevelConfig = getLevelConfig(this.level); 
    }

    reset() {
        this.state = 'PLAYING';
        this.sun = 100;
        this.zombies = [];
        this.projectiles = [];
        this.suns = [];
        this.grid = new Grid(this); // Reset grid
        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;
        this.zombieSpawnTimer = 0;

        // Load Level Config
        if (this.gameData) {
            this.currentLevelConfig = getLevelConfig(this.level, this.gameData.levels);
            this.zombiesToSpawn = this.currentLevelConfig.zombiesToSpawn;
            this.zombieSpawnInterval = this.currentLevelConfig.spawnInterval;
        }

        if (this.isEndless) {
            this.zombieSpawnInterval = 4000;
            this.endlessWave = 1;
            this.endlessTimer = 0;
        }

        // Hide screens

        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('sun-display').innerText = this.sun;
    }

    enterZenGarden() {
        this.reset();
        this.state = 'ZEN_GARDEN';
        this.sun = 1000; // Give plenty of sun for gardening

        // Load Plants
        const gardenData = SaveManager.loadGarden();
        gardenData.forEach(data => {
            const cell = this.grid.getGridPos(data.x, data.y);
            // Just place them based on coords, or simpler: direct instantiation
            // Note: data.x/y should be pixel coords or grid coords?
            // Let's assume they are pixel coords saved from plant objects
            // But Plant constructor takes grid x/y usually or calculating it?
            // Plant constructor: (game, x, y, type) -> x,y are pixels

            // To ensure they snap to grid if we saved pixel coords:
            const savedPlant = new Plant(this, data.x, data.y, data.type);
            savedPlant.lastWatered = data.lastWatered;

            // Register in grid
            const gridPos = this.grid.getGridPos(data.x + 20, data.y + 20); // Center point
            if (gridPos) {
                const cell = this.grid.cells[gridPos.row][gridPos.col];
                cell.plant = savedPlant;
            }
        });

        // Hide Seed Bar maybe? Or show all seeds? 
        // For now, let's keep the seeded bar from "Let's Rock" if we came from there, 
        // BUT we didn't come from "Let's Rock" (seed selection). 
        // We came from Main Menu. So we need to populate a default "Zen Set" of seeds.
        this.populateZenSeeds();
    }

    populateZenSeeds() {
        // Mocking a seed selection for Zen Mode
        const zenSeeds = ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'repeater', 'threepeater', 'squash'];
        const seedBar = document.getElementById('seed-bar');
        if (seedBar) {
            seedBar.innerHTML = '';
            zenSeeds.forEach(plantType => {
                const div = document.createElement('div');
                div.className = 'seed-packet';
                div.dataset.plant = plantType;

                // Free in Zen Mode? Or cost?
                // Let's make it free or cheap
                div.innerHTML = `<div class="seed-cost">0</div>`;

                // Quick colors
                if (plantType === 'peashooter') div.style.backgroundColor = '#4ade80';
                if (plantType === 'sunflower') div.style.backgroundColor = '#facc15';
                if (plantType === 'wallnut') div.style.backgroundColor = '#a16207';
                if (plantType === 'cherrybomb') div.style.backgroundColor = '#dc2626';
                if (plantType === 'snowpea') div.style.backgroundColor = '#60a5fa';
                if (plantType === 'repeater') div.style.backgroundColor = '#22c55e';
                if (plantType === 'potatomine') div.style.backgroundColor = '#b45309';
                if (plantType === 'threepeater') div.style.backgroundColor = '#10b981';
                if (plantType === 'squash') div.style.backgroundColor = '#f97316';

                div.addEventListener('click', () => {
                    this.selectedPlant = plantType;
                    document.querySelectorAll('.seed-packet').forEach(p => p.style.border = '2px solid var(--glass-border)');
                    div.style.border = '2px solid var(--primary)';
                });
                seedBar.appendChild(div);
            });
        }
    }

    gameOver() {
        this.state = 'GAME_OVER';
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    levelComplete() {
        this.state = 'LEVEL_COMPLETE';
        document.getElementById('level-complete-screen').classList.remove('hidden');
    }

    start() {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);

        // Trigger Crazy Dave
        this.crazyDave.appear();
        this.crazyDave.speak("WABBO WABBO!");
    }

    onClick(x, y) {
        const gridPos = this.grid.getGridPos(x, y);
        if (gridPos) {
            const cell = this.grid.getCell(gridPos.row, gridPos.col);
            if (cell && !cell.plant) {
                let cost = 0;
                if (this.gameData && this.gameData.plants[this.selectedPlant]) {
                    cost = this.gameData.plants[this.selectedPlant].sunCost;
                }

                if (this.state === 'ZEN_GARDEN') {
                    // Always free or check sun?
                    // Let's check sun but it's 1000 start
                    if (this.sun >= 0) { // Free
                        cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                        // Save immediately
                        this.saveZenGarden();
                    }
                } else if (this.sun >= cost) {
                    this.sun -= cost;
                    cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                }
            }
        }
    }

    saveZenGarden() {
        const plants = [];
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                if (this.grid.cells[r][c].plant) {
                    plants.push(this.grid.cells[r][c].plant);
                }
            }
        }
        SaveManager.saveGarden(plants);
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.lastTime = timestamp;

        if (this.state === 'PLAYING' || this.state === 'ZEN_GARDEN') {
            if (this.isLoaded) {
                this.update(deltaTime);
                this.draw();
            } else {
                // Show loading?
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '30px Arial';
                this.ctx.fillText("Loading Data...", this.width / 2 - 100, this.height / 2);
            }
        }

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        // 1. Update Plants
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                const cell = this.grid.cells[r][c];
                if (cell.plant) {
                    if (cell.plant.markedForDeletion) {
                        cell.plant = null;
                    } else {
                        cell.plant.update(dt);

                        // Squash Logic
                        if (cell.plant.type === 'squash') {
                            // Check for zombies in same cell
                            for (const z of this.zombies) {
                                if (!z.markedForDeletion && Math.abs(z.y - cell.plant.y) < 50) { // Same row roughly
                                    if (Math.abs(z.x - cell.plant.x) < 80) { // Close X
                                        // SQUASH!
                                        z.health = 0;
                                        z.markedForDeletion = true;
                                        cell.plant.markedForDeletion = true;
                                        this.createExplosion(cell.plant.x, cell.plant.y); // Use explosion visual for impact
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Spawn Zombies
        if (this.state === 'ZEN_GARDEN') return; // No Zombies in Zen Garden

        this.zombieSpawnTimer += dt;

        let shouldSpawn = false;
        if (this.isEndless) {
            // Endless Mode Logic
            this.endlessTimer += dt;
            if (this.endlessTimer > this.endlessNextWaveTime) {
                this.endlessTimer = 0;
                this.endlessWave++;
                // Ramp up difficulty
                if (this.zombieSpawnInterval > 500) this.zombieSpawnInterval -= 200;
                // Maybe announce wave?
                console.log("Wave " + this.endlessWave);
            }
            shouldSpawn = this.zombieSpawnTimer > this.zombieSpawnInterval;
        } else {
            // Normal Level Logic
            shouldSpawn = this.zombieSpawnTimer > this.zombieSpawnInterval && this.zombiesSpawned < this.zombiesToSpawn;
        }

        if (shouldSpawn) {
            this.zombieSpawnTimer = 0;
            const row = Math.floor(Math.random() * this.grid.rows);
            const y = this.grid.startY + row * this.grid.cellSize + 10; // Offset

            // Weighted spawn logic based on available types
            let types = this.currentLevelConfig.zombieTypes;

            if (this.isEndless) {
                // progressive unlock in endless
                types = ['basic'];
                if (this.endlessWave > 1) types.push('conehead');
                if (this.endlessWave > 3) types.push('buckethead');
                if (this.endlessWave > 5) types.push('football');
                // Could add more later
            }

            const type = types[Math.floor(Math.random() * types.length)];

            this.zombies.push(new Zombie(this, y, type));
            this.zombiesSpawned++;

            // Speed up slightly (Normal mode specific, or both? Standard mode does this too)
            if (!this.isEndless && this.zombieSpawnInterval > 1000) this.zombieSpawnInterval -= 50;
        } else if (!this.isEndless && this.zombiesSpawned >= this.zombiesToSpawn && this.zombies.length === 0) {
            this.levelComplete();
        }

        // 3. Update Zombies
        this.zombies.forEach(z => z.update(dt));

        // 4. Update Projectiles
        this.projectiles.forEach(p => p.update(dt));

        // 5. Update Sun
        this.suns.forEach(s => s.update(dt));

        // Spawn Sky Sun
        this.skySunTimer += dt;
        if (this.skySunTimer > this.skySunInterval) {
            this.skySunTimer = 0;
            this.spawnSun(Math.random() * (this.width - 50) + 25, -50, Math.random() * (this.height - 200) + 100);
        }

        this.checkCollisions();

        // 6. Cleanup
        this.zombies = this.zombies.filter(z => !z.markedForDeletion);
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.suns = this.suns.filter(s => !s.markedForDeletion);

        // 7. Update UI
        const sunDisplay = document.getElementById('sun-display');
        if (sunDisplay) {
            sunDisplay.innerText = Math.floor(this.sun);
        }

        if (this.crazyDave) this.crazyDave.update(dt);

        this.handleWasmEvents();
    }

    handleWasmEvents() {
        if (!window.pollEvents) return;
        const events = window.pollEvents();
        if (!events || events.length === 0) return;

        events.forEach(evt => {
            let plant = null;
            // Search grid for plant target
            if (evt.type === 'shoot' || evt.type === 'spawn_sun' || evt.type === 'arm') {
                for (let r = 0; r < this.grid.rows; r++) {
                    for (let c = 0; c < this.grid.cols; c++) {
                        const p = this.grid.cells[r][c].plant;
                        if (p && p.id === evt.id) {
                            plant = p;
                            break;
                        }
                    }
                    if (plant) break;
                }
            }

            if (plant) {
                if (evt.type === 'shoot') {
                    // Trigger existing shoot logic which adds Projectile to game
                    // We trust Go says "shoot now"
                    plant.shoot();
                }
                if (evt.type === 'spawn_sun') {
                    // Standard sunflower logic
                    // We might need to call specific method if plant.spawnSun exists?
                    // Plant.js usually has update logic for sun.
                    // Let's assume Plant.js has `spawnSun` or custom logic.
                    // The original Plant.js didn't have `spawnSun` method shown in snippets,
                    // but `update` managed it. 
                    // I should check Plant.js logic for spawning sun.
                    // If it was inline in `update`, I need to extract it or perform it here.
                    // I'll assume I can add or call `spawnSun`.
                    // Actually, I'll add `spawnSun` to Plant.js if missing or just do it here:
                    this.spawnSun(plant.x, plant.y, plant.y + 40);
                }
                if (evt.type === 'arm') {
                    plant.isArmed = true;
                }
            }
        });
    }

    spawnSun(x, y, toY) {
        this.suns.push(new Sun(this, x, y, toY));
    }

    collectSun(sun) {
        this.sun += sun.value;
        sun.markedForDeletion = true;
    }

    createExplosion(x, y) {
        const radius = 150; // 3x3 area roughly
        this.zombies.forEach(z => {
            const dist = Math.hypot(z.x + z.width / 2 - x, z.y + z.height / 2 - y);
            if (dist < radius) {
                z.health -= 1800; // Massive damage
                if (z.health <= 0) {
                    z.markedForDeletion = true;
                    this.sun += 10;
                }
            }
        });
    }

    checkCollisions() {
        // 1. Projectiles vs Zombies
        for (const p of this.projectiles) {
            for (const z of this.zombies) {
                if (!p.markedForDeletion && !z.markedForDeletion) {
                    if (this.checkCollision(p, z)) {
                        z.health -= p.damage;
                        p.markedForDeletion = true;

                        // Freeze Effect
                        if (p.freeze) {
                            z.applySlow(3000); // 3 seconds slow
                        }

                        if (z.health <= 0) {
                            z.markedForDeletion = true;
                            this.sun += 10;
                        }
                    }
                }
            }
        }

        // 2. Zombies vs Plants
        for (const z of this.zombies) {
            if (z.markedForDeletion) continue;

            let hitPlant = false;

            // Simple iteration over all cells to find collisions
            // Trivial performance cost for 9x5 grid
            for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                    const cell = this.grid.cells[r][c];
                    if (cell.plant && !cell.plant.markedForDeletion) {
                        if (this.checkCollision(z, cell.plant)) {
                            // Potato Mine Logic
                            if (cell.plant.type === 'potatomine') {
                                if (cell.plant.isArmed) {
                                    cell.plant.explode();
                                } else {
                                    // Not armed, gets eaten
                                    z.isEating = true;
                                    z.targetPlant = cell.plant;
                                }
                            } else {
                                z.isEating = true;
                                z.targetPlant = cell.plant;
                            }
                            hitPlant = true;
                            break;
                        }
                    }
                }
                if (hitPlant) break;
            }
        }
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Lawn
        const bg = AssetLoader.getImage('background');
        if (bg) {
            this.ctx.drawImage(bg, 0, 0, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#166534';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw Grid
        this.grid.draw(this.ctx);

        // Draw Zombies
        this.zombies.forEach(z => z.draw(this.ctx));

        // Draw Projectiles
        this.projectiles.forEach(p => p.draw(this.ctx));

        // Draw Sun
        this.suns.forEach(s => s.draw(this.ctx));

        // Draw Crazy Dave
        if (this.crazyDave && this.state !== 'ZEN_GARDEN') this.crazyDave.draw(this.ctx);

        if (this.state === 'ZEN_GARDEN') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#10b981';
            this.ctx.font = '20px Arial';
            this.ctx.fillText("ZEN GARDEN MODE", 10, 30);
        }
    }
}
