
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.resolve(__dirname, '../src/assets');

async function processAssets() {
    try {
        const files = await fs.readdir(ASSETS_DIR);

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.png') {
                const inputPath = path.join(ASSETS_DIR, file);
                const outputPath = path.join(ASSETS_DIR, path.basename(file, '.png') + '.webp');

                console.log(`Converting ${file} to WebP...`);

                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPath);

                console.log(`Saved ${path.basename(outputPath)}`);

                // Optional: Delete original
                await fs.unlink(inputPath);
                console.log(`Deleted original ${file}`);
            }
        }
        console.log('All assets processed.');
    } catch (err) {
        console.error('Error processing assets:', err);
    }
}

processAssets();
