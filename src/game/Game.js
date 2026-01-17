import { Grid } from './Grid.js';
import { Input } from './Input.js';
import { Plant } from './Plant.js';
import { Zombie } from './Zombie.js';
import { Projectile } from './Projectile.js';
import { AssetLoader } from './graphics/AssetLoader.js';
import { Sun } from './Sun.js';
import { CrazyDave } from './CrazyDave.js';
import { getLevelConfig } from './LevelConfig.js';


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
        this.assetsLoaded = false;
        AssetLoader.loadAll().then(() => {
            this.assetsLoaded = true;
        });

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
        this.zombiesKilled = 0;
        this.zombieSpawnTimer = 0;

        // Load Level Config
        if (this.gameData) {
            this.currentLevelConfig = getLevelConfig(this.level, this.gameData.levels);
            this.zombiesToSpawn = this.currentLevelConfig.zombiesToSpawn;
            this.zombieSpawnInterval = this.currentLevelConfig.spawnInterval;
        }

        // Hide screens

        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('sun-display').innerText = this.sun;
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

                if (this.sun >= cost) {
                    this.sun -= cost;
                    cell.plant = new Plant(this, cell.x, cell.y, this.selectedPlant);
                }
            }
        }
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.state === 'PLAYING') {
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
        this.zombieSpawnTimer += dt;
        if (this.zombieSpawnTimer > this.zombieSpawnInterval && this.zombiesSpawned < this.zombiesToSpawn) {
            this.zombieSpawnTimer = 0;
            const row = Math.floor(Math.random() * this.grid.rows);
            const y = this.grid.startY + row * this.grid.cellSize + 10; // Offset

            // Weighted spawn logic based on available types
            const types = this.currentLevelConfig.zombieTypes;
            const type = types[Math.floor(Math.random() * types.length)];

            this.zombies.push(new Zombie(this, y, type));
            this.zombiesSpawned++;

            // Speed up slightly
            if (this.zombieSpawnInterval > 1000) this.zombieSpawnInterval -= 50;
        } else if (this.zombiesSpawned >= this.zombiesToSpawn && this.zombies.length === 0) {
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
        if (this.crazyDave) this.crazyDave.draw(this.ctx);
    }
}
