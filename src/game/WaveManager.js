
import { Zombie } from './Zombie.js';

export class WaveManager {
    constructor(game, waves) {
        this.game = game;
        this.waves = waves || [];
        this.currentWaveIndex = 0;
        this.currentWaveTime = 0;
        this.spawnIndex = 0;
        this.waveState = 'START_DELAY'; // START_DELAY, SPAWNING, WAITING_TO_CLEAR, COMPLETE
        this.waveTimer = 0;

        // Initial Startup Delay
        this.startDelay = 2000;
        if (this.waves.length > 0 && this.waves[0].startDelay) {
            this.startDelay = this.waves[0].startDelay;
        }

        this.hasShownFlag = false;
    }

    update(dt) {
        if (this.waveState === 'COMPLETE') return;

        if (this.waveState === 'START_DELAY') {
            this.waveTimer += dt;
            if (this.waveTimer >= this.startDelay) {
                this.startWave();
            }
            return;
        }

        if (this.waveState === 'SPAWNING') {
            this.waveTimer += dt;

            const currentWave = this.waves[this.currentWaveIndex];
            const spawns = currentWave.spawns;

            // Check if we have more spawns
            if (this.spawnIndex < spawns.length) {
                const nextSpawn = spawns[this.spawnIndex];
                if (this.waveTimer >= nextSpawn.delay) {
                    this.spawnZombie(nextSpawn.type);
                    this.spawnIndex++;
                    // Reset timer for relative delay or keep accumulating?
                    // The config structure `delay` implies "wait X ms before spawning THIS one". 
                    // If it was absolute time, we'd check against total time.
                    // My structure in plan was `delay` between spawns.
                    // So I reset timer.
                    this.waveTimer = 0;
                }
            } else {
                // All spawned, wait for clear
                this.waveState = 'WAITING_TO_CLEAR';
            }
        }

        if (this.waveState === 'WAITING_TO_CLEAR') {
            // Check if all zombies are dead
            if (this.game.zombies.length === 0) {
                this.nextWave();
            }
        }
    }

    startWave() {
        this.waveState = 'SPAWNING';
        this.spawnIndex = 0;
        this.waveTimer = 0;

        const currentWave = this.waves[this.currentWaveIndex];

        if (currentWave.isFlag) {
            this.game.showHugeWaveMessage();
        }

        console.log(`Starting Wave ${this.currentWaveIndex + 1}`);
    }

    spawnZombie(type) {
        const row = Math.floor(Math.random() * this.game.grid.rows);
        const y = this.game.grid.startY + row * this.game.grid.cellSize + 10;
        this.game.zombies.push(new Zombie(this.game, y, type));
        this.game.zombiesSpawned++;
    }

    nextWave() {
        this.currentWaveIndex++;
        if (this.currentWaveIndex >= this.waves.length) {
            this.waveState = 'COMPLETE';
            this.game.levelComplete();
        } else {
            this.waveState = 'START_DELAY';
            this.waveTimer = 0;
            if (this.waves[this.currentWaveIndex].startDelay) {
                this.startDelay = this.waves[this.currentWaveIndex].startDelay;
            } else {
                this.startDelay = 5000;
            }
        }
    }

    getProgress() {
        if (this.waves.length === 0) return 0;
        // Simple progress based on wave index
        // We can make it smoother by including spawnIndex, but wave index is safest for now
        let progress = this.currentWaveIndex / this.waves.length;

        // Add partial progress for current wave
        if (this.waveState === 'SPAWNING' && this.waves[this.currentWaveIndex].spawns.length > 0) {
            const currentWave = this.waves[this.currentWaveIndex];
            const partial = (this.spawnIndex / currentWave.spawns.length) * (1 / this.waves.length);
            progress += partial;
        } else if (this.waveState === 'WAITING_TO_CLEAR') {
            // Almost done with this wave segment
            progress += (0.99 / this.waves.length);
        }

        return Math.min(1, progress);

    }
}
