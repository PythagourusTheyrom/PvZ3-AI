package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type Handler struct {
	DataDir string
}

func NewHandler(dataDir string) *Handler {
	return &Handler{
		DataDir: dataDir,
	}
}

func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir(h.DataDir)
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

func (h *Handler) HandleData(w http.ResponseWriter, r *http.Request) {
	// url path is /api/data/filename.json
	filename := filepath.Base(r.URL.Path)
	if filename == "data" || filename == "." || filename == "/" {
		http.Error(w, "Invalid filename", http.StatusBadRequest)
		return
	}

	targetPath := filepath.Join(h.DataDir, filename)

	switch r.Method {
	case http.MethodGet:
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
	case http.MethodPost:
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
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Marketplace Structures
type MarketplaceMod struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"` // e.g., "level", "plant", "gameplay"
	Data        string `json:"data"` // JSON content of the mod
	Filename    string `json:"filename"`
}

var availableMods = []MarketplaceMod{
	{
		ID:          "mod_hard_mode",
		Name:        "Hard Mode",
		Description: "Increases zombie health and spawn rate.",
		Type:        "gameplay",
		Filename:    "hard_mode.json",
		Data:        `{"zombie_health_multiplier": 2.0, "spawn_rate_multiplier": 1.5}`,
	},
	{
		ID:          "mod_cheat_mode",
		Name:        "Cheat Mode",
		Description: "Infinite sun and instant cooldowns.",
		Type:        "gameplay",
		Filename:    "cheat_mode.json",
		Data:        `{"infinite_sun": true, "instant_cooldown": true}`,
	},
	{
		ID:          "mod_night_level",
		Name:        "Spooky Night Level",
		Description: "A custom night level with fog.",
		Type:        "level",
		Filename:    "level_night.json",
		Data:        `{"background": "night", "fog": true, "waves": 20}`,
	},
}

func (h *Handler) HandleMarketplaceList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(availableMods)
}

func (h *Handler) HandleMarketplaceInstall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ModID string `json:"mod_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var selectedMod *MarketplaceMod
	for _, mod := range availableMods {
		if mod.ID == req.ModID {
			selectedMod = &mod
			break
		}
	}

	if selectedMod == nil {
		http.Error(w, "Mod not found", http.StatusNotFound)
		return
	}

	targetPath := filepath.Join(h.DataDir, selectedMod.Filename)
	err := os.WriteFile(targetPath, []byte(selectedMod.Data), 0644)
	if err != nil {
		http.Error(w, "Failed to install mod", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Mod installed successfully"))
}
