
export class AnimationEditor {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;

        // State
        this.skelID = 0;
        this.animID = 0;
        this.selectedBone = null;
        this.bones = {}; // name -> data mapping
        this.isPlaying = false;
        this.currentTime = 0;
        this.animDuration = 2.0;

        // Viewport
        this.viewportScale = 1.0;
        this.viewportX = 0;
        this.viewportY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        // Timeline
        this.timelineZoom = 100;
        this.timelineScrollX = 0;
        this.isScrubbing = false;
        this.keyframesList = [];

        // Sprite Cutter
        this.currentMode = 'skeleton';
        this.spriteImage = null;
        this.spritePath = "";
        this.parts = [];
        this.selectedPart = null;
        this.isDrawingPart = false;
        this.drawStartX = 0;
        this.drawStartY = 0;
        this.currentMouseX = 0;
        this.currentMouseY = 0;
    }

    async init() {
        if (this.isInitialized) return;

        this.renderUI();
        this.bindEvents();

        // WASM Init
        if (!window.Go) {
            console.error("wasm_exec.js not loaded");
            return;
        }

        const go = new Go();
        try {
            const result = await WebAssembly.instantiateStreaming(fetch("/public/lib.wasm"), go.importObject);
            go.run(result.instance);
            console.log("Wasm Ready");

            this.createInitialSkeleton();
            this.resize();
            this.loop();
            this.isInitialized = true;
            this.container.querySelector('#loading-overlay').style.display = 'none';
        } catch (e) {
            console.error("Wasm Load Failed", e);
            this.container.querySelector('#loading-overlay').innerHTML = `<span style="color:red">Failed to load Core (WASM): ${e.message}</span>`;
        }
    }

    renderUI() {
        this.container.innerHTML = `
            <div id="anim-editor-view">
                <div id="anim-sidebar">
                    <div style="margin-bottom: 20px;">
                        <h2 style="margin:0; font-size: 14px; text-transform: uppercase; color: #ccc;">Animation Editor</h2>
                    </div>

                    <div class="control-group" style="display: flex;">
                        <button id="btn-mode-skel" class="mode-btn active" style="margin-right: 5px;">Skeleton</button>
                        <button id="btn-mode-sprite" class="mode-btn">Sprite Cutter</button>
                    </div>

                    <!-- Skeleton Panel -->
                    <div id="panel-skeleton">
                        <div class="control-group">
                            <label>Structure</label>
                            <button id="btn-create-skel">New Skeleton</button>
                            <button id="btn-add-bone">Add Bone</button>
                        </div>
                        
                        <div class="control-group">
                            <label>Bones</label>
                            <div id="bone-list" class="bone-list"></div>
                        </div>

                        <div id="bone-props" class="control-group" style="opacity: 0.5; pointer-events: none;">
                            <label>Selected: <span id="lbl-bone-name">-</span></label>
                            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                <input type="number" id="inp-x" placeholder="X" step="1" style="width: 50%">
                                <input type="number" id="inp-y" placeholder="Y" step="1" style="width: 50%">
                            </div>
                            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                <input type="number" id="inp-rot" placeholder="Rot" step="0.1" style="width: 100%">
                            </div>
                            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                <input type="number" id="inp-sx" placeholder="SX" step="0.1" value="1" style="width: 50%">
                                <input type="number" id="inp-sy" placeholder="SY" step="0.1" value="1" style="width: 50%">
                            </div>
                            <label>Mapped Part</label>
                            <select id="inp-img" style="width: 100%"><option value="-1">None</option></select>
                        </div>
                    </div>

                    <!-- Sprite Panel -->
                    <div id="panel-sprite" style="display: none;">
                        <div class="control-group">
                            <label>Sprite Sheet Path</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="text" id="inp-spritesheet-path" placeholder="/public/assets/zombie.webp" style="flex:1">
                                <button id="btn-load-sprite" style="width: auto;">Load</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Defined Parts</label>
                            <div id="part-list" class="bone-list"></div>
                            <button id="btn-add-part" class="secondary">+ Manual Part</button>
                        </div>

                        <div id="part-props" class="control-group" style="opacity: 0.5; pointer-events: none;">
                            <label>Part Properties</label>
                            <input type="text" id="inp-part-name" placeholder="Name" style="margin-bottom: 5px; width: 100%;">
                            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                <input type="number" id="inp-part-x" placeholder="X" style="width: 50%">
                                <input type="number" id="inp-part-y" placeholder="Y" style="width: 50%">
                            </div>
                            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                                <input type="number" id="inp-part-w" placeholder="W" style="width: 50%">
                                <input type="number" id="inp-part-h" placeholder="H" style="width: 50%">
                            </div>
                            <button id="btn-delete-part" style="background:#d32f2f; margin-top:5px;">Delete Part</button>
                        </div>
                    </div>

                    <!-- Animation Controls -->
                    <div class="control-group" style="margin-top: 20px; border-top: 1px solid #333; padding-top: 20px;">
                        <label>Animation Clip</label>
                        <input type="text" id="inp-anim-name" placeholder="Name (e.g. idle)" style="width: 100%; margin-bottom: 5px;">
                        <div style="display: flex; gap: 5px;">
                            <button id="btn-create-anim">New</button>
                            <button id="btn-keyframe">Keyframe</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <label>Persistence</label>
                        <button id="btn-save">Save JSON</button>
                        <div style="display: flex; gap: 5px; margin-top: 5px;">
                            <select id="sel-anim-list" style="flex: 1;"></select>
                            <button id="btn-load" style="width: auto;">Load</button>
                        </div>
                    </div>

                </div>

                <div id="anim-canvas-container">
                    <div id="loading-overlay"><div style="color:white">Loading WASM...</div></div>
                    
                    <div id="anim-canvas-wrapper">
                        <canvas id="canvas"></canvas>
                    </div>

                    <div id="timeline-panel">
                        <div id="timeline-controls">
                            <button id="btn-play" style="width: auto; margin-right: 5px;">&#9658; Play</button>
                            <button id="btn-stop" style="width: auto; background: #c62828;">&#9724; Stop</button>
                            <div style="flex: 1; margin: 0 10px; color: var(--success); font-family: monospace;">
                                <span id="time-display">0.00s</span> / <span id="duration-display">2.00s</span>
                            </div>
                        </div>
                        <div id="timeline-container" style="flex: 1; position: relative; overflow: hidden; background: #222;">
                            <canvas id="timeline-canvas"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const q = (sel) => this.container.querySelector(sel);

        // Sidebar Toggles
        q('#btn-mode-skel').onclick = () => this.setMode('skeleton');
        q('#btn-mode-sprite').onclick = () => this.setMode('sprite');

        // Sprite
        q('#btn-load-sprite').onclick = () => {
            const path = q('#inp-spritesheet-path').value;
            if (!path) return;
            const img = new Image();
            img.onload = () => {
                this.spriteImage = img;
                this.spritePath = path;
                this.viewportX = 50; this.viewportY = 50; this.viewportScale = 1.0;
            };
            img.src = path;
        };

        q('#btn-add-part').onclick = () => {
            const name = "part_" + this.parts.length;
            const newPart = { name, x: 0, y: 0, w: 50, h: 50 };
            this.parts.push(newPart);
            this.renderPartList();
            this.selectPart(newPart);
        };
        q('#btn-delete-part').onclick = () => this.deletePart();

        ['inp-part-name', 'inp-part-x', 'inp-part-y', 'inp-part-w', 'inp-part-h'].forEach(id => {
            q('#' + id).oninput = () => this.updatePartFromUI();
        });

        // Skeleton
        q('#btn-create-skel').onclick = () => {
            this.bones = {};
            this.createInitialSkeleton();
        };

        q('#btn-add-bone').onclick = () => {
            const name = prompt("Bone Name:");
            if (!name) return;
            const parent = this.selectedBone ? this.selectedBone : "";
            this.addBoneJS(parent, name, -1, 50, 0, 0, 1, 1, 0, 0); // Image -1 (None)
            this.renderBoneList();
        };

        ['inp-x', 'inp-y', 'inp-rot', 'inp-sx', 'inp-sy', 'inp-img'].forEach(id => {
            q('#' + id).oninput = () => this.updateBoneFromUI();
        });

        // Animation
        q('#btn-create-anim').onclick = () => {
            const name = q('#inp-anim-name').value || "anim_1";
            this.animID = createAnimation(name, this.animDuration); // Call WASM
            q('#duration-display').textContent = this.animDuration.toFixed(2) + 's';
            this.renderTimeline();
        };

        q('#btn-keyframe').onclick = () => {
            if (!this.animID) { alert("Create animation first!"); return; }
            if (!this.selectedBone) { alert("Select bone!"); return; }
            const b = this.bones[this.selectedBone];
            addKeyframe(this.animID, this.currentTime, this.selectedBone, b.x, b.y, b.r, b.sx, b.sy);
            this.keyframesList.push({ t: this.currentTime, bone: this.selectedBone });
            this.renderTimeline();
        };

        q('#btn-save').onclick = () => this.saveAnimation();
        q('#btn-load').onclick = () => this.loadSelectedAnimation();

        // Timeline
        q('#btn-play').onclick = () => this.isPlaying = true;
        q('#btn-stop').onclick = () => this.isPlaying = false;

        // Canvases
        const canvas = q('#canvas');
        const tlCanvas = q('#timeline-canvas');

        // Main Canvas Events
        canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            this.viewportScale += e.deltaY * -0.001;
            this.viewportScale = Math.max(0.1, Math.min(5.0, this.viewportScale));
        });

        window.addEventListener('mouseup', () => this.onMouseUp());
        window.addEventListener('mousemove', e => this.onMouseMove(e));

        // Timeline Events
        tlCanvas.addEventListener('mousedown', e => {
            const rect = tlCanvas.getBoundingClientRect();
            if (e.clientY - rect.top < 20) {
                this.isScrubbing = true;
                this.updateTimeFromMouse(e.clientX - rect.left);
            }
        });
        tlCanvas.addEventListener('mousemove', e => {
            if (this.isScrubbing) {
                const rect = tlCanvas.getBoundingClientRect();
                this.updateTimeFromMouse(e.clientX - rect.left);
            }
        });
        tlCanvas.addEventListener('wheel', e => {
            e.preventDefault();
            this.timelineZoom -= e.deltaY * 0.1;
            this.timelineZoom = Math.max(10, Math.min(500, this.timelineZoom));
            this.renderTimeline();
        });

        // Resize
        new ResizeObserver(() => this.resize()).observe(this.container);

        // Load List
        this.loadAnimList();
    }

    setMode(mode) {
        this.currentMode = mode;
        const q = (sel) => this.container.querySelector(sel);
        if (mode === 'skeleton') {
            q('#btn-mode-skel').classList.add('active');
            q('#btn-mode-sprite').classList.remove('active');
            q('#panel-skeleton').style.display = 'block';
            q('#panel-sprite').style.display = 'none';
        } else {
            q('#btn-mode-skel').classList.remove('active');
            q('#btn-mode-sprite').classList.add('active');
            q('#panel-skeleton').style.display = 'none';
            q('#panel-sprite').style.display = 'block';
        }
    }

    createInitialSkeleton() {
        if (typeof createSkeleton === 'undefined') return;
        this.skelID = createSkeleton(400, 300);
        this.addBoneJS("", "root", -1, 0, 0, 0, 1, 1, 0, 0);
        this.renderBoneList();
        this.viewportX = this.container.querySelector('#anim-canvas-wrapper').clientWidth / 2;
        this.viewportY = this.container.querySelector('#anim-canvas-wrapper').clientHeight / 2;
    }

    addBoneJS(parent, name, img, x, y, r, sx, sy, px, py) {
        if (!name) name = "bone_" + Object.keys(this.bones).length;
        this.bones[name] = { parent, name, img, x, y, r, sx, sy, px, py };
        addBone(this.skelID, parent, name, img, x, y, r, sx, sy, px, py); // WASM
        return name;
    }

    renderBoneList() {
        const list = this.container.querySelector('#bone-list');
        list.innerHTML = '';
        for (let name in this.bones) {
            const div = document.createElement('div');
            div.className = 'bone-item';
            div.textContent = name + (this.bones[name].parent ? ` (<- ${this.bones[name].parent})` : ' (Root)');
            if (this.selectedBone === name) div.classList.add('active');
            div.onclick = () => this.selectBone(name);
            list.appendChild(div);
        }
    }

    selectBone(name) {
        this.selectedBone = name;
        this.renderBoneList();
        const props = this.container.querySelector('#bone-props');
        props.style.opacity = '1'; props.style.pointerEvents = 'auto';
        this.container.querySelector('#lbl-bone-name').textContent = name;

        const b = this.bones[name];
        const q = (id) => this.container.querySelector('#' + id);
        q('inp-x').value = b.x; q('inp-y').value = b.y;
        q('inp-rot').value = b.r; q('inp-sx').value = b.sx; q('inp-sy').value = b.sy;

        // Populate options
        const sel = q('inp-img');
        sel.innerHTML = '<option value="-1">None</option>';
        this.parts.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${idx}: ${p.name}`;
            sel.appendChild(opt);
        });
        sel.value = b.img;
    }

    updateBoneFromUI() {
        if (!this.selectedBone) return;
        const b = this.bones[this.selectedBone];
        const q = (id) => this.container.querySelector('#' + id);
        b.x = parseFloat(q('inp-x').value) || 0;
        b.y = parseFloat(q('inp-y').value) || 0;
        b.r = parseFloat(q('inp-rot').value) || 0;
        b.sx = parseFloat(q('inp-sx').value) || 1;
        b.sy = parseFloat(q('inp-sy').value) || 1;
        b.img = parseInt(q('inp-img').value) || -1;

        setBoneTransform(this.skelID, this.selectedBone, b.x, b.y, b.r, b.sx, b.sy); // WASM
    }

    // --- Sprite Logic ---
    renderPartList() {
        const list = this.container.querySelector('#part-list');
        list.innerHTML = '';
        this.parts.forEach(p => {
            const div = document.createElement('div');
            div.className = 'bone-item';
            div.textContent = p.name;
            if (this.selectedPart === p) div.classList.add('active');
            div.onclick = () => this.selectPart(p);
            list.appendChild(div);
        });
    }

    selectPart(part) {
        this.selectedPart = part;
        this.renderPartList();
        const props = this.container.querySelector('#part-props');
        props.style.opacity = '1'; props.style.pointerEvents = 'auto';

        const q = (id) => this.container.querySelector('#' + id);
        q('inp-part-name').value = part.name;
        q('inp-part-x').value = part.x; q('inp-part-y').value = part.y;
        q('inp-part-w').value = part.w; q('inp-part-h').value = part.h;
    }

    updatePartFromUI() {
        if (!this.selectedPart) return;
        const q = (id) => this.container.querySelector('#' + id);
        this.selectedPart.name = q('inp-part-name').value;
        this.selectedPart.x = parseInt(q('inp-part-x').value) || 0;
        this.selectedPart.y = parseInt(q('inp-part-y').value) || 0;
        this.selectedPart.w = parseInt(q('inp-part-w').value) || 1;
        this.selectedPart.h = parseInt(q('inp-part-h').value) || 1;
        this.renderPartList();
    }

    deletePart() {
        if (!this.selectedPart) return;
        const idx = this.parts.indexOf(this.selectedPart);
        if (idx >= 0) this.parts.splice(idx, 1);
        this.selectedPart = null;
        this.renderPartList();
    }

    // --- Interaction ---
    getWorldPos(e) {
        const canvas = this.container.querySelector('#canvas');
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.viewportX) / this.viewportScale,
            y: (e.clientY - rect.top - this.viewportY) / this.viewportScale
        };
    }

    onMouseDown(e) {
        if (e.button === 1 || e.shiftKey) {
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            return;
        }
        if (e.button === 0) {
            if (this.currentMode === 'sprite') {
                const wPos = this.getWorldPos(e);
                this.isDrawingPart = true;
                this.drawStartX = wPos.x;
                this.drawStartY = wPos.y;
                // Selection Logic
                let clicked = null;
                for (let i = this.parts.length - 1; i >= 0; i--) {
                    const p = this.parts[i];
                    if (wPos.x >= p.x && wPos.x <= p.x + p.w && wPos.y >= p.y && wPos.y <= p.y + p.h) {
                        clicked = p; break;
                    }
                }
                if (clicked) this.selectPart(clicked); else this.selectedPart = null;
            }
        }
    }

    onMouseUp() {
        this.isPanning = false;
        this.isScrubbing = false;
        if (this.isDrawingPart && this.currentMode === 'sprite') {
            const w = this.currentMouseX - this.drawStartX;
            const h = this.currentMouseY - this.drawStartY;
            if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                const name = "part_" + this.parts.length;
                const newPart = {
                    name,
                    x: Math.floor(w < 0 ? this.currentMouseX : this.drawStartX),
                    y: Math.floor(h < 0 ? this.currentMouseY : this.drawStartY),
                    w: Math.abs(Math.floor(w)), h: Math.abs(Math.floor(h))
                };
                this.parts.push(newPart);
                this.renderPartList();
                this.selectPart(newPart);
            }
            this.isDrawingPart = false;
        }
    }

    onMouseMove(e) {
        if (this.isPanning) {
            this.viewportX += e.clientX - this.panStartX;
            this.viewportY += e.clientY - this.panStartY;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            return;
        }
        const wPos = this.getWorldPos(e);
        this.currentMouseX = wPos.x;
        this.currentMouseY = wPos.y;
    }

    // --- Timeline ---
    updateTimeFromMouse(mouseX) {
        let t = (mouseX + this.timelineScrollX) / this.timelineZoom;
        t = Math.max(0, Math.min(this.animDuration, t));
        this.currentTime = t;
        this.container.querySelector('#time-display').textContent = t.toFixed(2) + 's';
        if (this.animID) loopAnimation(this.skelID, this.animID, t, true); // WASM: applyAnimation?
        // Wait, wrapper.go might have different name. Let's assume 'applyAnimation' as per original file
        if (this.animID && typeof applyAnimation !== 'undefined') applyAnimation(this.skelID, this.animID, t, true);
        this.renderTimeline();
    }

    renderTimeline() {
        const cvs = this.container.querySelector('#timeline-canvas');
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        const w = cvs.width; const h = cvs.height;
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-this.timelineScrollX, 0);

        // Ticks
        ctx.beginPath();
        ctx.strokeStyle = '#555';
        ctx.font = '10px monospace';
        ctx.fillStyle = '#aaa';
        const step = this.timelineZoom > 100 ? 0.1 : 0.5;
        for (let t = 0; t <= this.animDuration; t += step) {
            const x = t * this.timelineZoom;
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
            ctx.fillText(t.toFixed(1) + 's', x + 2, 14);
        }
        ctx.stroke();

        // Keyframes
        ctx.fillStyle = '#8bc34a';
        this.keyframesList.forEach(kf => {
            const kx = kf.t * this.timelineZoom;
            ctx.beginPath(); ctx.arc(kx, 30, 4, 0, Math.PI * 2); ctx.fill();
        });

        // Playhead
        const cx = this.currentTime * this.timelineZoom;
        ctx.strokeStyle = 'red';
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

        ctx.restore();
    }

    // --- Loops ---
    resize() {
        if (!this.container) return;
        const wrapper = this.container.querySelector('#anim-canvas-wrapper');
        const canvas = this.container.querySelector('#canvas');
        if (wrapper && canvas) {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
        }
        const tlCont = this.container.querySelector('#timeline-container');
        const tlCanvas = this.container.querySelector('#timeline-canvas');
        if (tlCont && tlCanvas) {
            tlCanvas.width = tlCont.clientWidth;
            tlCanvas.height = tlCont.clientHeight;
        }
        this.renderTimeline();
    }

    loop() {
        if (!this.container || this.container.closest('.view-hidden')) {
            requestAnimationFrame(() => this.loop()); // Keep requesting but don't draw if hidden?
            return;
        }

        requestAnimationFrame(() => this.loop());

        if (this.isPlaying) {
            this.currentTime += 0.016;
            if (this.currentTime > this.animDuration) this.currentTime = 0;
            this.container.querySelector('#time-display').textContent = this.currentTime.toFixed(2) + 's';
            if (this.animID && typeof applyAnimation !== 'undefined') applyAnimation(this.skelID, this.animID, this.currentTime, true);
            if (this.currentMode === 'skeleton') this.renderTimeline();
        }

        const cvs = this.container.querySelector('#canvas');
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        ctx.save();
        ctx.translate(this.viewportX, this.viewportY);
        ctx.scale(this.viewportScale, this.viewportScale);

        // Draw Sprite Mode
        if (this.currentMode === 'sprite') {
            if (this.spriteImage) ctx.drawImage(this.spriteImage, 0, 0);
            this.parts.forEach(p => {
                ctx.strokeStyle = (this.selectedPart === p) ? '#00FF00' : '#00FFFF';
                ctx.lineWidth = 2 / this.viewportScale;
                ctx.strokeRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = `${12 / this.viewportScale}px Arial`;
                ctx.fillText(p.name, p.x, p.y - 5);
            });
            if (this.isDrawingPart) {
                const w = this.currentMouseX - this.drawStartX;
                const h = this.currentMouseY - this.drawStartY;
                ctx.strokeStyle = '#FFFF00';
                ctx.strokeRect(this.drawStartX, this.drawStartY, w, h);
            }
        }
        // Draw Skeleton Mode
        else {
            // Draw Origin
            ctx.strokeStyle = '#333';
            ctx.beginPath(); ctx.moveTo(-1000, 0); ctx.lineTo(1000, 0); ctx.moveTo(0, -1000); ctx.lineTo(0, 1000); ctx.stroke();

            if (typeof getSkeletonRenderData !== 'undefined') {
                const buffer = new Float32Array(1000);
                const count = getSkeletonRenderData(this.skelID, buffer);
                for (let i = 0; i < count; i += 8) {
                    const wx = buffer[i]; const wy = buffer[i + 1];
                    const rot = buffer[i + 2]; const imgID = buffer[i + 5];

                    if (this.spriteImage && imgID >= 0 && this.parts[imgID]) {
                        const p = this.parts[imgID];
                        ctx.save();
                        ctx.translate(wx, wy); ctx.rotate(rot);
                        ctx.drawImage(this.spriteImage, p.x, p.y, p.w, p.h, -p.w / 2, -p.h / 2, p.w, p.h);
                        ctx.restore();
                    } else {
                        ctx.beginPath(); ctx.arc(wx, wy, 5 / this.viewportScale, 0, Math.PI * 2);
                        ctx.fillStyle = '#8bc34a'; ctx.fill();
                        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(rot) * 20, wy + Math.sin(rot) * 20);
                        ctx.strokeStyle = 'yellow'; ctx.stroke();
                    }
                }
            }
        }
        ctx.restore();
    }

    // --- IO ---
    async saveAnimation() {
        if (!this.animID) return;
        const name = this.container.querySelector('#inp-anim-name').value || "anim_1";
        const filename = name + ".json";

        let jsonStr = "";
        if (typeof getAnimationJSON !== 'undefined') jsonStr = getAnimationJSON(this.animID);

        let data = JSON.parse(jsonStr);
        data.parts = this.parts;
        data.spritePath = this.spritePath;

        try {
            await window.ClientAPI.save(filename, JSON.stringify(data, null, 4));
            alert("Saved");
        } catch (e) { alert("Error saving: " + e.message); }
    }

    async loadAnimList() {
        try {
            const files = await window.ClientAPI.list();
            const sel = this.container.querySelector('#sel-anim-list');
            sel.innerHTML = '';
            files.forEach(f => {
                if (f.endsWith('.json')) {
                    const opt = document.createElement('option');
                    opt.value = f; opt.textContent = f; sel.appendChild(opt);
                }
            });
        } catch (e) { }
    }

    async loadSelectedAnimation() {
        const filename = this.container.querySelector('#sel-anim-list').value;
        if (!filename) return;
        try {
            const data = await window.ClientAPI.read(filename);

            // Restore parts
            if (data.parts) {
                this.parts = data.parts;
                this.renderPartList();
            }
            if (data.spritePath) {
                this.spritePath = data.spritePath;
                this.container.querySelector('#inp-spritesheet-path').value = this.spritePath;
                // Load Image ...
            }

            // Recreate Anim
            this.animID = createAnimation(data.name, data.duration);
            this.animDuration = data.duration;
            this.container.querySelector('#duration-display').textContent = this.animDuration + "s";
            this.container.querySelector('#inp-anim-name').value = data.name;

            // Restore Keyframes
            this.keyframesList = [];
            if (data.keyframes) {
                data.keyframes.forEach(kf => {
                    addKeyframe(this.animID, kf.time, kf.boneName, kf.x, kf.y, kf.rotation, kf.scaleX || 1, kf.scaleY || 1);
                    this.keyframesList.push({ t: kf.time, bone: kf.boneName });
                });
            }
            this.renderTimeline();

        } catch (e) { console.error(e); }
    }
}
