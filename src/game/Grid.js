export class Grid {
    constructor(game, rows = 5, cols = 9, cellSize = 100, startX = 245, startY = 80, laneTypes = []) {
        this.game = game;
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        this.startX = startX;
        this.startY = startY;
        this.laneTypes = laneTypes.length > 0 ? laneTypes : new Array(rows).fill('grass');

        // Initialize Wasm Grid if ready
        if (window.initGrid) {
            window.initGrid(rows, cols, cellSize, startX, startY);
        }

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
                    y: startY + r * cellSize,
                    plant: null,
                    basePlant: null // For Lily Pad, etc.
                });
            }
            this.cells.push(row);
        }
    }

    // Convert Screen X,Y to Grid Row,Col
    getGridPos(x, y) {
        // Use Wasm if available for "Logic"
        if (window.checkGridHover) {
            window.checkGridHover(x, y);
            const state = window.getGridHoverState(); // [row, col]
            if (state[0] !== -1 && state[1] !== -1) {
                return { row: state[0], col: state[1] };
            }
            return null;
        }

        // Fallback
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

    isWater(row) {
        return this.laneTypes[row] === 'water';
    }

    draw(ctx) {
        // Draw grid lines
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';

        // Update Wasm hover state with current mouse pos?
        // Input.js usually tracks mouse. Let's assume we can get it from game.input if exposed,
        // or we trust getGridPos was called recently. 
        // Actually, to animate hover, we need to know where the mouse IS.
        // Game.js passes dt to update, but not mouse.
        // Let's rely on stored state or Input.

        let hoverRow = -1, hoverCol = -1;
        if (window.getGridHoverState) {
            const s = window.getGridHoverState();
            hoverRow = s[0];
            hoverCol = s[1];
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.cells[r][c];

                // Grid background checkerboard (subtle)
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.fillRect(cell.x, cell.y, this.cellSize, this.cellSize);
                }

                // Hover Effect
                if (r === hoverRow && c === hoverCol) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Highlight
                    ctx.fillRect(cell.x, cell.y, this.cellSize, this.cellSize);
                }

                // Draw Plant if exists
                if (cell.basePlant) {
                    cell.basePlant.draw(ctx);
                }
                if (cell.plant) {
                    cell.plant.draw(ctx);
                }
            }
        }
    }
}
