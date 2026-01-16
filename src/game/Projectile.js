import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(game, x, y) {
        super(game, x, y);
        this.width = 20;
        this.height = 20;
        this.speed = 0.4; // Faster than zombie
        this.damage = 25;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        this.x += this.speed * deltaTime;

        if (this.x > this.game.width) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#4ade80'; // Green pea
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 - 3, this.y + this.height / 2 - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
