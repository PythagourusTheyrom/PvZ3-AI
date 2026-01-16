export class Grid {
    constructor(game, rows = 5, cols = 9, cellSize = 100, startX = 200, startY = 100) {
        this.game = game;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.startX = startX;
        this.startY = startY;

        // 2D Array for grid state
        // Each cell: { plant: null, projectile: null, ... }
        this.cells = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({
                    row: r,
                    col: c,
                    x: startX + c * cellSize,
                    y: startY + r * cellSize,
                    plant: null
                });
            }
            this.cells.push(row);
        }
    }

    // Convert Screen X,Y to Grid Row,Col
    getGridPos(x, y) {
        if (x < this.startX || x >= this.startX + this.cols * this.cellSize ||
            y < this.startY || y >= this.startY + this.rows * this.cellSize) {
            return null;
        }

        const col = Math.floor((x - this.startX) / this.cellSize);
        const row = Math.floor((y - this.startY) / this.cellSize);
        return { row, col };
    }

    getCell(row, col) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return this.cells[row][col];
        }
        return null;
    }

    draw(ctx) {
        // Draw grid lines
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.cells[r][c];

                // Grid background checkerboard (subtle)
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.fillRect(cell.x, cell.y, this.cellSize, this.cellSize);
                }

                // Highlight on hover (if we had input passed here, logic moved to Update)
                // Draw Plant if exists
                if (cell.plant) {
                    cell.plant.draw(ctx);
                }
            }
        }
    }
}
