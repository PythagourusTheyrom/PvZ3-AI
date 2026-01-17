import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { AssetLoader } from './graphics/AssetLoader.js';
import { WasmLoader } from './graphics/WasmLoader.js'; // Added import

export class Plant extends Entity {
    constructor(game, x, y, type) {
        super(game, x, y);
        this.type = type;
        this.health = 100;
        this.timer = 0;
        this.shootInterval = 1500;

        // Wasm Init
        const useWasm = WasmLoader.instance && WasmLoader.instance.isReady && window.createPlant;
        if (useWasm) {
            this.id = window.createPlant(type, x, y);
        }

        // Load stats from data
        if (game.gameData && game.gameData.plants[type]) {
            const stats = game.gameData.plants[type];
            this.health = stats.health || 100;
            this.shootInterval = stats.shootInterval || 1500;
            // Add other stats as needed
            if (stats.armingTime) this.armingTime = stats.armingTime;
            if (stats.produceInterval) this.produceInterval = stats.produceInterval;
        }

        this.color = type === 'peashooter' ? '#4ade80' :
            type === 'sunflower' ? '#facc15' :
                type === 'wallnut' ? '#a16207' :
                    type === 'cherrybomb' ? '#dc2626' :
                        type === 'snowpea' ? '#60a5fa' :
                            type === 'snowpea' ? '#60a5fa' :
                                type === 'repeater' ? '#22c55e' : // Darker green
                                    type === 'potatomine' ? '#b45309' :
                                        type === 'threepeater' ? '#10b981' : // Emerald
                                            type === 'squash' ? '#f97316' : '#fff'; // Orange

        // Potato Mine specific
        this.isArmed = false;
        if (this.type === 'potatomine') {
            this.health = 300; // Fairly tough? Or weak? Usually weak until armed.
            this.armingTime = 14000; // 14 seconds
        }

        this.idleTime = 0;

        // Repeater sub-timer
        this.shotsFired = 0;
        this.burstTimer = 0;
    }

    update(deltaTime) {
        if (this.id !== undefined && window.updatePlant) {
            window.updatePlant(this.id, deltaTime);
            this.idleTime += deltaTime * 0.002; // Keep visual animation running
            return;
        }

        this.timer += deltaTime;
        this.idleTime += deltaTime * 0.002;

        if (this.type === 'peashooter') {
            if (this.timer > this.shootInterval) {
                this.timer = 0;
                this.shoot();
            }
        } else if (this.type === 'threepeater') {
            if (this.timer > this.shootInterval) {
                this.timer = 0;
                this.shoot();
            }
        } else if (this.type === 'repeater') {
            if (this.timer > this.shootInterval) {
                this.timer = 0;
                this.shoot();
                this.shotsFired = 1;
                this.burstTimer = 200; // 200ms delay for second shot
            }
            if (this.shotsFired === 1) {
                this.burstTimer -= deltaTime;
                if (this.burstTimer <= 0) {
                    this.shoot();
                    this.shotsFired = 0;
                }
            }
        } else if (this.type === 'snowpea') {
            if (this.timer > this.shootInterval) {
                this.timer = 0;
                this.shoot('frozen');
            }
        } else if (this.type === 'sunflower') {
            if (this.timer > 5000) {
                this.timer = 0;
                // this.game.sun += 25; // Old way
                this.game.spawnSun(this.x + 10, this.y + 10, this.y + 40); // Pop out then fall a bit? or just appear
                // Actually usually they pop out. For now just spawn there.
            }
        } else if (this.type === 'cherrybomb') {
            if (this.timer > 2000) { // 2 seconds fuse
                this.explode();
            }
        } else if (this.type === 'potatomine') {
            if (!this.isArmed) {
                // Arming logic handled by visual timer, but actual Arming state:
                if (this.timer > this.armingTime) {
                    this.isArmed = true;
                }
            }
        }
    }

