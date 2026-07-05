#!/usr/bin/env node
// Generate public/lib/cache-manifest.json — a versioned, complete mirror of the
// static /lib/xetex file set:  { version, files: [{cacheKey, endpoint}] }.
// cacheKey "<format>/<name>" is exactly the key the engine's kpse lookup computes
// and the URL it fetches. `version` is a content hash of the whole set; the runtime
// (app/lib/swiftlatexPrewarm.ts) keys its IndexedDB durable cache on it, so changing
// any file invalidates the cache and triggers a one-time re-fetch on next load.
//
// Run from the repo root:  node vendor/gen-cache-manifest.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = fileURLToPath(new URL('../public/lib/xetex', import.meta.url));
const OUT = fileURLToPath(new URL('../public/lib/cache-manifest.json', import.meta.url));

function walk(dir) {
    const out = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(full));
        else if (ent.isFile()) out.push(full);
    }
    return out;
}

const paths = walk(ROOT).sort();
const hash = createHash('sha256');
const files = [];
for (const p of paths) {
    const cacheKey = relative(ROOT, p);
    hash.update(cacheKey);
    hash.update(readFileSync(p)); // content-hash so a changed file bumps the version
    files.push({ cacheKey, endpoint: 'xetex/' });
}
const version = hash.digest('hex').slice(0, 16);
writeFileSync(OUT, JSON.stringify({ version, files }) + '\n');
console.error(`Wrote ${files.length} entries (version ${version}) to ${OUT}`);
