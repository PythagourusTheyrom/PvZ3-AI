package main

import (
	"math"
)

// Simplified "Matrix" logic using local components + world transform propagation
type Bone struct {
	Name     string
	ImageID  int // mapped integer for image name
	LocalX   float32
	LocalY   float32
	PivotX   float32
	PivotY   float32
	Rotation float32
	ScaleX   float32
	ScaleY   float32

	// Computed World State
	WorldX      float32
	WorldY      float32
	WorldRot    float32
	WorldScaleX float32
	WorldScaleY float32

	Children []*Bone
	Parent   *Bone
}

type Skeleton struct {
	Root  *Bone
	X, Y  float32
	Bones map[string]*Bone
}

func NewSkeleton(x, y float32) *Skeleton {
	return &Skeleton{
		X:     x,
		Y:     y,
		Bones: make(map[string]*Bone),
	}
}

// Update calculates world transforms
func (s *Skeleton) Update(dt float32) {
	// 1. Reset Root's world state to Skeleton's world state
	if s.Root != nil {
		s.applyTransform(s.Root, s.X, s.Y, 0, 1, 1)
	}
}

// Recursive transform application
func (s *Skeleton) applyTransform(b *Bone, pX, pY, pRot, pScaleX, pScaleY float32) {
	// Local Transform
	// Rotation
	cos := float32(math.Cos(float64(pRot)))
	sin := float32(math.Sin(float64(pRot)))

	// Apply parent rotation to local offset
	rx := b.LocalX*cos - b.LocalY*sin
	ry := b.LocalX*sin + b.LocalY*cos

	// Apply parent scale
	rx *= pScaleX
	ry *= pScaleY

	// Final World Position
	b.WorldX = pX + rx
	b.WorldY = pY + ry
	b.WorldRot = pRot + b.Rotation
	b.WorldScaleX = pScaleX * b.ScaleX
	b.WorldScaleY = pScaleY * b.ScaleY

	// Recurse
	for _, child := range b.Children {
		s.applyTransform(child, b.WorldX, b.WorldY, b.WorldRot, b.WorldScaleX, b.WorldScaleY)
	}
}

// Flatten for rendering
// returns [x, y, rot, sX, sY, imgID, pX, pY] per bone
func (s *Skeleton) GetRenderData() []float32 {
	data := make([]float32, 0, len(s.Bones)*8)
	if s.Root != nil {
		data = s.appendBoneData(s.Root, data)
	}
	return data
}

func (s *Skeleton) appendBoneData(b *Bone, data []float32) []float32 {
	// Append This Bone
	data = append(data,
		b.WorldX, b.WorldY, b.WorldRot, b.WorldScaleX, b.WorldScaleY,
		float32(b.ImageID), b.PivotX, b.PivotY,
	)

	// Append Children (Painter's algorithm: parent first? usually children are on top, or depends on z-order)
	// For now, parent first, then children.
	// Actually, usually you traverse depth first.
	for _, child := range b.Children {
		data = s.appendBoneData(child, data)
	}
	return data
}
