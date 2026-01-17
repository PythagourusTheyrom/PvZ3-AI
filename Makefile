.PHONY: build-wasm run-modmaker clean

# Build the WebAssembly module
build-wasm:
	GOOS=js GOARCH=wasm go build -o public/lib.wasm ./src/game/wasm

# Run the Mod Maker tool
run-modmaker:
	go run ./tools/modmaker/cmd/modmaker --port 8080 --data public/data

# Clean up build artifacts
clean:
	rm -f public/lib.wasm modmaker
