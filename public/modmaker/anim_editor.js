const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const boneListUI = document.getElementById('bone-list');

// Inputs
const inpX = document.getElementById('inp-x');
const inpY = document.getElementById('inp-y');
const inpRot = document.getElementById('inp-rot');
const inpSX = document.getElementById('inp-sx');
const inpSY = document.getElementById('inp-sy');
const inpImg = document.getElementById('inp-img');
const lblBoneName = document.getElementById('lbl-bone-name');
const boneProps = document.getElementById('bone-props');

// State
let skelID = 0;
let animID = 0;
let selectedBone = null;
let bones = {}; // name -> data mapping
let isPlaying = false;
let currentTime = 0;
let animDuration = 2.0; // Default

// Wasm Init
const go = new Go();
WebAssembly.instantiateStreaming(fetch("../lib.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
    document.getElementById('loading').style.display = 'none';
    console.log("Wasm Ready");

    // Init Logic
    createInitialSkeleton();
    loop();
});

function resize() {
    canvas.width = document.getElementById('canvas-container').clientWidth;
    canvas.height = document.getElementById('canvas-container').clientHeight;
}
window.addEventListener('resize', resize);
resize();

function createInitialSkeleton() {
    skelID = createSkeleton(400, 300); // Center of canvas roughly
    // Add default root bone
    addBoneJS("", "root", 0, 0, 0, 0, 1, 1, 0, 0);
    renderBoneList();
}

function addBoneJS(parent, name, img, x, y, r, sx, sy, px, py) {
    if (!name) name = "bone_" + Object.keys(bones).length;

    // Store local state in JS for UI (Wasm has truth, but UI needs easy access)
    bones[name] = { parent, name, img, x, y, r, sx, sy, px, py };

    addBone(skelID, parent, name, img, x, y, r, sx, sy, px, py);
    return name;
}

// UI Handlers
document.getElementById('btn-create-skel').onclick = () => {
    bones = {};
    createInitialSkeleton();
};

document.getElementById('btn-add-bone').onclick = () => {
    const name = prompt("Bone Name:");
    if (!name) return;
    const parent = selectedBone ? selectedBone : "";
    addBoneJS(parent, name, 0, 50, 0, 0, 1, 1, 0, 0); // Default offset
    renderBoneList();
};

function renderBoneList() {
    boneListUI.innerHTML = '';
    for (let name in bones) {
        const div = document.createElement('div');
        div.className = 'bone-item';
        div.textContent = name + (bones[name].parent ? ` (<- ${bones[name].parent})` : ' (Root)');
        if (selectedBone === name) div.classList.add('active');
        div.onclick = () => selectBone(name);
        boneListUI.appendChild(div);
    }
}

function selectBone(name) {
    selectedBone = name;
    renderBoneList();

    // Enable inputs
    boneProps.style.opacity = '1';
    boneProps.style.pointerEvents = 'auto';
    lblBoneName.textContent = name;

    // Populate inputs from JS cache (or fetch from Wasm if we had getters)
    // For now we rely on JS cache being in sync which is a bit risky but simpler for MVP
    const b = bones[name];
    inpX.value = b.x;
    inpY.value = b.y;
    inpRot.value = b.r;
    inpSX.value = b.sx;
    inpSY.value = b.sy;
    inpImg.value = b.img;
}

// Input Change Listeners
[inpX, inpY, inpRot, inpSX, inpSY, inpImg].forEach(inp => {
    inp.oninput = updateBoneFromUI;
});

function updateBoneFromUI() {
    if (!selectedBone) return;
    const b = bones[selectedBone];

    b.x = parseFloat(inpX.value) || 0;
    b.y = parseFloat(inpY.value) || 0;
    b.r = parseFloat(inpRot.value) || 0;
    b.sx = parseFloat(inpSX.value) || 1;
    b.sy = parseFloat(inpSY.value) || 1;
    b.img = parseInt(inpImg.value) || 0;

    // Send to Wasm
    setBoneTransform(skelID, selectedBone, b.x, b.y, b.r, b.sx, b.sy);
}

