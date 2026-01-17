import { Skeleton, Bone } from './graphics/Skeleton.js';
import { AnimationController } from './graphics/AnimationController.js';
import { AssetLoader } from './graphics/AssetLoader.js';
import { WasmLoader } from './graphics/WasmLoader.js'; // Added import

export class CrazyDave {
    constructor(game) {
        this.game = game;
        this.x = -200; // Start off-screen
        this.y = 100;
        this.targetX = 100;
        this.visible = false;

        this.speechText = "";
        this.showSpeech = false;
        this.speechTimer = 0;

        this.initSkeleton();

        // Setup Animation Controller
        this.animController = new AnimationController(this.skeleton);
        this.setupAnimations();
        this.animController.play('idle');
    }

    initSkeleton() {
        const useWasm = WasmLoader.instance && WasmLoader.instance.isReady && window.createDave;
        if (useWasm) {
            const res = window.createDave(this.x, this.y);
            // createDave returns {id, skelId}
            this.id = res.id;
            this.skeleton = new WasmSkeleton(0, 0);
            this.skeleton.id = res.skelId;
            return;
        }

        this.skeleton = new Skeleton(this.x, this.y);

        const bodyImg = AssetLoader.getImage('crazy_dave_body');
        const headImg = AssetLoader.getImage('crazy_dave_head');
        const armImg = AssetLoader.getImage('crazy_dave_arm');

        // Scale
        const s = 0.3;

        // Body
        this.body = new Bone('body', bodyImg, 0, 0, 0, 0); // Pivot top-left for simplicity or adjust
        // Let's assume images are roughly centered?
        // Body: 500x500 approx from generation.
        this.body.pivotX = 250;
        this.body.pivotY = 250;
        this.body.scaleX = s;
        this.body.scaleY = s;
        this.skeleton.setRoot(this.body);

        // Head
        this.head = new Bone('head', headImg, 0, -100, 250, 400); // Pivot bottom
        this.body.addChild(this.head);

        // Arm
        this.arm = new Bone('arm', armImg, -80, -50, 250, 50); // Pivot top (shoulder)
        this.body.addChild(this.arm);
    }

    setupAnimations() {
        // Idle
        this.animController.add('idle', 2000, {
            head: {
                rotation: [
                    { time: 0, value: 0 },
                    { time: 1000, value: 0.1 },
                    { time: 2000, value: 0 }
                ]
            },
            arm: {
                rotation: [
                    { time: 0, value: 0 },
                    { time: 1000, value: -0.2 },
                    { time: 2000, value: 0 }
                ]
            }
        });

        // Talk
        this.animController.add('talk', 500, {
            head: {
                rotation: [
                    { time: 0, value: 0 },
                    { time: 100, value: -0.1 },
                    { time: 200, value: 0.1 },
                    { time: 300, value: -0.1 },
                    { time: 400, value: 0.1 },
                    { time: 500, value: 0 }
                ],
                scaleY: [
                    { time: 0, value: 1 },
                    { time: 250, value: 1.05 },
                    { time: 500, value: 1 }
                ]
            }
        });
    }

    appear() {
        this.visible = true;
        this.x = -200;
        // Slide in
    }

    speak(text) {
        this.speechText = text;
        this.showSpeech = true;
        this.speechTimer = 3000;
        this.animController.play('talk');
    }

    update(dt) {
        if (!this.visible) return;

        if (this.id !== undefined && window.updateDave) {
            window.updateDave(this.id, dt);
        }

        // Slide in logic (Keep for X sync)
        if (this.x < this.targetX) {
            this.x += dt * 0.5;
            if (this.x > this.targetX) this.x = this.targetX;
        }

        this.skeleton.x = this.x;
        this.skeleton.y = this.y;

        this.animController.update(dt);

        if (this.showSpeech) {
            this.speechTimer -= dt;
            if (this.speechTimer <= 0) {
                this.showSpeech = false;
                this.animController.play('idle');
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        this.skeleton.draw(ctx);

        if (this.showSpeech) {
            this.drawSpeechBubble(ctx);
        }
    }

    drawSpeechBubble(ctx) {
        const x = this.x + 100;
        const y = this.y - 150;
        const w = 200;
        const h = 100;

        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 20);
        ctx.fill();
        ctx.stroke();

        // Tail
        ctx.beginPath();
        ctx.moveTo(x, y + h - 20);
        ctx.lineTo(x - 20, y + h + 10);
        ctx.lineTo(x + 20, y + h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.speechText, x + w / 2, y + h / 2);

        ctx.restore();
    }
}
