import { Entity } from './Entity.js';
import { Skeleton, Bone } from './graphics/Skeleton.js';
import { AssetLoader } from './graphics/AssetLoader.js';

export class Zombie extends Entity {
    constructor(game, y, type = 'basic') {
        super(game, 1024, y);
        this.type = type;
        this.health = 100;
        this.speed = 0.02;
        this.damage = 0.5;

        this.isEating = false;
        this.targetPlant = null;

        this.animTime = 0;
        this.walkSpeed = 0.005;

        this.slowTimer = 0;
        this.currentSpeed = this.speed;

        this.initSkeleton();
    }

    applySlow(duration) {
        this.slowTimer = duration;
    }

    initSkeleton() {
        this.skeleton = new Skeleton(0, 0);

        const headImg = AssetLoader.getImage('zombie_head');
        const bodyImg = AssetLoader.getImage('zombie_body');
        const armImg = AssetLoader.getImage('zombie_arm');
        const legImg = AssetLoader.getImage('zombie_leg');

        const globalScale = 0.1; // Reduced from 0.15

        // Torso: 687x917. Center 343, 458.
        // Pivot roughly center.
        this.torso = new Bone('torso', bodyImg, 0, 0, 343, 458);
        this.torso.scaleX = globalScale;
        this.torso.scaleY = globalScale;
        this.skeleton.setRoot(this.torso);

        // Head: 772x778. 
        // Pivot near bottom (neck connection): 386, 750.
        // Position relative to torso center: Up (-400).
        this.head = new Bone('head', headImg, 0, -400, 386, 750);
        this.torso.addChild(this.head);

        // Arms: 922x642. 
        // Pivot near top left (shoulder): 200, 100?
        // Or Top Center: 461, 50.
        // Let's try 200, 100.
        // Position: Shoulder height (-350 from torso center).
        this.lArm = new Bone('lArm', armImg, -150, -350, 200, 100);
        this.rArm = new Bone('rArm', armImg, 150, -350, 200, 100);

        this.torso.addChild(this.lArm);
        this.torso.addChild(this.rArm);

        // Legs: 801x712.
        // Pivot Top Center (Hip): 400, 50.
        // Position: Bottom of torso (400).
        this.lLeg = new Bone('lLeg', legImg, -100, 350, 400, 50);
        this.rLeg = new Bone('rLeg', legImg, 100, 350, 400, 50);
        this.torso.addChild(this.lLeg);
        this.torso.addChild(this.rLeg);
    }

    update(deltaTime) {
        // Apply Slow Effect
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            this.currentSpeed = this.speed * 0.5; // Half speed
        } else {
            this.currentSpeed = this.speed;
        }

        if (this.isEating) {
            if (this.targetPlant && !this.targetPlant.markedForDeletion) {
                this.targetPlant.health -= this.damage;
                if (this.targetPlant.health <= 0) {
                    this.targetPlant.markedForDeletion = true;
                    this.isEating = false;
                    this.targetPlant = null;
                }
            } else {
                this.isEating = false;
                this.targetPlant = null;
            }
            this.animateEat(deltaTime);
        } else {
            this.x -= this.currentSpeed * deltaTime;
            this.animateWalk(deltaTime);
        }

        if (this.x < -50) {
            this.game.gameOver();
        }
    }

    animateWalk(dt) {
        this.animTime += dt * this.walkSpeed;

        this.head.rotation = Math.sin(this.animTime) * 0.1;
        this.lArm.rotation = Math.sin(this.animTime) * 0.5;
        this.rArm.rotation = Math.sin(this.animTime + Math.PI) * 0.5;
        this.lLeg.rotation = Math.sin(this.animTime) * 0.6;
        this.rLeg.rotation = Math.sin(this.animTime + Math.PI) * 0.6;
    }

    animateEat(dt) {
        this.animTime += dt * 0.01;
        this.head.rotation = Math.abs(Math.sin(this.animTime * 10)) * 0.2;
        this.lArm.rotation = 1.0 + Math.sin(this.animTime * 10) * 0.1;
    }

    draw(ctx) {
        this.skeleton.x = this.x + this.width / 2;
        // Anchor at feet. Torso Center -> Feet is +450 local * 0.1 = +45px.
        // this.y + height is bottom of 100x100 box.
        // Center of box is this.y + 50.
        // Let's force align to bottom of cell.
        this.skeleton.y = this.y + this.height - 10;

        // Optional: Tint blue if slow
        // Not easily doable with simple canvas drawImage without caching offscreen but we can just draw a blue overlay
        this.skeleton.draw(ctx);

        if (this.slowTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(100, 149, 237, 0.4)'; // CornflowerBlue
            // Draw a rect over the zombie
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
