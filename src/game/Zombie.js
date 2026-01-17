import { Entity } from './Entity.js';
import { Skeleton, Bone } from './graphics/Skeleton.js';
import { AssetLoader } from './graphics/AssetLoader.js';

export class Zombie extends Entity {
    constructor(game, y, type = 'basic') {
        super(game, 1024, y);
        this.type = type;

        // Stats based on type or data
        let speed = 0.02;
        let health = 100;
        let damage = 0.5;

        if (game.gameData && game.gameData.zombies[type]) {
            const stats = game.gameData.zombies[type];
            speed = stats.speed;
            health = stats.health;
            damage = stats.damage;
        } else {
            // Fallback
            this.stats = {
                basic: { health: 100, speed: 0.02 },
                conehead: { health: 250, speed: 0.02 },
                buckethead: { health: 500, speed: 0.02 }
            };
            const stat = this.stats[type] || this.stats.basic;
            health = stat.health;
            speed = stat.speed;
        }

        this.health = health;
        this.speed = speed;
        this.damage = damage;

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

        const globalScale = 0.1;

        // Torso
        this.torso = new Bone('torso', bodyImg, 0, 0, 343, 458);
        this.torso.scaleX = globalScale;
        this.torso.scaleY = globalScale;
        this.skeleton.setRoot(this.torso);

        // Head
        this.head = new Bone('head', headImg, 0, -400, 386, 750);
        this.torso.addChild(this.head);

        // Hat (Attachment)
        if (this.type === 'conehead') {
            const coneImg = AssetLoader.getImage('cone');
            this.hat = new Bone('hat', coneImg, 0, -150, 256, 350); // Adjust pivot/pos
            this.hat.scaleX = 0.8;
            this.hat.scaleY = 0.8;
            this.head.addChild(this.hat);
        } else if (this.type === 'buckethead') {
            const bucketImg = AssetLoader.getImage('bucket');
            this.hat = new Bone('hat', bucketImg, 0, -120, 256, 300); // Adjust pivot/pos
            this.hat.scaleX = 0.9;
            this.hat.scaleY = 0.9;
            this.head.addChild(this.hat);
        }

        // Arms
        this.lArm = new Bone('lArm', armImg, -150, -350, 200, 100);
        this.rArm = new Bone('rArm', armImg, 150, -350, 200, 100);

        this.torso.addChild(this.lArm);
        this.torso.addChild(this.rArm);

        // Legs
        this.lLeg = new Bone('lLeg', legImg, -100, 350, 400, 50);
        this.rLeg = new Bone('rLeg', legImg, 100, 350, 400, 50);
        this.torso.addChild(this.lLeg);
        this.torso.addChild(this.rLeg);
    }

    update(deltaTime) {
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            this.currentSpeed = this.speed * 0.5;
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
        // Fix Alignment:
        // Grid cell height is 100.
        // Zombie should stand on bottom.
        // Skeleton root (torso) is at +45px (roughly) from feet due to scale.
        // this.y is Top of logical box.
        // We want Feet at this.y + 100.
        // Torso is ~45px up from feet.
        // So torso Y ~ this.y + 100 - 45 = this.y + 55.
        // Let's tweak to look good.
        this.skeleton.y = this.y + 70;

        // Draw shadow (optional)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.skeleton.x, this.y + 90, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        this.skeleton.draw(ctx);

        if (this.slowTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(100, 149, 237, 0.4)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