    shoot(type = 'normal') {
        if (this.type === 'threepeater') {
            // Center
            this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y + 30, type));
            // Global coordinate system.
            // Top (Row Above)
            if (this.y - 100 >= this.game.grid.startY) {
                this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y - 100 + 30, type));
            }
            // Bottom (Row Below)
            if (this.y + 100 < this.game.grid.startY + this.game.grid.rows * 100) {
                this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y + 100 + 30, type));
            }
        } else {
            this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y + 30, type));
        }
    }

    explode() {
        this.markedForDeletion = true;
        this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2);
    }

    draw(ctx) {
        if (this.type === 'peashooter') {
            this.drawPeashooter(ctx);
        } else if (this.type === 'repeater') {
            this.drawRepeater(ctx);
        } else if (this.type === 'snowpea') {
            this.drawSnowPea(ctx);
        } else if (this.type === 'cherrybomb') {
            this.drawCherryBomb(ctx);
        } else if (this.type === 'potatomine') {
            this.drawPotatoMine(ctx);
        } else if (this.type === 'threepeater') {
            this.drawThreepeater(ctx);
        } else if (this.type === 'squash') {
            this.drawSquash(ctx);
        } else if (this.type === 'sunflower') {
            this.drawSunflower(ctx);
        } else if (this.type === 'wallnut') {
            this.drawWallnut(ctx);
        } else {
            // Fallback
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPeashooter(ctx) {
        const head = AssetLoader.getImage('peashooter_head'); // 603x743
        const leaf = AssetLoader.getImage('peashooter_leaf'); // 818x858

        if (!head || !leaf) return;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2 + 20;

        const scale = 0.08; // Reduced from 0.12

        ctx.save();
        ctx.translate(cx, cy);

        // Draw Leaves (Base)
        ctx.save();
        ctx.scale(scale, scale);
        // Leaf Pivot (Bottom center): 409, 850
        ctx.drawImage(leaf, -409, -850);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(leaf, -409, -850);
        ctx.restore();
        ctx.restore();

        // Draw Head
        const bob = Math.sin(this.idleTime) * 5;
        ctx.save();
        ctx.translate(0, -30 + bob); // Scaled translation
        ctx.scale(scale, scale);
        // Head Pivot (Neck/Back): 150, 700?
        ctx.drawImage(head, -150, -700);
        ctx.restore();

        ctx.restore();
    }

    drawSnowPea(ctx) {
        const img = AssetLoader.getImage('snow_pea');
        if (!img) return;

        ctx.save();
        // Assuming the generated image is roughly square/centered
        // Let's just draw it centered in the cell for now
        ctx.drawImage(img, this.x + 10, this.y + 10, this.width - 20, this.height - 20);
        ctx.restore();
    }

    drawCherryBomb(ctx) {
        const img = AssetLoader.getImage('cherry_bomb');
        if (!img) return;

        // Pulse effect
        const scale = 1 + Math.sin(this.timer * 0.01) * 0.1;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -40, -40, 80, 80);
        ctx.restore();
    }

    drawPotatoMine(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + 20); // Sit low

        if (this.isArmed) {
            // Red indicator blinking
            const blink = Math.sin(this.game.lastTime * 0.01) > 0 ? '#ef4444' : '#b45309';
            ctx.fillStyle = blink;
        } else {
            ctx.fillStyle = '#b45309';
        }

        // Draw Spud
        const img = AssetLoader.getImage('potatomine');
        if (img) {
            ctx.drawImage(img, -30, -30, 60, 60);

            // Safe indicator if not armed
            if (!this.isArmed) {
                // Dim it? or draw "..."
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.beginPath();
            ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
            ctx.fill();

            // Safe indicator if not armed
            if (!this.isArmed) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText("...", 0, 5);
            }
        }

        ctx.restore();
    }
        ctx.restore();
}

drawSunflower(ctx) {
    const img = AssetLoader.getImage('sunflower');
    if (!img) return;
    ctx.save();
    ctx.drawImage(img, this.x, this.y, this.width, this.height);
    ctx.restore();
}

drawWallnut(ctx) {
    const img = AssetLoader.getImage('wallnut');
    if (!img) return;

    // Damage states (visualized by tint or just shake?)
    // For now just draw image
    ctx.save();
    ctx.drawImage(img, this.x, this.y, this.width, this.height);
    ctx.restore();
}

drawRepeater(ctx) {
    const img = AssetLoader.getImage('repeater');
    if (img) {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
        this.drawPeashooter(ctx);
    }
}

drawThreepeater(ctx) {
    const img = AssetLoader.getImage('threepeater');
    if (img) {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
        // Fallback
        this.drawPeashooter(ctx);
    }
}

drawSquash(ctx) {
    const img = AssetLoader.getImage('squash');
    if (img) {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
        // Fallback
        ctx.fillStyle = '#f97316';
        ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);
    }
}
