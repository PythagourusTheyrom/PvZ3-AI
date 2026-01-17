package main

import (
	"encoding/json"
	"syscall/js"
)

func main() {
	c := make(chan struct{}, 0)

// Global store of animations
var animations = make(map[int]*Animation)
var nextAnimID = 1

// Entities
var zombies = make(map[int]*Zombie)
var plants = make(map[int]*Plant)
var daves = make(map[int]*Dave)
var nextEntityID = 1

// Events buffer
var eventBuffer []interface{}

func main() {
	c := make(chan struct{}, 0)

	fmt := js.Global().Get("console")
	fmt.Call("log", "Wasm Animation System Initialized")

	// Skel Exports
	js.Global().Set("createSkeleton", js.FuncOf(createSkeleton))
	js.Global().Set("addBone", js.FuncOf(addBone))
	js.Global().Set("updateSkeleton", js.FuncOf(updateSkeleton))
	js.Global().Set("getSkeletonRenderData", js.FuncOf(getSkeletonRenderData))
	js.Global().Set("setBoneTransform", js.FuncOf(setBoneTransform))

	// Animation Exports
	js.Global().Set("createAnimation", js.FuncOf(createAnimation))
	js.Global().Set("addKeyframe", js.FuncOf(addKeyframe))
	js.Global().Set("applyAnimation", js.FuncOf(applyAnimation))
	js.Global().Set("getAnimationJSON", js.FuncOf(getAnimationJSON))

	// Grid Exports
	js.Global().Set("initGrid", js.FuncOf(initGridWrapper))
	js.Global().Set("checkGridHover", js.FuncOf(checkGridHover))
	js.Global().Set("getGridHoverState", js.FuncOf(getGridHoverState))
    
    // Entity Exports
    js.Global().Set("createZombie", js.FuncOf(createZombie))
    js.Global().Set("updateZombie", js.FuncOf(updateZombie))
    js.Global().Set("getZombieSkeletonID", js.FuncOf(getZombieSkeletonID)) // Helper to link JS bones
    
    js.Global().Set("createPlant", js.FuncOf(createPlant))
    js.Global().Set("updatePlant", js.FuncOf(updatePlant))
    
    js.Global().Set("createDave", js.FuncOf(createDave))
    js.Global().Set("updateDave", js.FuncOf(updateDave))
    
    js.Global().Set("pollEvents", js.FuncOf(pollEvents))

	<-c
}

// Global store of skeletons
var skeletons = make(map[int]*Skeleton)
var nextSkelID = 1

// Global store of animations
var animations = make(map[int]*Animation)
var nextAnimID = 1

func createSkeleton(this js.Value, args []js.Value) interface{} {
	x := float32(args[0].Float())
	y := float32(args[1].Float())

	id := nextSkelID
	nextSkelID++

	skel := NewSkeleton(x, y)
	skeletons[id] = skel

	return id
}

// addBone(skelID, parentName, name, imgID, x, y, rot, sx, sy, px, py)
func addBone(this js.Value, args []js.Value) interface{} {
	skelID := args[0].Int()
	parentName := args[1].String()
	name := args[2].String()
	imgID := args[3].Int()

	skel, ok := skeletons[skelID]
	if !ok {
		return false
	}

	bone := &Bone{
		Name:     name,
		ImageID:  imgID,
		LocalX:   float32(args[4].Float()),
		LocalY:   float32(args[5].Float()),
		Rotation: float32(args[6].Float()),
		ScaleX:   float32(args[7].Float()),
		ScaleY:   float32(args[8].Float()),
		PivotX:   float32(args[9].Float()),
		PivotY:   float32(args[10].Float()),
	}

	if parentName == "" {
		skel.Root = bone
	} else {
		if parent, ok := skel.Bones[parentName]; ok {
			bone.Parent = parent
			parent.Children = append(parent.Children, bone)
		} else {
			// Parent not found, maybe simply fail or add to root if explicit?
			// For this tool, let's strict fail
			return false
		}
	}
	skel.Bones[name] = bone
	return true
}

func updateSkeleton(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	dt := float32(args[1].Float())

	if skel, ok := skeletons[id]; ok {
		skel.Update(dt)
	}
	return nil
}

func getSkeletonRenderData(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	destArray := args[1] // Expecting a Float32Array

	if skel, ok := skeletons[id]; ok {
		data := skel.GetRenderData()

		// Fill JS array
		for i, v := range data {
			destArray.SetIndex(i, float64(v))
		}
		return len(data)
	}
	return 0
}

func setBoneTransform(this js.Value, args []js.Value) interface{} {
	skelID := args[0].Int()
	boneName := args[1].String()

	skel, ok := skeletons[skelID]
	if !ok {
		return false
	}
	bone, ok := skel.Bones[boneName]
	if !ok {
		return false
	}

	bone.LocalX = float32(args[2].Float())
	bone.LocalY = float32(args[3].Float())
	bone.Rotation = float32(args[4].Float())
	bone.ScaleX = float32(args[5].Float())
	bone.ScaleY = float32(args[6].Float())

	// Force update world transforms immediately for editor responsiveness
	skel.Update(0)

	return true
}

// --- Animation Bindings ---

func createAnimation(this js.Value, args []js.Value) interface{} {
	name := args[0].String()
	duration := float32(args[1].Float())

	id := nextAnimID
	nextAnimID++

	anim := &Animation{
		Name:      name,
		Duration:  duration,
		Keyframes: []Keyframe{},
	}
	animations[id] = anim

	return id
}

// addKeyframe(animID, time, boneName, x, y, rot, sx, sy)
func addKeyframe(this js.Value, args []js.Value) interface{} {
	animID := args[0].Int()
	anim, ok := animations[animID]
	if !ok {
		return false
	}

	kf := Keyframe{
		Time:     float32(args[1].Float()),
		BoneName: args[2].String(),
		X:        float32(args[3].Float()),
		Y:        float32(args[4].Float()),
		Rotation: float32(args[5].Float()),
		ScaleX:   float32(args[6].Float()),
		ScaleY:   float32(args[7].Float()),
	}

	// Insert sorted or append? For now append, frontend should be careful or we sort.
	// Let's just append.
	anim.Keyframes = append(anim.Keyframes, kf)
	return true
}

func applyAnimation(this js.Value, args []js.Value) interface{} {
	skelID := args[0].Int()
	animID := args[1].Int()
	time := float32(args[2].Float())
	loop := args[3].Bool()

	skel, okS := skeletons[skelID]
	anim, okA := animations[animID]

	if okS && okA {
		anim.ApplyAt(skel, time, loop)
		skel.Update(0) // Recalculate world transforms
		return true
	}
	return false
}

func getAnimationJSON(this js.Value, args []js.Value) interface{} {
	animID := args[0].Int()
	anim, ok := animations[animID]
	if !ok {
		return ""
	}

	bytes, err := json.MarshalIndent(anim, "", "  ")
	if err != nil {
		return ""
	}
	return string(bytes)
}

// --- Grid Bindings ---

func initGridWrapper(this js.Value, args []js.Value) interface{} {
	rows := args[0].Int()
	cols := args[1].Int()
	cellSize := args[2].Float()
	startX := args[3].Float()
	startY := args[4].Float()
	InitGrid(rows, cols, cellSize, startX, startY)
	return nil
}

func checkGridHover(this js.Value, args []js.Value) interface{} {
	x := args[0].Float()
	y := args[1].Float()
	CheckHover(x, y)
	return nil
}

// --- Event System ---

func emitEvent(typ string, id int, payload interface{}) {
	// Simple map or struct
	evt := map[string]interface{}{
		"type":    typ,
		"id":      id,
		"payload": payload,
	}
	eventBuffer = append(eventBuffer, evt)
}

func pollEvents(this js.Value, args []js.Value) interface{} {
	if len(eventBuffer) == 0 {
		return js.Global().Get("Array").New(0)
	}

	// Marshaling []interface{} to JS is tricky with syscall/js directly if complex.
	// But `js.ValueOf` handles []interface{} recursiely often? 
	// Actually `js.ValueOf` doesn't handle slices automatically in all versions.
	// Let's return JSON string for reliability or build JS array manually.
	// Building manually is safer.
	
	res := js.Global().Get("Array").New(len(eventBuffer))
	for i, evt := range eventBuffer {
		// evt is map
		m := evt.(map[string]interface{})
		jsEvt := js.Global().Get("Object").New()
		jsEvt.Set("type", m["type"])
		jsEvt.Set("id", m["id"])
		jsEvt.Set("payload", m["payload"])
		res.SetIndex(i, jsEvt)
	}
	
	eventBuffer = eventBuffer[:0] // Clear
	return res
}

// --- Entity Bindings ---

func createZombie(this js.Value, args []js.Value) interface{} {
	// args: type, x, y
	typ := args[0].String()
	x := float32(args[1].Float())
	y := float32(args[2].Float())

	id := nextEntityID
	nextEntityID++

	z := NewZombie(id, typ, x, y)
	zombies[id] = z
	
	// Register Skeleton in global map so JS can find it for bone updates during init
	// Assumes NewZombie created a skeleton
	if z.Skeleton != nil {
	    // We need a stable ID for the skeleton. 
	    // The generic map for skeletons is `skeletons`. 
	    // We should use a unique ID.
	    // Let's say we reserve IDs or use same ID?
	    // `z.Skeleton` doesn't have an ID internally in struct, but main.go maps ID->Skeleton.
	    // Let's generate a new Skeleton ID.
	    skelID := nextSkelID
	    nextSkelID++
	    skeletons[skelID] = z.Skeleton
	    
	    // We return [zombieID, skeletonID] or just zombieID and have a getter?
	    // Let's return zombieID. JS calls `getZombieSkeletonID` later.
	    // We need to store this mapping. 
	    // Or simpler: Zombie ID = Skeleton ID? No, conflict with standalone skeletons.
	    // Let's store mapping in a separate map or on Zombie logic (but Main needs it).
	}

	return id
}

func getZombieSkeletonID(this js.Value, args []js.Value) interface{} {
	zID := args[0].Int()
	z, ok := zombies[zID]
	if !ok || z.Skeleton == nil { return -1 }
	
	// Find ID? This is inefficient.
	// We should have stored it.
	// Let's modify creation to store it.
	for k, v := range skeletons {
		if v == z.Skeleton {
			return k
		}
	}
	// Fallback: register if not found (should be done in Create)
	return -1
}

func updateZombie(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	dt := float32(args[1].Float())

	if z, ok := zombies[id]; ok {
		z.Update(dt)
		return true // maybe return simple state? (x, y)
	}
	return false
}

// --- Plant Bindings ---

func createPlant(this js.Value, args []js.Value) interface{} {
	typ := args[0].String()
	x := float32(args[1].Float())
	y := float32(args[2].Float())

	id := nextEntityID
	nextEntityID++

	p := NewPlant(id, typ, x, y)
	plants[id] = p
	return id
}

func updatePlant(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	dt := float32(args[1].Float())
	if p, ok := plants[id]; ok {
		p.Update(dt)
	}
	return nil
}

// --- Dave Bindings ---

func createDave(this js.Value, args []js.Value) interface{} {
	x := float32(args[0].Float())
	y := float32(args[1].Float())
	
	id := nextEntityID
	nextEntityID++
	
	d := NewDave(id, x, y)
	daves[id] = d
	
	// Register Skeleton
	skelID := nextSkelID
	nextSkelID++
	skeletons[skelID] = d.Skeleton
	
	// Return {id, skelID} object? 
	res := js.Global().Get("Object").New()
	res.Set("id", id)
	res.Set("skelId", skelID)
	return res
}

func updateDave(this js.Value, args []js.Value) interface{} {
	id := args[0].Int()
	dt := float32(args[1].Float())
	if d, ok := daves[id]; ok {
		d.Update(dt)
	}
	return nil
}
