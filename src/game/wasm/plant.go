package main

type Plant struct {
	ID            int
	Type          string
	X, Y          float32
	Timer         float32
	ShootInterval float32

	// State for logic
	ShotsFired int
	BurstTimer float32
	IsArmed    bool // Potato Mine
}

func NewPlant(id int, typeStr string, x, y float32) *Plant {
	p := &Plant{
		ID:            id,
		Type:          typeStr,
		X:             x,
		Y:             y,
		ShootInterval: 1500,
	}

	switch typeStr {
	case "peashooter", "snowpea":
		p.ShootInterval = 1500
	case "repeater":
		p.ShootInterval = 1500
	case "threepeater":
		p.ShootInterval = 1500
	case "sunflower":
		p.ShootInterval = 5000 // Sun production
	case "cherrybomb":
		p.ShootInterval = 2000 // Fuse
	case "potatomine":
		p.ShootInterval = 14000 // Arming time
	}

	return p
}

func (p *Plant) Update(dt float32) {
	p.Timer += dt

	if p.Type == "peashooter" || p.Type == "snowpea" || p.Type == "threepeater" {
		if p.Timer > p.ShootInterval {
			p.Timer = 0
			// Shoot Event!
			emitEvent("shoot", p.ID, p.Type)
		}
	} else if p.Type == "repeater" {
		if p.Timer > p.ShootInterval {
			p.Timer = 0
			emitEvent("shoot", p.ID, p.Type)
			p.ShotsFired = 1
			p.BurstTimer = 200
		}
		if p.ShotsFired == 1 {
			p.BurstTimer -= dt
			if p.BurstTimer <= 0 {
				emitEvent("shoot", p.ID, p.Type)
				p.ShotsFired = 0
			}
		}
	} else if p.Type == "sunflower" {
		if p.Timer > p.ShootInterval {
			p.Timer = 0
			emitEvent("spawn_sun", p.ID, "")
		}
	} else if p.Type == "potatomine" {
		if !p.IsArmed && p.Timer > p.ShootInterval {
			p.IsArmed = true
			p.Timer = 0 // Reset or stay high?
		}
	}
}
