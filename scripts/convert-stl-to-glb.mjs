#!/usr/bin/env node
/**
 * Convert STL files in public/models/ → optimized GLB for lightweight loading.
 *
 * Usage:
 *   node scripts/convert-stl-to-glb.mjs
 *
 * No extra dependencies — uses only Node.js built-ins.
 * Creates indexed geometry (vertex deduplication) for significant size reduction.
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODELS_DIR = join(__dirname, "..", "public", "models");

// ============================================================
// Parse binary STL → raw triangles
// ============================================================
function parseBinarySTL(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const numTriangles = view.getUint32(80, true);

    const triangles = [];
    let offset = 84;

    for (let i = 0; i < numTriangles; i++) {
        const nx = view.getFloat32(offset, true); offset += 4;
        const ny = view.getFloat32(offset, true); offset += 4;
        const nz = view.getFloat32(offset, true); offset += 4;

        const verts = [];
        for (let v = 0; v < 3; v++) {
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const z = view.getFloat32(offset, true); offset += 4;
            verts.push([x, y, z]);
        }
        offset += 2; // attribute byte count

        triangles.push({ normal: [nx, ny, nz], vertices: verts });
    }

    return triangles;
}

// ============================================================
// Build indexed geometry — deduplicate vertices by position+normal
// Uses quantized keys for efficient deduplication
// ============================================================
function buildIndexedGeometry(triangles) {
    const PRECISION = 1e6; // 6 decimal places
    const vertexMap = new Map();
    const positions = [];
    const normals = [];
    const indices = [];
    let nextIndex = 0;

    for (const tri of triangles) {
        for (const vert of tri.vertices) {
            // Quantize to avoid floating point comparison issues
            const key = `${Math.round(vert[0] * PRECISION)},${Math.round(vert[1] * PRECISION)},${Math.round(vert[2] * PRECISION)},${Math.round(tri.normal[0] * PRECISION)},${Math.round(tri.normal[1] * PRECISION)},${Math.round(tri.normal[2] * PRECISION)}`;

            if (vertexMap.has(key)) {
                indices.push(vertexMap.get(key));
            } else {
                vertexMap.set(key, nextIndex);
                indices.push(nextIndex);
                positions.push(vert[0], vert[1], vert[2]);
                normals.push(tri.normal[0], tri.normal[1], tri.normal[2]);
                nextIndex++;
            }
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: nextIndex <= 65535
            ? new Uint16Array(indices)   // Use 16-bit indices when possible (smaller)
            : new Uint32Array(indices),
        indexIs16Bit: nextIndex <= 65535,
        vertexCount: nextIndex,
        triangleCount: triangles.length,
    };
}

// ============================================================
// Build GLB binary (glTF 2.0) with indexed geometry
// ============================================================
function buildGLB(geo) {
    const { positions, normals, indices, indexIs16Bit, vertexCount } = geo;

    // Compute bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        minX = Math.min(minX, positions[i]);
        minY = Math.min(minY, positions[i + 1]);
        minZ = Math.min(minZ, positions[i + 2]);
        maxX = Math.max(maxX, positions[i]);
        maxY = Math.max(maxY, positions[i + 1]);
        maxZ = Math.max(maxZ, positions[i + 2]);
    }

    // Build binary buffer: indices | positions | normals
    const idxBuffer = Buffer.from(indices.buffer);
    const posBuffer = Buffer.from(positions.buffer);
    const normBuffer = Buffer.from(normals.buffer);

    // Pad index buffer to 4-byte boundary
    const idxPad = (4 - (idxBuffer.length % 4)) % 4;
    const paddedIdxBuffer = idxPad > 0
        ? Buffer.concat([idxBuffer, Buffer.alloc(idxPad, 0)])
        : idxBuffer;

    const binBuffer = Buffer.concat([paddedIdxBuffer, posBuffer, normBuffer]);

    // Pad to 4-byte alignment
    const binPad = (4 - (binBuffer.length % 4)) % 4;
    const paddedBinBuffer = binPad > 0
        ? Buffer.concat([binBuffer, Buffer.alloc(binPad, 0)])
        : binBuffer;

    const gltf = {
        asset: { version: "2.0", generator: "grace-stl-converter" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{
            primitives: [{
                attributes: { POSITION: 1, NORMAL: 2 },
                indices: 0,
                material: 0,
            }],
        }],
        materials: [{
            pbrMetallicRoughness: {
                baseColorFactor: [0.3, 0.2, 0.4, 1.0],
                metallicFactor: 0.3,
                roughnessFactor: 0.7,
            },
        }],
        accessors: [
            // 0: indices
            {
                bufferView: 0,
                componentType: indexIs16Bit ? 5123 : 5125, // UNSIGNED_SHORT or UNSIGNED_INT
                count: indices.length,
                type: "SCALAR",
            },
            // 1: positions
            {
                bufferView: 1,
                componentType: 5126,
                count: vertexCount,
                type: "VEC3",
                min: [minX, minY, minZ],
                max: [maxX, maxY, maxZ],
            },
            // 2: normals
            {
                bufferView: 2,
                componentType: 5126,
                count: vertexCount,
                type: "VEC3",
            },
        ],
        bufferViews: [
            // 0: indices
            {
                buffer: 0,
                byteOffset: 0,
                byteLength: idxBuffer.length,
                target: 34963, // ELEMENT_ARRAY_BUFFER
            },
            // 1: positions
            {
                buffer: 0,
                byteOffset: paddedIdxBuffer.length,
                byteLength: posBuffer.length,
                target: 34962, // ARRAY_BUFFER
            },
            // 2: normals
            {
                buffer: 0,
                byteOffset: paddedIdxBuffer.length + posBuffer.length,
                byteLength: normBuffer.length,
                target: 34962,
            },
        ],
        buffers: [{ byteLength: paddedBinBuffer.length }],
    };

    const jsonString = JSON.stringify(gltf);
    const jsonBuffer = Buffer.from(jsonString, "utf8");
    const jsonPad = (4 - (jsonBuffer.length % 4)) % 4;
    const paddedJsonBuffer = jsonPad > 0
        ? Buffer.concat([jsonBuffer, Buffer.alloc(jsonPad, 0x20)])
        : jsonBuffer;

    const totalLength = 12 + 8 + paddedJsonBuffer.length + 8 + paddedBinBuffer.length;
    const glb = Buffer.alloc(totalLength);
    let off = 0;

    // GLB Header
    glb.writeUInt32LE(0x46546C67, off); off += 4; // "glTF"
    glb.writeUInt32LE(2, off); off += 4;
    glb.writeUInt32LE(totalLength, off); off += 4;

    // JSON chunk
    glb.writeUInt32LE(paddedJsonBuffer.length, off); off += 4;
    glb.writeUInt32LE(0x4E4F534A, off); off += 4; // "JSON"
    paddedJsonBuffer.copy(glb, off); off += paddedJsonBuffer.length;

    // BIN chunk
    glb.writeUInt32LE(paddedBinBuffer.length, off); off += 4;
    glb.writeUInt32LE(0x004E4942, off); off += 4; // "BIN\0"
    paddedBinBuffer.copy(glb, off);

    return glb;
}

// ============================================================
// Main
// ============================================================
function main() {
    console.log("🔄 Converting STL → GLB (with vertex deduplication)...\n");

    const files = readdirSync(MODELS_DIR).filter(
        (f) => extname(f).toLowerCase() === ".stl"
    );

    if (files.length === 0) {
        console.log("  No STL files found in", MODELS_DIR);
        return;
    }

    console.log(`  Found ${files.length} STL files\n`);

    let totalStlSize = 0;
    let totalGlbSize = 0;

    for (const file of files) {
        const name = basename(file, extname(file));
        const stlPath = join(MODELS_DIR, file);
        const glbPath = join(MODELS_DIR, `${name}.glb`);

        try {
            const stlData = readFileSync(stlPath);
            const stlSize = stlData.length;
            totalStlSize += stlSize;

            const triangles = parseBinarySTL(stlData);
            const geo = buildIndexedGeometry(triangles);
            const glb = buildGLB(geo);
            writeFileSync(glbPath, glb);

            const glbSize = glb.length;
            totalGlbSize += glbSize;

            const stlMB = (stlSize / 1024 / 1024).toFixed(2);
            const glbMB = (glbSize / 1024 / 1024).toFixed(2);
            const ratio = ((1 - glbSize / stlSize) * 100).toFixed(1);
            const dedup = `${geo.triangleCount * 3} → ${geo.vertexCount} verts`;

            console.log(`  ✅ ${file.padEnd(32)} ${stlMB} MB → ${glbMB} MB  (${ratio}% smaller)  [${dedup}]`);
        } catch (err) {
            console.error(`  ❌ ${file}: ${err.message}`);
        }
    }

    console.log(`\n  Total: ${(totalStlSize / 1024 / 1024).toFixed(2)} MB → ${(totalGlbSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Reduction: ${((1 - totalGlbSize / totalStlSize) * 100).toFixed(1)}%`);
    console.log("\n✨ Done! GLB files saved to public/models/");
}

main();
