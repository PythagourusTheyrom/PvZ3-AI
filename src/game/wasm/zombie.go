package main

import "math"

type Zombie struct {
	ID       int
	Type     string
	X, Y     float32
	Health   float32
	Speed    float32
	Damage   float32
	IsEating bool

	AnimTime  float32
	WalkSpeed float32

	Skeleton *Skeleton

	// Stats
	MaxHealth float32
}

func NewZombie(id int, typeStr string, x, y float32) *Zombie {
	z := &Zombie{
		ID:        id,
		Type:      typeStr,
		X:         x,
		Y:         y,
		IsEating:  false,
		WalkSpeed: 0.005,
	}

	// Stats
	switch typeStr {
	case "conehead":
		z.Health = 250
		z.Speed = 0.02
	case "buckethead":
		z.Health = 500
		z.Speed = 0.02
	case "football":
		z.Health = 800
		z.Speed = 0.05
	default: // basic
		z.Health = 100
		z.Speed = 0.02
	}
	z.MaxHealth = z.Health

	// Initialize Skeleton
	z.Skeleton = NewSkeleton(x, y)
	// Note: Bones are added via JS sync currently in WasmSkeleton.
	// To fully Goify, we should construct the skeleton here.
	// But `Zombie.js` already does `initSkeleton()` which calls `addBone` on Wasm.
	// So we can assume `z.Skeleton` is populated via those JS calls after creation.
	// However, we need to map the skeleton ID to this zombie or let JS handle it.
	// JS calls `createSkeleton`.
	// Ideally, `createZombie` creates the skeleton internally and returns zombie ID.
	// JS then asks for "zombie skeleton ID" to add bones?
	// Or JS just calls `addBone(zombieID, ...)` if we map IDs.
	// Let's use `skeletons` map to store the zombie's skeleton too for compatibility.

	return z
}

func (z *Zombie) Update(dt float32) {
	if z.IsEating {
		z.animateEat(dt)
	} else {
		z.X -= z.Speed * dt
		z.animateWalk(dt)
	}

	// Update Skeleton Position
	if z.Skeleton != nil {
		z.Skeleton.X = z.X + 50 // Offset for centering roughly
		z.Skeleton.Y = z.Y + 70 // Offset from JS
		z.Skeleton.Update(dt)
	}
}

// Procedural Animations ported from JS
func (z *Zombie) animateWalk(dt float32) {
	z.AnimTime += dt * z.WalkSpeed
	t := z.AnimTime

	z.setRot("head", float32(math.Sin(float64(t))*0.1))
	z.setRot("lArm", float32(math.Sin(float64(t))*0.5))
	z.setRot("rArm", float32(math.Sin(float64(t)+math.Pi)*0.5))
	z.setRot("lLeg", float32(math.Sin(float64(t))*0.6))
	z.setRot("rLeg", float32(math.Sin(float64(t)+math.Pi)*0.6))
}

func (z *Zombie) animateEat(dt float32) {
	z.AnimTime += dt * 0.01
	t := z.AnimTime * 10

	z.setRot("head", float32(math.Abs(math.Sin(float64(t)))*0.2))
	z.setRot("lArm", 1.0+float32(math.Sin(float64(t))*0.1))
}

func (z *Zombie) setRot(boneName string, rot float32) {
	if z.Skeleton == nil {
		return
	}
	if b, ok := z.Skeleton.Bones[boneName]; ok {
		b.Rotation = rot
	}
}
