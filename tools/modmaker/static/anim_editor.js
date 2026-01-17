const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const boneListUI = document.getElementById('bone-list');

// Timeline Canvas
const timelineCanvas = document.getElementById('timeline-canvas');
const tCtx = timelineCanvas.getContext('2d');
const timelineContainer = document.getElementById('timeline-container');

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

// Viewport State (Main Canvas)
let viewportScale = 1.0;
let viewportX = 0;
let viewportY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let draggingBone = null;

// Timeline State
let timelineZoom = 100; // pixels per second
let timelineScrollX = 0;
let isScrubbing = false;

// Keyframes Cache for rendering timeline
let keyframesList = [];

// Wasm Init
const go = new Go();
WebAssembly.instantiateStreaming(fetch("/public/lib.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
    document.getElementById('loading').style.display = 'none';
    console.log("Wasm Ready");

    // Init Logic
    createInitialSkeleton();
    resize(); // Trigger resize for timeline
    loop();
});

function resize() {
    canvas.width = document.getElementById('canvas-container').clientWidth;
    canvas.height = document.getElementById('canvas-container').clientHeight;

    // Timeline resize
    timelineCanvas.width = timelineContainer.clientWidth;
    timelineCanvas.height = timelineContainer.clientHeight;
    renderTimeline();
}
window.addEventListener('resize', resize);

function createInitialSkeleton() {
    skelID = createSkeleton(400, 300); // Center of canvas roughly
    // Add default root bone
    addBoneJS("", "root", 0, 0, 0, 0, 1, 1, 0, 0);
    renderBoneList();

    // Center viewport initially
    viewportX = canvas.width / 2;
    viewportY = canvas.height / 2;
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

    // Add keyframe automatically if we are in 'AutoKey' mode (TODO)
}

// --- Animation ---

document.getElementById('btn-create-anim').onclick = () => {
    const name = document.getElementById('inp-anim-name').value || "anim_1";
    animID = createAnimation(name, animDuration);
    console.log("Created Anim:", animID);
    document.getElementById('duration-display').textContent = animDuration.toFixed(2) + 's';
    renderTimeline();
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

    // Track keyframe locally for timeline rendering
    keyframesList.push({ t: currentTime, bone: selectedBone });
    renderTimeline();
};

document.getElementById('btn-export').onclick = saveAnimation;
document.getElementById('btn-save').onclick = saveAnimation;

