
export class FogManager {
    constructor(game) {
        this.game = game;
        this.isVisible = true; // Fog can be blown away
        this.fogStartCol = 4; // Start fog at column 4 (0-indexed) usually
        this.fogAlpha = 0.9; // Very thick

        this.blowTimer = 0;
        this.isBlowing = false;
        this.blowDuration = 0;
    }

    update(dt) {
        if (this.isBlowing) {
            this.blowTimer += dt;
            if (this.blowTimer > this.blowDuration) {
                this.isBlowing = false;
                this.blowTimer = 0;
            }
        }
    }

    draw(ctx) {
        if (this.isBlowing) return; // Fog is gone

        const grid = this.game.grid;
        // Draw Fog Overlay
        // We need to punch holes for Planterns
        // Approach: Draw full fog to an offscreen canvas or use globalCompositeOperation 'destination-out'

        ctx.save();

        // We'll fill the whole fog area first
        // Usually fog starts from right side.
        const startX = grid.startX + (this.fogStartCol * grid.cellWidth);
        const endX = grid.startX + (grid.cols * grid.cellWidth); // or canvas width

        // Create a mask/path
        ctx.beginPath();
        ctx.rect(startX, 0, this.game.width - startX, this.game.height);

        // Exclude Plantern areas?
        // It's easier to fill a big rect, then use destination-out to clear holes.
        // But we are drawing ON the main canvas.
        // So we should clip?
        // Or simpler: Draw fog on temp canvas, clear holes, then draw temp canvas to screen.

        // Let's assume we can draw simple overlay directly if simple rects.
        // But Plantern radius is circular.

        // TEMP CANVAS approach for nice holes
        if (!this.fogCanvas) {
            this.fogCanvas = document.createElement('canvas');
            this.fogCanvas.width = this.game.width;
            this.fogCanvas.height = this.game.height;
            this.fogCtx = this.fogCanvas.getContext('2d');
        }

        const fCtx = this.fogCtx;
        fCtx.clearRect(0, 0, this.game.width, this.game.height);

        // Draw Fog base
        fCtx.fillStyle = `rgba(180, 180, 200, ${this.fogAlpha})`; // Grayish fog
        fCtx.fillRect(startX, 0, this.game.width - startX, this.game.height);

        // CLEAR HOLES
        fCtx.globalCompositeOperation = 'destination-out';

        // Find all Planterns
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cell = grid.cells[r][c];
                if (cell.plant && (cell.plant.type === 'plantern' || cell.plant.type === 'torchwood')) {
                    // Torchwood usually clears a bit too? No, mostly Plantern.
                    // Assume Plantern type logic
                    if (cell.plant.type === 'plantern') {
                        const cx = cell.x + cell.width / 2;
                        const cy = cell.y + cell.height / 2;
                        const radius = 150; // Roughly 3x3 grid

                        // Gradient alpha for smoother edge?
                        const grad = fCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)'); // Soft edge
                        // Wait, destination-out uses alpha to remove. 
                        // So 1 alpha = remove fully. 0 alpha = remove nothing.

                        fCtx.fillStyle = 'rgba(0,0,0,1)'; // Clear fully
                        fCtx.beginPath();
                        fCtx.arc(cx, cy, radius, 0, Math.PI * 2);
                        fCtx.fill();
                    }
                }
            }
        }

        fCtx.globalCompositeOperation = 'source-over'; // Reset

        // Draw fog to main canvas
        ctx.drawImage(this.fogCanvas, 0, 0);

        ctx.restore();
    }

    blowFog() {
        this.isBlowing = true;
        this.blowDuration = 10000; // 10 seconds clear
        this.blowTimer = 0;
    }
}
