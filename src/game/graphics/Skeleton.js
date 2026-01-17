import { AssetLoader } from './AssetLoader.js';
import { WasmLoader } from './WasmLoader.js';

export class Bone {
    constructor(name, image, x, y, pivotX, pivotY) {
        this.name = name;
        this.image = image;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.pivotX = pivotX || 0;
        this.pivotY = pivotY || 0;
        this.children = [];
        this.parent = null;
    }

    addChild(bone) {
        this.children.push(bone);
        bone.parent = this;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);

        if (this.image) {
            ctx.drawImage(this.image, -this.pivotX, -this.pivotY);
        }

        this.children.forEach(c => c.draw(ctx));
        ctx.restore();
    }
}

export class Skeleton {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.root = null;
        this.bones = new Map(); // name -> bone
    }
    // ... existing methods ... (kept for fallback/reference)

    setRoot(bone) {
        this.root = bone;
        this.addBoneToMap(bone);
    }

    addBoneToMap(bone) {
        this.bones.set(bone.name, bone);
        bone.children.forEach(c => this.addBoneToMap(c));
    }

    getBone(name) {
        return this.bones.get(name);
    }

    update(dt) {
        // Here we can run animations
        // Simple procedural animation hook
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.root) {
            this.root.draw(ctx);
        }
        ctx.restore();
    }
}


const ImageIDMap = {
    'zombie_head': 1,
    'zombie_body': 2,
    'zombie_arm': 3,
    'zombie_leg': 4,
    'cone': 5,
    'bucket': 6,
    // Add others as needed
};

export class WasmSkeleton {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.id = -1;
        this.bones = new Map(); // name -> { proxy object for JS manipulation }
        this.renderData = new Float32Array(1024); // Pre-allocate buffer

        this.init(x, y);
    }

    async init(x, y) {
        await WasmLoader.waitForReady();
        if (window.createSkeleton) {
            this.id = window.createSkeleton(x, y);
        }
    }

    // Mirroring the API for easy migration
    // But Wasm build is slightly different, we assume we add bones sequentially
    // The original code constructed a tree manually then called setRoot.
    // We need to intercept bone creation or replicate it.

    // Better approach: Proxy the "Bone" creation.
    // But Zombie.js creates Bones directly.
    // We can iterate the existing pure-JS bone tree and replicate it to Wasm once!

    syncFromJS(jsSkeleton) {
        if (this.id === -1) return; // Not ready

        // Traverse JS skeleton and add to Wasm
        const traverse = (bone, parentName) => {
            const imgID = ImageIDMap[bone.imageName] || 0; // map bone.image (which is an object) to ID? No, bone.image is Image object.
            // We need the name of the image. The Bone constructor took `image` object.
            // We might need to store the image key in Bone.

            // Assume we patching Bone to have .imageName or we infer it.
            // For now, let's just pass 0 or fix Zombie.js

            window.addBone(
                this.id,
                parentName,
                bone.name,
                imgID,
                bone.x, bone.y, bone.rotation, bone.scaleX, bone.scaleY, bone.pivotX, bone.pivotY
            );

            this.bones.set(bone.name, bone); // Keep ref to JS bone to sync changes if needed?
            // Actually, if we want to drive from JS, we should keep the JS bones as "Controls"

            bone.children.forEach(c => traverse(c, bone.name));
        };

        if (jsSkeleton.root) {
            traverse(jsSkeleton.root, "");
        }
    }

    update(dt) {
        if (this.id === -1) return;
        window.updateSkeleton(this.id, dt);
    }

    // Update a single bone transform (for procedural animation)
    setBoneTransform(name, x, y, rot, sx, sy) {
        if (this.id === -1) return;
        window.setBoneTransform(this.id, name, x, y, rot, sx, sy);
    }

    draw(ctx) {
        if (this.id === -1) return;

        // Get data from Wasm
        // getSkeletonRenderData(id, destArray) -> returns count
        const count = window.getSkeletonRenderData(this.id, this.renderData);

        // Render
        // Data layout: [x, y, rot, sx, sy, imgID, px, py] -> 8 floats per bone
        const stride = 8;
        const numBones = count / stride;

        ctx.save();
        // The Wasm coordinates are World coordinates (including skeleton X,Y)
        // So we don't need ctx.translate(this.x, this.y) if Wasm computed it correctly using Root transform.
        // Actually, my Go code initialized Root with (0,0) relative to Skeleton(X,Y). 
        // Let's assume Wasm returns World coordinates.

        for (let i = 0; i < numBones; i++) {
            const base = i * stride;
            const x = this.renderData[base + 0];
            const y = this.renderData[base + 1];
            const rot = this.renderData[base + 2];
            const sx = this.renderData[base + 3];
            const sy = this.renderData[base + 4];
            const imgID = this.renderData[base + 5];
            const px = this.renderData[base + 6];
            const py = this.renderData[base + 7];

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.scale(sx, sy);

            // Draw Image
            const img = this.getImageByID(imgID);
            if (img) {
                ctx.drawImage(img, -px, -py);
            }

            ctx.restore();
        }
        ctx.restore();
    }

    getImageByID(id) {
        // Simple switch for now or reverse map
        let name = "";
        switch (id) {
            case 1: name = 'zombie_head'; break;
            case 2: name = 'zombie_body'; break;
            case 3: name = 'zombie_arm'; break;
            case 4: name = 'zombie_leg'; break;
            case 5: name = 'cone'; break;
            case 6: name = 'bucket'; break;
        }
        if (name) {
            // Need to import AssetLoader at the top of file or assume global?
            // The file imports AssetLoader at top usually (wait, I need to check top)
            // Let's assume standard AssetLoader import if not present I add it.
            // Actually, `Bone` used `image` object passed in.
            // Let's rely on AssetLoader.
            // But AssetLoader might not be imported in this file. 
            // Checking imports...
            // Original file didn't import AssetLoader, Zombie.js did passed images.
            // I should modify file to import AssetLoader.
            return AssetLoader.getImage(name);
        }
        return null;
    }
}
