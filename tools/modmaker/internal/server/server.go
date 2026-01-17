package server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"pvz/tools/modmaker/internal/handlers"
)

func Start(port, dataDir, cwd string) {
	// Get absolute path for dataDir for clarity
	absDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		log.Fatalf("Failed to resolve data directory: %v", err)
	}
	fmt.Printf("Starting Mod Maker...\n")
	fmt.Printf("Serving data from: %s\n", absDataDir)
	fmt.Printf("Server listening on http://localhost:%s\n", port)

	h := handlers.NewHandler(absDataDir)

	// API Handlers
	http.HandleFunc("/api/list", h.HandleList)
	http.HandleFunc("/api/data/", h.HandleData) // /api/data/{filename}
	http.HandleFunc("/api/marketplace/list", h.HandleMarketplaceList)
	http.HandleFunc("/api/marketplace/install", h.HandleMarketplaceInstall)

	// Static Files (Mod Maker UI)
	// Serve from public/modmaker to ensure consistency with deployed version
	modMakerDir := filepath.Join(cwd, "../../public/modmaker")
	if _, err := os.Stat(filepath.Join(cwd, "public/modmaker")); err == nil {
		modMakerDir = filepath.Join(cwd, "public/modmaker") // If running from root
	}

	fs := http.FileServer(http.Dir(modMakerDir))
	http.Handle("/", fs)

	// Serve public directory for Wasm and assets
	// We are in tools/modmaker, so public is ../../public
	// Determine absolute path to avoid issues
	publicDir := filepath.Join(cwd, "../../public")
	// If running from root...
	if _, err := os.Stat(filepath.Join(cwd, "public")); err == nil {
		publicDir = filepath.Join(cwd, "public")
	}

	publicFS := http.FileServer(http.Dir(publicDir))
	http.Handle("/public/", http.StripPrefix("/public/", publicFS))

	// Explicitly serve wasm files at root for relative path compatibility
	http.HandleFunc("/lib.wasm", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(publicDir, "lib.wasm"))
	})
	http.HandleFunc("/wasm_exec.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(publicDir, "wasm_exec.js"))
	})

	log.Fatal(http.ListenAndServe(":"+port, nil))
}
