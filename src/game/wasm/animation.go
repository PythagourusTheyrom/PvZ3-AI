package main

import (
	"math"
)

// Simplified "Matrix" logic using local components + world transform propagation
type Bone struct {
	Name     string  `json:"name"`
	ImageID  int     `json:"imageId"` // mapped integer for image name
	LocalX   float32 `json:"localX"`
	LocalY   float32 `json:"localY"`
	PivotX   float32 `json:"pivotX"`
	PivotY   float32 `json:"pivotY"`
	Rotation float32 `json:"rotation"`
	ScaleX   float32 `json:"scaleX"`
	ScaleY   float32 `json:"scaleY"`

	// Computed World State (not serialized usually, but useful for debug)
	WorldX      float32 `json:"-"`
	WorldY      float32 `json:"-"`
	WorldRot    float32 `json:"-"`
	WorldScaleX float32 `json:"-"`
	WorldScaleY float32 `json:"-"`

	Children []*Bone `json:"children"`
	Parent   *Bone   `json:"-"` // prevent cycle in JSON
}

type Skeleton struct {
	Root  *Bone            `json:"root"`
	X, Y  float32          `json:"-"`
	Bones map[string]*Bone `json:"-"`
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

	// Append Children
	for _, child := range b.Children {
		data = s.appendBoneData(child, data)
	}
	return data
}

// --- Animation System ---

type Keyframe struct {
	Time float32 `json:"time"`

	// Properties to tween (optional, can be flags or just values)
	// For simplicity, we store all, but logic could be better.
	// Or we use a property name based system.
	// Let's use explicit fields for simplicity in Go.
	BoneName string  `json:"boneName"`
	X        float32 `json:"x"`
	Y        float32 `json:"y"`
	Rotation float32 `json:"rotation"`
	ScaleX   float32 `json:"scaleX"`
	ScaleY   float32 `json:"scaleY"`
}

type Animation struct {
	Name      string     `json:"name"`
	Duration  float32    `json:"duration"` // in seconds
	Keyframes []Keyframe `json:"keyframes"`
}

// ApplyAt applies the animation to the skeleton at a specific time
func (a *Animation) ApplyAt(s *Skeleton, time float32, loop bool) {
	if loop && a.Duration > 0 {
		time = float32(math.Mod(float64(time), float64(a.Duration)))
	}

	// Very basic interpolation:
	// Find keyframes before and after 'time' for each bone.
	// For MVP, let's just find the last keyframe <= time for each bone (Step interpolation)
	// or nice linear interpolation.

	// Group keyframes by bone
	boneKFs := make(map[string][]Keyframe)
	for _, kf := range a.Keyframes {
		boneKFs[kf.BoneName] = append(boneKFs[kf.BoneName], kf)
	}

	for boneName, kfs := range boneKFs {
		bone, ok := s.Bones[boneName]
		if !ok {
			// Try finding bone recursively if map isn't populated (it should be)
			continue
		}

		// Sort kfs by time? Assuming they are sorted or we scan.
		// Let's scan for prev/next
		var prev, next Keyframe
		foundPrev := false
		foundNext := false

		// Initialize with safe defaults or current values?
		// Usually animation overrides local transform.

		for _, kf := range kfs {
			if kf.Time <= time {
				if !foundPrev || kf.Time > prev.Time {
					prev = kf
					foundPrev = true
				}
			}
			if kf.Time > time {
				if !foundNext || kf.Time < next.Time {
					next = kf
					foundNext = true
				}
			}
		}

		if foundPrev && !foundNext {
			// Hold last frame
			applyKeyframe(bone, prev)
		} else if !foundPrev && foundNext {
			// Hold first frame
			applyKeyframe(bone, next)
		} else if foundPrev && foundNext {
			// Interpolate
			t := (time - prev.Time) / (next.Time - prev.Time)
			lerpKeyframe(bone, prev, next, t)
		}
	}
}

func applyKeyframe(b *Bone, kf Keyframe) {
	b.LocalX = kf.X
	b.LocalY = kf.Y
	b.Rotation = kf.Rotation
	b.ScaleX = kf.ScaleX
	b.ScaleY = kf.ScaleY
}

func lerpKeyframe(b *Bone, k1, k2 Keyframe, t float32) {
	b.LocalX = k1.X + (k2.X-k1.X)*t
	b.LocalY = k1.Y + (k2.Y-k1.Y)*t
	b.Rotation = k1.Rotation + (k2.Rotation-k1.Rotation)*t
	b.ScaleX = k1.ScaleX + (k2.ScaleX-k1.ScaleX)*t
	b.ScaleY = k1.ScaleY + (k2.ScaleY-k1.ScaleY)*t
}
