import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'src/assets');
const files = [
    'zombie_head.png', 'zombie_body.png', 'zombie_arm.png', 'zombie_leg.png',
    'peashooter_head.png', 'peashooter_leaf.png'
];

async function processImage(file) {
    const filePath = path.join(assetsDir, file);
    try {
        console.log(`Reading ${file}...`);
        const image = await Jimp.read(filePath);

        const w = image.bitmap.width;
        const h = image.bitmap.height;
        let minX = w, maxX = 0, minY = h, maxY = 0;

        image.scan(0, 0, w, h, (x, y, idx) => {
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];

            const isGray = Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
            const isLight = r > 100;

            if (isGray && isLight) {
                image.bitmap.data[idx + 3] = 0; // Transparent
            }

            if (image.bitmap.data[idx + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });

        if (maxX >= minX && maxY >= minY) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;
            console.log(`Cropping to ${minX},${minY} ${cropW}x${cropH}`);
            // Try object API
            image.crop({ x: minX, y: minY, w: cropW, h: cropH });
        } else {
            console.log(`Empty image.`);
        }

        console.log(`Writing ${file}...`);
        await image.write(filePath);
        console.log(`Written ${file}.`);
    } catch (err) {
        console.log("ERROR processing " + file);
        try {
            console.log(JSON.stringify(err, null, 2));
        } catch (e) { console.log(err); }
    }
}

async function run() {
    for (const file of files) {
        await processImage(file);
    }
}

run();
