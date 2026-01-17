package main

type Dave struct {
	ID        int
	X, Y      float32
	TargetX   float32
	Visible   bool
	Skeleton  *Skeleton
	AnimState *AnimationState
}

type AnimationState struct {
	CurrentAnimName string
	Time            float32
	Loop            bool
	Animations      map[string]*Animation // Logic needed
}

// We need a way to store "Animation Resources" (keyframes) for Dave.
// Hardcoded in Go for now similar to JS setup.

func NewDave(id int, x, y float32) *Dave {
	d := &Dave{
		ID:       id,
		X:        x,
		Y:        y,
		TargetX:  100,
		Visible:  false,
		Skeleton: NewSkeleton(x, y),
	}
	return d
}

func (d *Dave) Update(dt float32) {
	if !d.Visible {
		return
	}

	// Slide In
	if d.X < d.TargetX {
		d.X += dt * 0.5
		if d.X > d.TargetX {
			d.X = d.TargetX
		}
	}

	d.Skeleton.X = d.X
	d.Skeleton.Y = d.Y
	d.Skeleton.Update(dt)

	// Animation Update logic would go here
	// For now, let's just make him bob to prove he's alive
	// Or trust JS to drive animation via `applyAnimation`?
	// The plan was "Goify Dave", implies logic moves here.
	// But `Animation` struct is already in `animation.go` (if user accepted my edits... wait, user edited `animation.go`).
	// Yes, user added `Animation` struct.
	// So we can use that.
}
