package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var dataDir string

func main() {
	// Allow overriding the data directory
	flag.StringVar(&dataDir, "data", "../../public/data", "Path to the data directory")
	port := flag.String("port", "8080", "Port to run the server on")
	optimize := flag.Bool("optimize", false, "Run asset optimization (transparency & cropping)")
	flag.Parse()

	cwd, _ := os.Getwd()

	// Handle optimization task
	if *optimize {
		// We expect to be running from tools/modmaker, so project root is ../..
		// Or we can assume current directory context.
		// Let's assume the user runs it from the root or we find the root.
		// For now, let's look for src/assets relative to CWD or ../../
		// For now, let's look for src/assets relative to CWD or ../../
		// cwd defined above
		err := ProcessAssets(cwd) // Try current dir (if running from root)
		if err != nil {
			// Try going up two levels if running from tools/modmaker
			err = ProcessAssets(filepath.Join(cwd, "../.."))
		}
		if err != nil {
			log.Fatalf("Failed to process assets: %v", err)
		}
		fmt.Println("Asset optimization complete.")
		return
	}

	// Get absolute path for dataDir for clarity
	absDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		log.Fatalf("Failed to resolve data directory: %v", err)
	}
	fmt.Printf("Starting Mod Maker...\n")
	fmt.Printf("Serving data from: %s\n", absDataDir)
	fmt.Printf("Server listening on http://localhost:%s\n", *port)

	// API Handlers
	http.HandleFunc("/api/list", handleList)
	http.HandleFunc("/api/data/", handleData) // /api/data/{filename}

	// Static Files (Mod Maker UI)
	// Server from public/modmaker to ensure consistency with deployed version
	modMakerDir := filepath.Join(cwd, "../../public/modmaker")
	if _, err := os.Stat(filepath.Join(cwd, "public/modmaker")); err == nil {
		modMakerDir = filepath.Join(cwd, "public/modmaker") // If running from root
	}

	fs := http.FileServer(http.Dir(modMakerDir))
	http.Handle("/", fs)

	// Serve public directory for Wasm and assets
	// We are in tools/modmaker, so public is ../../public
	// Determine absolute path to avoid issues
	// Determine absolute path to avoid issues
	// cwd defined above
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

	log.Fatal(http.ListenAndServe(":"+*port, nil))
}

func handleList(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir(dataDir)
	if err != nil {
		http.Error(w, "Failed to read data directory", http.StatusInternalServerError)
		return
	}

	var filenames []string
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".json" {
			filenames = append(filenames, f.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(filenames)
}

func handleData(w http.ResponseWriter, r *http.Request) {
	// url path is /api/data/filename.json
	filename := filepath.Base(r.URL.Path)
	if filename == "data" || filename == "." || filename == "/" {
		http.Error(w, "Invalid filename", http.StatusBadRequest)
		return
	}

	targetPath := filepath.Join(dataDir, filename)

	if r.Method == http.MethodGet {
		data, err := os.ReadFile(targetPath)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "File not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	} else if r.Method == http.MethodPost {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read input", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		// Basic validation: ensure it's valid JSON
		if !json.Valid(body) {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		err = os.WriteFile(targetPath, body, 0644)
		if err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Saved"))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
