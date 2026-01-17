package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/jpeg" // Support JPEG decoding
	"image/png"
	"os"
	"path/filepath"
)

	"strings"
	"sync"
)

func ProcessAssets(baseDir string) error {
	assetsDir := filepath.Join(baseDir, "src/assets")
	fmt.Printf("Scanning assets in: %s\n", assetsDir)

	files, err := os.ReadDir(assetsDir)
	if err != nil {
		return err
	}

	var wg sync.WaitGroup

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		
		ext := strings.ToLower(filepath.Ext(file.Name()))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			continue
		}

		wg.Add(1)
		go func(filename string) {
			defer wg.Done()
			path := filepath.Join(assetsDir, filename)
			if err := processImage(path); err != nil {
				// We log errors but don't stop the whole process
				fmt.Printf("Error processing %s: %v\n", filename, err)
			}
		}(file.Name())
	}

	wg.Wait()
	return nil
}

func processImage(path string) error {
	fmt.Printf("Reading %s...\n", filepath.Base(path))

	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		return err
	}

	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	// Create a mutable image
	rgba := image.NewRGBA(bounds)
	draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)

	minX, maxX := w, 0
	minY, maxY := h, 0
	hasVisiblePixels := false

	// Scan and modify pixels
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c := rgba.RGBAAt(x, y)

			// Jimp/JS logic:
			// const isGray = Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
			// const isLight = r > 100;
			// Note: Go's RGBAAt returns uint8 (0-255)

			r, g, b := int(c.R), int(c.G), int(c.B)

			isGray := abs(r-g) < 25 && abs(g-b) < 25
			isLight := r > 100

			if isGray && isLight {
				// Make transparent
				rgba.SetRGBA(x, y, color.RGBA{0, 0, 0, 0})
			} else if c.A > 0 {
				// Track bounds for non-transparent pixels
				hasVisiblePixels = true
				if x < minX {
					minX = x
				}
				if x > maxX {
					maxX = x
				}
				if y < minY {
					minY = y
				}
				if y > maxY {
					maxY = y
				}
			}
		}
	}

	if !hasVisiblePixels {
		fmt.Printf("Empty image: %s\n", filepath.Base(path))
		return nil
	}

	// Crop
	cropW := maxX - minX + 1
	cropH := maxY - minY + 1

	rect := image.Rect(minX, minY, maxX+1, maxY+1)
	subImg := rgba.SubImage(rect)

	fmt.Printf("Cropping to %d,%d %dx%d\n", minX, minY, cropW, cropH)
	fmt.Printf("Writing %s...\n", filepath.Base(path))

	outF, err := os.Create(path)
	if err != nil {
		return err
	}
	defer outF.Close()

	return png.Encode(outF, subImg)
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
