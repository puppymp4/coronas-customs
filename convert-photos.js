const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const heicConvert = require('heic-convert');

const BASE = 'c:\\Users\\sande\\Documents\\!WEBS\\WRAP SHOT\\coronas-customs';
const SRC = path.join(BASE, 'pics', 'Coronas customz');
const OUT = path.join(BASE, 'pics');

const MAP = [
    { src: 'wraps', dest: 'gallery-wraps' },
    { src: 'Starlights', dest: 'gallery-starlights' },
    { src: 'headliner work', dest: 'gallery-headliner' },
    { src: 'ambient lighting', dest: 'gallery-ambient' },
];

async function convertHeic(inputPath) {
    const inputBuffer = fs.readFileSync(inputPath);
    const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9
    });
    return Buffer.from(outputBuffer);
}

async function processImage(inputPath, outputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    // Remove existing output if present
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    
    try {
        if (ext === '.heic') {
            console.log(`  Converting HEIC: ${path.basename(inputPath)}`);
            const jpegBuffer = await convertHeic(inputPath);
            await sharp(jpegBuffer)
                .rotate()
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 82 })
                .toFile(outputPath);
        } else {
            console.log(`  Processing: ${path.basename(inputPath)}`);
            await sharp(inputPath)
                .rotate()
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 82 })
                .toFile(outputPath);
        }
        console.log(`  -> OK: ${path.basename(outputPath)}`);
        return true;
    } catch (err) {
        console.error(`  SKIP ${path.basename(inputPath)}: ${err.message}`);
        // Try fallback without rotate for problematic HEIC files
        if (ext === '.heic') {
            try {
                console.log(`  Retry without rotate...`);
                const jpegBuffer = await convertHeic(inputPath);
                await sharp(jpegBuffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .jpeg({ quality: 82 })
                    .toFile(outputPath);
                console.log(`  -> OK (no-rotate): ${path.basename(outputPath)}`);
                return true;
            } catch (err2) {
                console.error(`  FAIL ${path.basename(inputPath)}: ${err2.message}`);
                return false;
            }
        }
        return false;
    }
}

async function main() {
    const results = {};

    for (const { src, dest } of MAP) {
        const srcDir = path.join(SRC, src);
        const destDir = path.join(OUT, dest);
        
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        
        console.log(`\n=== ${src} -> ${dest} ===`);
        
        const files = fs.readdirSync(srcDir).filter(f => {
            const e = path.extname(f).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.heic'].includes(e);
        });

        const processed = [];
        let coverFile = null;

        for (const file of files) {
            const inputPath = path.join(srcDir, file);
            const baseName = path.basename(file, path.extname(file));
            const outputName = baseName.replace(/[^a-zA-Z0-9_()-]/g, '_') + '.jpg';
            const outputPath = path.join(destDir, outputName);

            const lowerName = file.toLowerCase();
            if (lowerName.startsWith('cover')) {
                coverFile = outputName;
            }

            const ok = await processImage(inputPath, outputPath);
            if (ok) processed.push(outputName);
        }

        results[dest] = { files: processed, cover: coverFile };
        console.log(`Done: ${processed.length} images`);
    }

    console.log(`\n` + JSON.stringify(results, null, 2));
}

main().catch(console.error);
