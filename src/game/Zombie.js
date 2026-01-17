import { Entity } from './Entity.js';
import { Skeleton, Bone } from './graphics/Skeleton.js';
import { AssetLoader } from './graphics/AssetLoader.js';
import { WasmLoader } from './graphics/WasmLoader.js';

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
                buckethead: { health: 500, speed: 0.02 },
                football: { health: 800, speed: 0.05 },
                boss: { health: 3000, speed: 0.01 }
            };
            const stat = this.stats[type] || this.stats.basic;
            health = stat.health;
            speed = stat.speed;
        }

        this.health = health;
        this.maxHealth = health;
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
        // Check availability of Wasm
        const useWasm = WasmLoader.instance && WasmLoader.instance.isReady && window.createZombie;

        if (useWasm) {
            this.id = window.createZombie(this.type, this.x, this.y);
            const skelID = window.getZombieSkeletonID(this.id);

            this.skeleton = new WasmSkeleton(0, 0);
            this.skeleton.id = skelID;

            // Go `NewZombie` already constructed the skeleton.
            // So we DO NOT need to add bones from JS side.
            // We are done.
            return;
        } else {
            this.skeleton = new Skeleton(0, 0);
        }

        const headImg = AssetLoader.getImage('zombie_head');
        const bodyImg = AssetLoader.getImage('zombie_body');
        const armImg = AssetLoader.getImage('zombie_arm');
        const legImg = AssetLoader.getImage('zombie_leg');

        let globalScale = 0.1;
        if (this.type === 'boss') globalScale = 0.2;

        // --- Build JS Skeleton (Source of Truth for structure - Fallback) ---

        // Torso
        this.torso = new Bone('torso', bodyImg, 0, 0, 343, 458);
        this.torso.scaleX = globalScale;
        this.torso.scaleY = globalScale;
        // Don't set Root yet on skeletal object until full tree is ready? 
        // Old code set it immediately.

        // Head
        this.head = new Bone('head', headImg, 0, -400, 386, 750);
        this.torso.addChild(this.head);

        // Hat (Attachment)
        if (this.type === 'conehead') {
            const coneImg = AssetLoader.getImage('cone');
            this.hat = new Bone('hat', coneImg, 0, -150, 256, 350);
            this.hat.scaleX = 0.8;
            this.hat.scaleY = 0.8;
            this.head.addChild(this.hat);
        } else if (this.type === 'buckethead') {
            const bucketImg = AssetLoader.getImage('bucket');
            this.hat = new Bone('hat', bucketImg, 0, -120, 256, 300);
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

        // Set Root
        this.skeleton.setRoot(this.torso);
    }

    update(deltaTime) {
        // Wasm Update
        if (this.id !== undefined && window.updateZombie) {
            const newX = window.updateZombie(this.id, deltaTime);
            if (newX !== -9999.0) {
                this.x = newX;
            }
            // Logic in Go handles animation state.
            // We process slow timer in JS? 
            // Go Zombie has speed. If we apply slow, we need to tell Go.
            // For now, keep slow logic in JS and valid X update.
            // Go calculates X based on its internal speed. 
            // If JS modifies speed (slow), Go needs to know.
            // Skipping slow sync for MVP or just letting JS override X?
            // Go returns new X based on its internal state.
            // If we want slow, we'd need `setZombieSpeed` binding.
            return;
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            this.currentSpeed = this.speed * 0.5;
        } else {
            this.currentSpeed = this.speed;
        }

        // ... Existing JS Update Logic ...
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
        if (this.id !== undefined) return; // Handled by Wasm

        this.animTime += dt * this.walkSpeed;

        // Calc new values
        const headRot = Math.sin(this.animTime) * 0.1;
        const lArmRot = Math.sin(this.animTime) * 0.5;
        const rArmRot = Math.sin(this.animTime + Math.PI) * 0.5;
        const lLegRot = Math.sin(this.animTime) * 0.6;
        const rLegRot = Math.sin(this.animTime + Math.PI) * 0.6;

        this.head.rotation = headRot;
        this.lArm.rotation = lArmRot;
        this.rArm.rotation = rArmRot;
        this.lLeg.rotation = lLegRot;
        this.rLeg.rotation = rLegRot;
    }

    animateEat(dt) {
        if (this.id !== undefined) return; // Handled by Wasm

        this.animTime += dt * 0.01;
        const headRot = Math.abs(Math.sin(this.animTime * 10)) * 0.2;
        const lArmRot = 1.0 + Math.sin(this.animTime * 10) * 0.1;

        this.head.rotation = headRot;
        this.lArm.rotation = lArmRot;
    }

    syncBoneToWasm(bone) {
        this.skeleton.setBoneTransform(
            bone.name,
            bone.x, bone.y, bone.rotation, bone.scaleX, bone.scaleY
        );
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

        // Football Visual Overlay
        if (this.type === 'football') {
            ctx.save();
            ctx.translate(this.skeleton.x, this.skeleton.y - 120); // Headish area
            ctx.fillStyle = '#b91c1c'; // Red helmet color
            ctx.beginPath();
            ctx.arc(0, -20, 30, 0, Math.PI, true);
            ctx.lineTo(30, 20);
            ctx.lineTo(-30, 20);
            ctx.fill();
            ctx.restore();
        }

        // Boss Visual Overlay
        if (this.type === 'boss') {
            ctx.save();
            // Draw a crown or something? Or just big red aura
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 5;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }

        if (this.slowTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(100, 149, 237, 0.4)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
