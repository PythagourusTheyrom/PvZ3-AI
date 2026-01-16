export class AnimationController {
    constructor(skeleton) {
        this.skeleton = skeleton;
        this.animations = new Map();
        this.currentAnim = null;
        this.currentTime = 0;
        this.playing = false;
        this.loop = true;
    }

    /**
     * Define an animation.
     * keyframes: {
     *   boneName: {
     *     rotation: [ { time: 0, value: 0 }, { time: 1, value: 1 } ],
     *     scaleX: ...,
     *     x: ...
     *   }
     * }
     */
    add(name, duration, keyframes) {
        this.animations.set(name, { duration, keyframes });
    }

    play(name, loop = true) {
        if (this.currentAnim === name && this.playing) return;
        if (!this.animations.has(name)) {
            console.warn(`Animation ${name} not found`);
            return;
        }
        this.currentAnim = name;
        this.currentTime = 0;
        this.playing = true;
        this.loop = loop;
    }

    stop() {
        this.playing = false;
    }

    update(dt) {
        if (!this.playing || !this.currentAnim) return;

        const anim = this.animations.get(this.currentAnim);
        this.currentTime += dt;

        if (this.currentTime >= anim.duration) {
            if (this.loop) {
                this.currentTime %= anim.duration;
            } else {
                this.currentTime = anim.duration;
                this.playing = false;
            }
        }

        // Apply keyframes
        for (const [boneName, properties] of Object.entries(anim.keyframes)) {
            const bone = this.skeleton.getBone(boneName);
            if (!bone) continue;

            for (const [prop, keys] of Object.entries(properties)) {
                const val = this.interpolate(keys, this.currentTime);
                bone[prop] = val;
            }
        }
    }

    interpolate(keys, time) {
        if (!keys || keys.length === 0) return 0;

        // Find surrounding keys
        // Sort just in case (should be pre-sorted for perf)
        // keys.sort((a, b) => a.time - b.time);

        if (time <= keys[0].time) return keys[0].value;
        if (time >= keys[keys.length - 1].time) return keys[keys.length - 1].value;

        for (let i = 0; i < keys.length - 1; i++) {
            const k1 = keys[i];
            const k2 = keys[i + 1];
            if (time >= k1.time && time < k2.time) {
                const t = (time - k1.time) / (k2.time - k1.time);
                // Linear lerp
                return k1.value + (k2.value - k1.value) * t;
            }
        }
        return keys[0].value;
    }
}
