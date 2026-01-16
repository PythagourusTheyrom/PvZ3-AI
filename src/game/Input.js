export class Input {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;

        this.mouseX = 0;
        this.mouseY = 0;

        // Bind listeners
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        // Notify game/grid of hover if needed
    }

    onMouseDown(e) {
        if (this.game.state !== 'PLAYING') return;

        const pos = this.getMousePos(e);

        // 1. Check Sun Clicks (Top priority)
        let clickedSun = false;
        // Iterate backwards to click top-most sun
        for (let i = this.game.suns.length - 1; i >= 0; i--) {
            const sun = this.game.suns[i];
            if (sun.isMouseOver(pos.x, pos.y)) {
                this.game.collectSun(sun);
                clickedSun = true;
                break; // One at a time
            }
        }

        if (clickedSun) return;

        // 2. Grid/Game Clicks
        this.game.onClick(pos.x, pos.y);
    }
}
