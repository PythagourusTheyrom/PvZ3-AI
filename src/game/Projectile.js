import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(game, x, y, type = 'normal') {
        super(game, x, y);
        this.width = 20;
        this.height = 20;
        this.speed = 0.4; // Faster than zombie
        this.damage = 25;
        this.markedForDeletion = false;
        this.type = type;
        this.freeze = type === 'frozen';
    }

    update(deltaTime) {
        this.x += this.speed * deltaTime;

        if (this.x > this.game.width) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (this.type === 'frozen') {
            ctx.fillStyle = '#60a5fa'; // Blue
        } else {
            ctx.fillStyle = '#4ade80'; // Green pea
        }

        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        if (this.type === 'frozen') {
            ctx.fillStyle = '#bfdbfe';
        } else {
            ctx.fillStyle = '#86efac';
        }
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 - 3, this.y + this.height / 2 - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
