package core

import (
	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
)

type Game struct {
	// Game state will go here
}

func NewGame() *Game {
	// Basic asset loading test
	// In a real game, you might want to load assets asynchronously or during a loading screen
	// For now, we load directly to verify.
	// Note: We need to import the assets package, but first we need to fix the import in the file header
	return &Game{}
}

func (g *Game) Update() error {
	// Update logic goes here
	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	// Draw logic goes here
	// Verify background drawing
	// We will assume assets are loaded in main for now or we can call it here once (safeguard needed)
	// Actually, let's just make NewGame load it, but I can't easily edit imports with this tool unless I replace the whole file or use multi_replace.
	// I'll assume I update imports separately or simply rewrite the file since it's small.
	ebitenutil.DebugPrint(screen, "PvZ Go - Early Alpha")
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (screenWidth, screenHeight int) {
	return 800, 600
}
