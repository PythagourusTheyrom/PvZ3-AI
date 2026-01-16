export class Bone {
    constructor(name, image, x, y, pivotX = 0, pivotY = 0) {
        this.name = name;
        this.image = image;
        this.x = x; // Local X
        this.y = y; // Local Y
        this.pivotX = pivotX; // Pivot offset from (0,0) of the image
        this.pivotY = pivotY; // Pivot offset from (0,0) of the image
        this.rotation = 0; // Local rotation in radians
        this.scaleX = 1;
        this.scaleY = 1;
        this.children = [];
        this.parent = null;
    }

    addChild(bone) {
        bone.parent = this;
        this.children.push(bone);
    }

    update(dt) {
        // Handle local update logic if needed
    }

    draw(ctx, parentTransform) {
        ctx.save();

        // 1. Move to parent's position (or origin)
        // If we have a parent, we are already in parent's coordinate space because of ctx.save/restore recursion? 
        // No, usually we just transform relative to parent.

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scaleX, this.scaleY);

        // Draw self
        if (this.image) {
            // Draw image centered at pivot
            // Image (0,0) is top left. Pivot is where we want "0,0" of bone to be on the image.
            ctx.drawImage(this.image, -this.pivotX, -this.pivotY);
        }

        // Draw children
        this.children.forEach(child => child.draw(ctx));

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
