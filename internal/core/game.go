package core

import (
	"pvz/internal/assets"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
)

type Game struct {
	// Game state will go here
}

func NewGame() *Game {
	assets.LoadAssets()
	return &Game{}
}

func (g *Game) Update() error {
	// Update logic goes here
	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	if assets.BackgroundImage != nil {
		screen.DrawImage(assets.BackgroundImage, nil)
	}
	ebitenutil.DebugPrint(screen, "PvZ Go - Early Alpha")
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (screenWidth, screenHeight int) {
	return 800, 600
}
