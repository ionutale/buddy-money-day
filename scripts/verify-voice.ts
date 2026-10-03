import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const linesPath = resolve(root, 'voice/lines.json');
const clipDir = resolve(root, 'static/voice');
const manifestPath = resolve(clipDir, 'manifest.json');

interface Line {
	id: string;
	text: string;
}

interface ManifestRow {
	id: string;
	text: string;
	bytes: number;
	duration: number;
	sha256: string;
}

const MAX_SHOWN = 5;
const problems: string[] = [];
const warnings: string[] = [];

let lines: Line[] = [];
let manifestRows: ManifestRow[] = [];
let clipsPresent = 0;
let orphanCount = 0;

function readJsonArray<T>(path: string): T[] | null {
	try {
		const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
		if (!Array.isArray(data)) {
			problems.push(`not a JSON array: ${path}`);
			return null;
		}
		return data as T[];
	} catch (error) {
		problems.push(`unreadable JSON in ${path}: ${(error as Error).message}`);
		return null;
	}
}

function sha256(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function report(): void {
	console.log('voice:verify — checking pre-recorded voice pack');
	console.log(`  fragments in voice/lines.json : ${lines.length}`);
	console.log(`  clips present in static/voice : ${clipsPresent}/${lines.length}`);
	console.log(`  missing clips                 : ${lines.length - clipsPresent}`);
	console.log(`  manifest rows                 : ${manifestRows.length}`);
	console.log(`  orphan clips                  : ${orphanCount}`);
	console.log(`  problems                      : ${problems.length}`);
	console.log(`  warnings                      : ${warnings.length}`);

	if (warnings.length > 0) {
		console.log('');
		console.log(`WARN — ${warnings.length} warning(s):`);
		for (const warning of warnings.slice(0, MAX_SHOWN)) console.log(`  - ${warning}`);
		if (warnings.length > MAX_SHOWN) {
			console.log(`  ...and ${warnings.length - MAX_SHOWN} more`);
		}
	}

	if (problems.length > 0) {
		console.log('');
		console.log(`FAILED — ${problems.length} problem(s):`);
		for (const problem of problems.slice(0, MAX_SHOWN)) console.log(`  - ${problem}`);
		if (problems.length > MAX_SHOWN) console.log(`  ...and ${problems.length - MAX_SHOWN} more`);
	} else {
		console.log('');
		console.log('OK — voice pack is complete and matches the manifest.');
	}
}

// --- voice/lines.json -------------------------------------------------------
const parsedLines = readJsonArray<Line>(linesPath);
lines = parsedLines ?? [];
if (parsedLines === null) {
	report();
	process.exit(problems.length > 0 ? 1 : 0);
}

// --- 1. every fragment has a non-empty clip --------------------------------
const clipIds = new Set<string>(lines.map(({ id }) => id));
for (const { id, text } of lines) {
	const clip = resolve(clipDir, `${id}.mp3`);
	if (!existsSync(clip)) {
		problems.push(`missing clip for ${id}: static/voice/${id}.mp3 (${JSON.stringify(text)})`);
		continue;
	}
	if (statSync(clip).size === 0) {
		problems.push(`empty clip for ${id}: static/voice/${id}.mp3`);
		continue;
	}
	clipsPresent += 1;
}

// --- 2. manifest exists, matches the id set, matches the files --------------
let manifestLoaded = false;
if (!existsSync(manifestPath)) {
	problems.push('missing manifest: static/voice/manifest.json');
} else {
	const manifest = readJsonArray<ManifestRow>(manifestPath);
	if (manifest !== null) {
		manifestRows = manifest;
		manifestLoaded = true;
	}
}

if (manifestLoaded) {
	const byId = new Map<string, ManifestRow>();
	for (const row of manifestRows) {
		if (byId.has(row.id)) {
			problems.push(`duplicate manifest row for ${row.id}`);
			continue;
		}
		byId.set(row.id, row);
	}

	for (const { id } of lines) {
		if (!byId.has(id)) problems.push(`manifest row missing for ${id}`);
	}
	for (const id of byId.keys()) {
		if (!clipIds.has(id)) problems.push(`manifest row has no matching fragment: ${id}`);
	}

	for (const [id, row] of byId) {
		if (!clipIds.has(id)) continue;
		const clip = resolve(clipDir, `${id}.mp3`);
		if (!existsSync(clip)) continue; // already reported as a missing clip
		const bytes = statSync(clip).size;
		if (row.bytes !== bytes) {
			problems.push(`bytes mismatch for ${id}: manifest ${row.bytes}, file ${bytes}`);
		}
		const digest = sha256(clip);
		if (row.sha256 !== digest) {
			problems.push(`sha256 mismatch for ${id}: manifest ${row.sha256}, file ${digest}`);
		}
	}
}

// --- 3. orphan clips are a warning, not a failure ---------------------------
if (existsSync(clipDir)) {
	for (const name of readdirSync(clipDir)) {
		if (!name.endsWith('.mp3')) continue;
		if (clipIds.has(name.slice(0, -4))) continue;
		orphanCount += 1;
		warnings.push(`orphan clip not in lines.json: ${name}`);
	}
}

report();
process.exit(problems.length > 0 ? 1 : 0);
