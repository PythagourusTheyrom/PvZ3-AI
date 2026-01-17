package main

type Grid struct {
	Rows     int
	Cols     int
	CellSize float64
	StartX   float64
	StartY   float64

	HoverRow int
	HoverCol int
}

var globalGrid = &Grid{
	Rows:     5,
	Cols:     9,
	CellSize: 100,
	StartX:   245, // Adjusted from 200
	StartY:   80,  // Adjusted from 100
	HoverRow: -1,
	HoverCol: -1,
}

func InitGrid(rows, cols int, cellSize, startX, startY float64) {
	globalGrid.Rows = rows
	globalGrid.Cols = cols
	globalGrid.CellSize = cellSize
	globalGrid.StartX = startX
	globalGrid.StartY = startY
}

func CheckHover(x, y float64) (int, int) {
	if x < globalGrid.StartX || x >= globalGrid.StartX+float64(globalGrid.Cols)*globalGrid.CellSize ||
		y < globalGrid.StartY || y >= globalGrid.StartY+float64(globalGrid.Rows)*globalGrid.CellSize {
		globalGrid.HoverRow = -1
		globalGrid.HoverCol = -1
		return -1, -1
	}

	col := int((x - globalGrid.StartX) / globalGrid.CellSize)
	row := int((y - globalGrid.StartY) / globalGrid.CellSize)

	globalGrid.HoverCol = col
	globalGrid.HoverRow = row
	return row, col
}
