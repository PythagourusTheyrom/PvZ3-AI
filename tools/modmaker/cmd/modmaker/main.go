package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"pvz/tools/modmaker/internal/assets"
	"pvz/tools/modmaker/internal/server"
)

var dataDir string

func main() {
	// Allow overriding the data directory
	// Default to ../../public/data relative to the new cmd location?
	// The original default was "../../public/data".
	// If running from root: "public/data"
	// Let's stick to a sensible default or rely on the user/script providing it.
	// The original code had: flag.StringVar(&dataDir, "data", "../../public/data", "Path to the data directory")
	flag.StringVar(&dataDir, "data", "public/data", "Path to the data directory")
	port := flag.String("port", "8080", "Port to run the server on")
	optimize := flag.Bool("optimize", false, "Run asset optimization (transparency & cropping)")
	flag.Parse()

	cwd, _ := os.Getwd()

	// Handle optimization task
	if *optimize {
		// We expect to be running from root usually now with the new structure?
		// Or we try to find the src/assets.
		// Let's assume running from root or provide a way to find it.
		// Logic from original:
		err := assets.ProcessAssets(cwd)
		if err != nil {
			// Try going up levels if we are deep?
			// But for now let's assume CWD is project root.
			// The original code tried "../../"
			// If we run `go run tools/modmaker/cmd/modmaker/main.go` from root, CWD is root.
			// If we run from `tools/modmaker`, CWD is `tools/modmaker`.
			// Let's try root fallback if "src/assets" not found in CWD.
			if _, statErr := os.Stat(filepath.Join(cwd, "src/assets")); os.IsNotExist(statErr) {
				// Try ../..
				err = assets.ProcessAssets(filepath.Join(cwd, "../.."))
			}
		}
		if err != nil {
			log.Fatalf("Failed to process assets: %v", err)
		}
		fmt.Println("Asset optimization complete.")
		return
	}

	server.Start(*port, dataDir, cwd)
}
