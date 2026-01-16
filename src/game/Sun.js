
export class Sun {
    constructor(game, x, y, toY) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.toY = toY !== undefined ? toY : y; // Defaults to staying put if no dest
        this.value = 25;

        this.width = 50;
        this.height = 50;
        this.markedForDeletion = false;

        this.life = 0;
        this.maxLife = 10000; // 10s before disappearing
        this.fallSpeed = 0.05; // px/ms
        this.opacity = 1.0;
    }

    update(dt) {
        this.life += dt;
        if (this.life > this.maxLife) {
            this.markedForDeletion = true;
        }

        if (this.y < this.toY) {
            this.y += this.fallSpeed * dt;
        }

        // Fade out near end
        if (this.life > this.maxLife - 1000) {
            this.opacity = (this.maxLife - this.life) / 1000;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Draw Sun (Yellow Circle with glow)
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();

        // Rays?
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.opacity * 0.8;
        for (let i = 0; i < 8; i++) {
            const angle = (Date.now() / 1000) + (i * Math.PI / 4);
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * 22, cy + Math.sin(angle) * 22);
            ctx.lineTo(cx + Math.cos(angle) * 35, cy + Math.sin(angle) * 35);
            ctx.stroke();
        }

        ctx.restore();
    }

    isMouseOver(mx, my) {
        return (mx >= this.x && mx <= this.x + this.width &&
            my >= this.y && my <= this.y + this.height);
    }
}
