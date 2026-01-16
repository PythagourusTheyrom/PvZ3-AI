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

        this.color = type === 'peashooter' ? '#4ade80' :
            type === 'sunflower' ? '#facc15' :
                type === 'wallnut' ? '#a16207' : '#fff';

        if (this.type === 'wallnut') {
            this.health = 400;
        }

        this.idleTime = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        this.idleTime += deltaTime * 0.002;

        if (this.type === 'peashooter') {
            if (this.timer > this.shootInterval) {
                this.timer = 0;
                this.shoot();
            }
        } else if (this.type === 'sunflower') {
            if (this.timer > 5000) {
                this.timer = 0;
                // this.game.sun += 25; // Old way
                this.game.spawnSun(this.x + 10, this.y + 10, this.y + 40); // Pop out then fall a bit? or just appear
                // Actually usually they pop out. For now just spawn there.
            }
        }
    }

    shoot() {
        this.game.projectiles.push(new Projectile(this.game, this.x + 60, this.y + 30));
    }

    draw(ctx) {
        if (this.type === 'peashooter') {
            this.drawPeashooter(ctx);
        } else {
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
}
