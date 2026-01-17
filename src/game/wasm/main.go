package main

import (
	"syscall/js"
)

func main() {
	c := make(chan struct{}, 0)

	fmt := js.Global().Get("console")
	fmt.Call("log", "Wasm Animation System Initialized")

	// Export functions
	js.Global().Set("createSkeleton", js.FuncOf(createSkeleton))
	js.Global().Set("updateSkeleton", js.FuncOf(updateSkeleton))
	js.Global().Set("getSkeletonRenderData", js.FuncOf(getSkeletonRenderData))

	<-c
}

// Global store of skeletons to keep them trying alive
// In a real engine, we'd use a better ID system
var skeletons = make(map[int]*Skeleton)
var nextID = 1

func createSkeleton(this js.Value, args []js.Value) interface{} {
	x := float32(args[0].Float())
	y := float32(args[1].Float())

	id := nextID
	nextID++

	skel := NewSkeleton(x, y)
	skeletons[id] = skel

	return id
}

func updateSkeleton(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	dt := float32(args[1].Float())

	if skel, ok := skeletons[id]; ok {
		skel.Update(dt)
	}
	return nil
}

// getSkeletonRenderData(id, float32Array)
// Fills the provided array with visual data
func getSkeletonRenderData(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	destArray := args[1] // Expecting a Float32Array

	if skel, ok := skeletons[id]; ok {
		data := skel.GetRenderData()

		// Fill JS array
		for i, v := range data {
			destArray.SetIndex(i, float64(v))
		}
		return len(data) // Return count of used floats
	}
	return 0
}

// Helper to convert []float32 to []byte for CopyBytesToJS
// This is a bit of a hack because CopyBytesToJS only takes []byte.
// In a real high-perf scenario we might read memory directly from JS side.
func float32ToBytes(f []float32) []byte {
	// Basic unsafe conversion or byte-by-byte copy?
	// Go's syscall/js doesn't natively support CopyBytes for float32 slice yet easily without unsafe.
	// Let's do a safe manual pack for simplicity first, or better yet, return js.ValueOf(slice)
	// which works but is slower.
	// Actually, TypedArrayOf was deprecated.
	// Let's return []interface{} for simplicity first, JS overhead is acceptable for this demo.

	// Changing approach: Return []interface{}
	return nil
}

// Redefining getSkeletonRenderData to return standard array for simplicity
// Optimization: We can pass a pre-allocated Float32Array from JS to fill!
