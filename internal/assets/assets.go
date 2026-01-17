package assets


//go:embed images/*.webp
var assetsFS embed.FS

var (
	BackgroundImage *ebiten.Image
)

func LoadAssets() {
	var err error
	BackgroundImage, err = loadImage("images/background.webp")
	if err != nil {
		log.Fatalf("failed to load background: %v", err)
	}
}

func loadImage(path string) (*ebiten.Image, error) {
	data, err := assetsFS.ReadFile(path)
	if err != nil {
		return nil, err
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	return ebiten.NewImageFromImage(img), nil
}