// --- Animation ---

document.getElementById('btn-create-anim').onclick = () => {
    const name = document.getElementById('inp-anim-name').value || "anim_1";
    animID = createAnimation(name, animDuration);
    console.log("Created Anim:", animID);
};

document.getElementById('btn-keyframe').onclick = () => {
    if (!animID) {
        alert("Create animation first!");
        return;
    }
    if (!selectedBone) {
        alert("Select a bone first!");
        return;
    }

    const b = bones[selectedBone];
    addKeyframe(animID, currentTime, selectedBone, b.x, b.y, b.r, b.sx, b.sy);

    // Visual mark on timeline
    const mark = document.createElement('div');
    mark.className = 'keyframe-mark';
    mark.style.left = (currentTime / animDuration * 100) + '%';
    mark.title = `${selectedBone} @ ${currentTime.toFixed(2)}`;
    document.getElementById('keyframe-track').appendChild(mark);
};

document.getElementById('btn-export').onclick = async () => {
    if (!animID) return;
    const json = getAnimationJSON(animID);
    const filename = (document.getElementById('inp-anim-name').value || "anim") + ".json";

    console.log("Saving...", filename);
    const result = await ClientAPI.save(filename, json);
    alert(result.message);

    // Auto-download for convenience in client mode
    ClientAPI.download(filename);
};

// --- Timeline ---
const scrubber = document.getElementById('scrubber');
const timeDisplay = document.getElementById('time-display');

scrubber.oninput = (e) => {
    currentTime = (parseFloat(e.target.value) / 100) * animDuration;
    updateTimeDisplay();
    applyAnimFrame();
};

document.getElementById('btn-play').onclick = () => isPlaying = true;
document.getElementById('btn-stop').onclick = () => isPlaying = false;

function updateTimeDisplay() {
    timeDisplay.textContent = currentTime.toFixed(2) + 's';
}

function applyAnimFrame() {
    if (animID) {
        applyAnimation(skelID, animID, currentTime, true);

        // IMPORTANT: We need to pull values BACK to JS UI if we want the inputs to update
        // But for playback, usually inputs don't update to avoid performance hit.
        // We only update inputs if paused? Let's skip updating inputs for now.
    }
}

// Loop
function loop() {
    requestAnimationFrame(loop);

    if (isPlaying) {
        currentTime += 0.016; // approx 60fps
        if (currentTime > animDuration) currentTime = 0;

        scrubber.value = (currentTime / animDuration) * 100;
        updateTimeDisplay();
        applyAnimFrame();
    } else {
        // Just render skeleton (it might have been updated by UI manually)
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // Check Wasm
    if (typeof getSkeletonRenderData !== 'undefined') {
        // Float32Array size: numBones * 8 (x,y,r,sx,sy,img,px,py)
        // Let's allocate big enough buffer
        const buffer = new Float32Array(1000);
        const count = getSkeletonRenderData(skelID, buffer);

        // Draw
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;

        for (let i = 0; i < count; i += 8) {
            const wx = buffer[i];
            const wy = buffer[i + 1];
            // const wr = buffer[i+2];
            // const img = buffer[i+5];

            // Draw Bone Point
            ctx.beginPath();
            ctx.arc(wx, wy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#8bc34a';
            ctx.fill();

            // Draw Line to parent? 
            // We don't have parent World coords easily here unless we look them up
            // or pass parent index.
            // For MVP, just dots.
        }
    }
}

function drawGrid() {
    const cellSize = 50;
    const w = canvas.width;
    const h = canvas.height;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Vertical
    for (let x = 0; x <= w; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    // Horizontal
    for (let y = 0; y <= h; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    // Center X
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    // Center Y
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
}
