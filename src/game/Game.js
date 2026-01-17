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
import { WaveManager } from './WaveManager.js';
import { FogManager } from './FogManager.js';

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
        }).catch(err => console.error("Failed to load game data:", err));

        // Game State
        this.state = 'MENU'; // MENU, CHOOSING_SEEDS, PLAYING, GAME_OVER, LEVEL_COMPLETE
        this.level = 4; // Default to Level 4 for Fog Testing
        this.waveManager = null;

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

        this.crazyDave = new CrazyDave(this);

        // Initialize level config for safety, though reset() handles it
        // We defer this until data load usually, but keeping it for safety
        this.currentLevelConfig = getLevelConfig(this.level);
    }

    reset() {
        this.state = 'PLAYING';
        this.sun = 100;
        this.zombies = [];
        this.suns = [];
        this.projectiles = [];

        // Load Level Config first to get grid dimensions
        // Note: we usually load this from gameData, but for restart we need to be sure.
        // We will do a robust check here or in a separate method, 
        // but for now let's just make sure we get the config.
        if (this.gameData) {
            this.currentLevelConfig = getLevelConfig(this.level, this.gameData.levels);
        } else {
            this.currentLevelConfig = getLevelConfig(this.level);
        }

        const rows = this.currentLevelConfig.rows || 5;
        const laneTypes = this.currentLevelConfig.laneTypes || [];
        this.grid = new Grid(this, rows, 9, 100, 245, 80, laneTypes);

        this.zombiesSpawned = 0;
        this.zombiesKilled = 0;

        // Load Level Config
        if (this.gameData) {
            this.currentLevelConfig = getLevelConfig(this.level, this.gameData.levels);
        } else {
            this.currentLevelConfig = getLevelConfig(this.level);
        }

        // Initialize Wave Manager
        this.waveManager = new WaveManager(this, this.currentLevelConfig.waves);

        if (this.isEndless) {
            this.endlessWave = 1;
            this.endlessTimer = 0;
        }

        // Hide screens

        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('sun-display').innerText = this.sun;

        // DEBUG: Populate seeds for testing
        this.populateZenSeeds();
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
        const zenSeeds = ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'repeater', 'threepeater', 'squash', 'plantern', 'blover'];
        const seedBar = document.getElementById('seed-bar');
        if (seedBar) {
            seedBar.innerHTML = '';
            zenSeeds.forEach(plantType => {
                const div = document.createElement('div');
                div.className = 'seed-packet';
                div.dataset.plant = plantType;

                // Free in Zen Mode? Or cost?
                // Let's make it free or cheap
                const costDiv = document.createElement('div');
                costDiv.className = 'seed-cost';
                costDiv.textContent = '0';
                div.appendChild(costDiv);

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
                    if (this.sun >= 0) { // Free
                        cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                        this.saveZenGarden();
                    }
                } else if (this.sun >= cost) {
                    // Pool Logic
                    const isWater = this.grid.isWater(gridPos.row);
                    const newPlantMock = { type: this.selectedPlant }; // Quick check helper or just string check
                    // We need isAquatic check. We can check the string list or instantiate a dummy? 
                    // Better: check string list here or static helper.
                    const isAquatic = ['lily_pad', 'tangle_kelp'].includes(this.selectedPlant);

                    if (isWater) {
                        if (isAquatic) {
                            // Can plant if no base plant (or maybe replace? usually no)
                            if (!cell.basePlant) {
                                this.sun -= cost;
                                cell.basePlant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                            }
                        } else {
                            // Land plant on water -> Needs Lily Pad
                            if (cell.basePlant && cell.basePlant.canPlantOnTop && !cell.plant) {
                                this.sun -= cost;
                                cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                            }
                        }
                    } else {
                        // Grass
                        if (!isAquatic && !cell.plant) {
                            this.sun -= cost;
                            cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                        }
                    }
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

        if (this.isEndless) {
            // Endless Mode Logic - KEEP EXISTING LOGIC FOR NOW OR MIGRATE LATER
            this.endlessTimer += dt;
            // ... (keep endless logic mostly separate for now or refactor to use WaveManager too)
            // For now, let's keep the old endless logic block but adapt variables
            // Ideally, Endless would just be an infinite WaveManager? 
            // Let's stick to the prompt scope: "Add A Wave System", mostly implying normal levels.
            // But I removed this.zombieSpawnTimer from constructor. I should re-add it if endless needs it.
            // Or better, let's make endless use WaveManager but with generated waves?
            // See LevelConfig.js fallback. It generates waves.
            // So if I use WaveManager for everything, I don't need this block?
            // But Endless logic had "ramp up".
            // Let's assume LevelConfig fallback covers "Endless" for levels > defined.
            // BUT "isEndless" flag is explicit.

            if (this.waveManager) {
                this.waveManager.update(dt);
            }
        } else {
            // Normal Level Logic using WaveManager
            if (this.waveManager) {
                this.waveManager.update(dt);
            }
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
        if (sunDisplay) {
            sunDisplay.innerText = Math.floor(this.sun);
        }

        // Wave Progress
        const waveBar = document.getElementById('wave-progress-bar');
        if (waveBar && this.waveManager) {
            const pct = this.waveManager.getProgress() * 100;
            waveBar.style.width = pct + '%';
        }

        if (this.crazyDave) this.crazyDave.update(dt);

        // Boss Health Bar UI
        const bossContainer = document.getElementById('boss-health-container');
        if (bossContainer) {
            const boss = this.zombies.find(z => z.type === 'boss');
            if (boss && !boss.markedForDeletion) {
                bossContainer.classList.remove('hidden');
                const fill = document.getElementById('boss-health-bar-fill');
                if (fill) {
                    const pct = Math.max(0, (boss.health / boss.maxHealth) * 100);
                    fill.style.width = pct + '%';
                }
            } else {
                bossContainer.classList.add('hidden');
            }
        }

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
    showHugeWaveMessage() {
        const div = document.createElement('div');
        div.innerText = "A HUGE WAVE OF ZOMBIES IS APPROACHING!";
        div.style.position = 'absolute';
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.color = '#ef4444';
        div.style.fontSize = '40px';
        div.style.fontWeight = 'bold';
        div.style.textShadow = '2px 2px 0 #000';
        div.style.fontFamily = 'Creepster, cursive, sans-serif'; // Or just inherit
        div.style.zIndex = '1000';
        div.style.pointerEvents = 'none';

        document.getElementById('ui-layer').appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 3000);
    }
}
