export class Entity {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        // Override
    }

    draw(ctx) {
        // Override
        // Debug draw
        ctx.strokeStyle = 'red';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}