async function saveAnimation() {
    if (!animID) return;
    const name = document.getElementById('inp-anim-name').value || "anim_1";
    const filename = name + ".json";

    // Get JSON from Wasm
    const jsonStr = getAnimationJSON(animID);

    // Parse to ensure valid object, though Wasm should allow valid JSON
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Invalid JSON from Wasm", e);
        return;
    }

    try {
        const response = await fetch(`/api/data/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data, null, 4)
        });

        if (response.ok) {
            alert(`Saved ${filename}`);
            loadAnimList(); // Refresh list
        } else {
            alert("Error saving: " + await response.text());
        }
    } catch (e) {
        console.error(e);
        alert("Network Error");
    }
}

// Load List
const animListSelect = document.getElementById('sel-anim-list');
async function loadAnimList() {
    try {
        const res = await fetch('/api/list');
        const files = await res.json();
        animListSelect.innerHTML = '<option value="">Load Animation...</option>';
        files.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            animListSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load list", e);
    }
}

document.getElementById('btn-load').onclick = async () => {
    const filename = animListSelect.value;
    if (!filename) return;

    try {
        const res = await fetch(`/api/data/${filename}`);
        const data = await res.json();

        // TODO: Import into Wasm
        console.log("Loaded Data (TODO: Implement Import logic in Wasm/JS bridge)", data);
        alert("Loaded data logged to console. (Import logic pending)");
    } catch (e) {
        console.error(e);
        alert("Failed to load");
    }
};

// Init
loadAnimList();

// --- Main Canvas Interaction (Pan/Zoom) ---

canvas.addEventListener('mousedown', e => {
    // Check if clicking on a bone handles vs pan
    if (e.button === 0) { // Left click
        // Assuming Pan for now or Drag Bone if we implemented hit testing
    }
    if (e.button === 1 || e.shiftKey) { // Middle click or Shift+Left
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
    }
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    isScrubbing = false;
});

window.addEventListener('mousemove', e => {
    if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        viewportX += dx;
        viewportY += dy;
        panStartX = e.clientX;
        panStartY = e.clientY;
    }
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    viewportScale += e.deltaY * -zoomSpeed;
    if (viewportScale < 0.1) viewportScale = 0.1;
    if (viewportScale > 5.0) viewportScale = 5.0;
});

// --- Timeline Interaction ---

timelineCanvas.addEventListener('mousedown', e => {
    const rect = timelineCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Header click (Scrub)
    if (y < 20) {
        isScrubbing = true;
        updateTimeFromMouse(x);
    }
});

timelineCanvas.addEventListener('mousemove', e => {
    if (isScrubbing) {
        const rect = timelineCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        updateTimeFromMouse(x);
    }
});

timelineCanvas.addEventListener('wheel', e => {
    // Zoom timeline
    e.preventDefault();
    timelineZoom += e.deltaY * -0.1;
    if (timelineZoom < 10) timelineZoom = 10;
    if (timelineZoom > 500) timelineZoom = 500;
    renderTimeline();
});

function updateTimeFromMouse(mouseX) {
    let t = (mouseX + timelineScrollX) / timelineZoom;
    if (t < 0) t = 0;
    if (t > animDuration) t = animDuration;
    currentTime = t;
    updateTimeDisplay();
    applyAnimFrame();
    renderTimeline();
}

// --- Playback Controls ---

document.getElementById('btn-play').onclick = () => isPlaying = true;
document.getElementById('btn-stop').onclick = () => isPlaying = false;

function updateTimeDisplay() {
    document.getElementById('time-display').textContent = currentTime.toFixed(2) + 's';
}

function applyAnimFrame() {
    if (animID) {
        applyAnimation(skelID, animID, currentTime, true);
    }
}

function renderTimeline() {
    const w = timelineCanvas.width;
    const h = timelineCanvas.height;
    tCtx.clearRect(0, 0, w, h);

    tCtx.save();
    tCtx.translate(-timelineScrollX, 0);

    // Draw Header
    tCtx.fillStyle = '#333';
    tCtx.fillRect(timelineScrollX, 0, w, 20); // Sticky header background? No, just scrolled

    // Draw Time Ticks
    tCtx.beginPath();
    tCtx.strokeStyle = '#555';
    tCtx.font = '10px monospace';
    tCtx.fillStyle = '#aaa';

    const step = timelineZoom > 100 ? 0.1 : (timelineZoom > 50 ? 0.5 : 1.0);

    for (let t = 0; t <= animDuration; t += step) {
        const x = t * timelineZoom;
        tCtx.moveTo(x, 0);
        tCtx.lineTo(x, h);
        tCtx.fillText(t.toFixed(1) + 's', x + 2, 14);
    }
    tCtx.stroke();

    // Draw Keyframes
    // We need a better way to group keyframes by bone, for now just dots on a single track per bone
    const boneNames = Object.keys(bones);
    boneNames.forEach((bn, idx) => {
        const y = 30 + (idx * 20);
        tCtx.fillStyle = (bn === selectedBone) ? '#444' : '#2a2a2a';
        tCtx.fillRect(0, y, animDuration * timelineZoom + 200, 18);

        // Draw bone name
        tCtx.fillStyle = '#888';
        tCtx.fillText(bn, timelineScrollX + 5, y + 12);
    });

    // Draw Keyframe dots
    tCtx.fillStyle = '#8bc34a'; // Green
    keyframesList.forEach(kf => {
        const kx = kf.t * timelineZoom;
        const bIdx = boneNames.indexOf(kf.bone);
        if (bIdx >= 0) {
            const ky = 30 + (bIdx * 20) + 9;
            tCtx.beginPath();
            tCtx.arc(kx, ky, 4, 0, Math.PI * 2);
            tCtx.fill();
        }
    });

    // Draw Playhead
    const cursorX = currentTime * timelineZoom;
    tCtx.strokeStyle = 'red';
    tCtx.lineWidth = 1;
    tCtx.beginPath();
    tCtx.moveTo(cursorX, 0);
    tCtx.lineTo(cursorX, h);
    tCtx.stroke();

    tCtx.restore();
}

// Loop
function loop() {
    requestAnimationFrame(loop);

    if (isPlaying) {
        currentTime += 0.016; // approx 60fps
        if (currentTime > animDuration) currentTime = 0;
        updateTimeDisplay();
        applyAnimFrame();
        renderTimeline(); // Update playhead
    }

    // Render Main Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Viewport Transform
    ctx.translate(viewportX, viewportY);
    ctx.scale(viewportScale, viewportScale);

    // Draw Origin
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(-1000, 0); ctx.lineTo(1000, 0);
    ctx.moveTo(0, -1000); ctx.lineTo(0, 1000);
    ctx.stroke();

    // Check Wasm
    if (typeof getSkeletonRenderData !== 'undefined') {
        const buffer = new Float32Array(1000);
        const count = getSkeletonRenderData(skelID, buffer);

        // Map for bone connections
        // We need to know parent indices or positions. 
        // Since getSkeletonRenderData just gives a flat list of computed transforms,
        // we might be missing parent info in the buffer unless we encode it.
        // But we have `bones` JS object which maps names to parents.
        // We need to map the Wasm index order to the JS Bones.
        // Assumption: Iteration order of `bones` might NOT match Wasm ID order. 
        // Wasm implementation uses a slice/vector.
        // For MVP, we will rely on just drawing points, OR we assume order.

        ctx.strokeStyle = '#8bc34a';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#8bc34a';

        // Draw connections first (if possible) - skipping for now as we don't have easy parent lookup by index

        // Draw nodes
        for (let i = 0; i < count; i += 8) {
            const wx = buffer[i];
            const wy = buffer[i + 1];

            // Draw Bone Point
            ctx.beginPath();
            ctx.arc(wx, wy, 5 / viewportScale, 0, Math.PI * 2); // Scale radius inverse to zoom
            ctx.fill();
        }
    }

    ctx.restore();
}
