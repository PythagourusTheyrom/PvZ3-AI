import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { AssetLoader } from './graphics/AssetLoader.js';

export class Plant extends Entity {
    constructor(game, x, y, type) {
        super(game, x, y);
        this.type = type;
        this.health = 100;
        this.timer = 0;
        this.shootInterval = 1500;

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
                            type === 'repeater' ? '#22c55e' : // Darker green
                                type === 'potatomine' ? '#b45309' : '#fff'; // Brown

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
        this.timer += deltaTime;
        this.idleTime += deltaTime * 0.002;

        if (this.type === 'peashooter') {
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
        this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y + 30, type));
    }

    explode() {
        this.markedForDeletion = true;
        this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2);
    }

    draw(ctx) {
        if (this.type === 'peashooter') {
            this.drawPeashooter(ctx);
        } else if (this.type === 'repeater') {
            this.drawPeashooter(ctx);
            // Marker
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 - 10, this.y + this.height - 10, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'snowpea') {
            this.drawSnowPea(ctx);
        } else if (this.type === 'cherrybomb') {
            this.drawCherryBomb(ctx);
        } else if (this.type === 'potatomine') {
            this.drawPotatoMine(ctx);
        } else {
            // Fallback (Sunflower, Wallnut, etc.)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 + 10, this.y + this.height / 2 - 10, 4, 0, Math.PI * 2);
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

        ctx.restore();
    }
}
