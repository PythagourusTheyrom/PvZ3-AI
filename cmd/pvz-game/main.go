package main

import (
	"log"
	"pvz/internal/core"

	"github.com/hajimehoshi/ebiten/v2"
)

func main() {
	game := core.NewGame()

	ebiten.SetWindowSize(800, 600)
	ebiten.SetWindowTitle("Plants vs. Zombies - Go Port")

	if err := ebiten.RunGame(game); err != nil {
		log.Fatal(err)
	}
}
