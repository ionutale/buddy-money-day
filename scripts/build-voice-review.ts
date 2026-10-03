import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const linesPath = resolve(root, 'voice/lines.json');
const clipDir = resolve(root, 'static/voice');
const reviewDir = resolve(root, 'voice/review');
const pagePath = resolve(reviewDir, 'index.html');
const reelPath = resolve(reviewDir, 'reel.mp3');

interface Line {
	id: string;
	text: string;
}

interface Clip {
	id: string;
	text: string;
	path: string;
	present: boolean;
}

const lines = JSON.parse(readFileSync(linesPath, 'utf8')) as Line[];
const clips: Clip[] = lines.map(({ id, text }) => {
	const path = resolve(clipDir, `${id}.mp3`);
	return { id, text, path, present: existsSync(path) && statSync(path).size > 0 };
});
const missing = clips.filter((clip) => !clip.present);

mkdirSync(reviewDir, { recursive: true });

// --- reel.mp3 (only when every clip exists) ---------------------------------
let reelStatus: string;
if (missing.length > 0) {
	reelStatus = `skipped — ${missing.length} of ${clips.length} clips missing`;
	console.warn(`voice:review — WARNING: skipping voice/review/reel.mp3, ${missing.length} clip(s) missing`);
} else {
	let ok = false;
	try {
		ok = buildReel(clips.map((clip) => clip.path));
	} catch (error) {
		console.warn(`voice:review — WARNING: reel build failed: ${(error as Error).message}`);
	}
	reelStatus = ok ? 'built' : 'failed — see warnings above';
}

// --- index.html (always) ----------------------------------------------------
writeFileSync(pagePath, renderPage(clips, reelStatus));
console.log(
	`voice:review — ${clips.length} fragments (${clips.length - missing.length} present, ` +
		`${missing.length} missing) → voice/review/index.html, reel ${reelStatus}`
);
process.exit(0);

// ---------------------------------------------------------------------------

function buildReel(paths: string[]): boolean {
	if (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status !== 0) {
		console.warn('voice:review — WARNING: ffmpeg not found, skipping voice/review/reel.mp3');
		return false;
	}

	const silencePath = resolve(reviewDir, '.reel-silence.mp3');
	const listPath = resolve(reviewDir, '.reel-concat.txt');
	try {
		const { rate, channels } = probe(paths[0]) ?? { rate: '44100', channels: '2' };
		const layout = channels === '1' ? 'mono' : 'stereo';
		if (
			!run('ffmpeg', [
				'-y',
				'-f',
				'lavfi',
				'-i',
				`anullsrc=r=${rate}:cl=${layout}`,
				'-t',
				'0.3',
				'-c:a',
				'libmp3lame',
				'-b:a',
				'96k',
				silencePath
			])
		) {
			console.warn('voice:review — WARNING: could not render the inter-clip silence file');
			return false;
		}

		const quoted = (path: string) => `file '${path.replace(/'/g, "'\\''")}'`;
		const entries: string[] = [];
		paths.forEach((path, index) => {
			if (index > 0) entries.push(quoted(silencePath));
			entries.push(quoted(path));
		});
		writeFileSync(listPath, entries.join('\n') + '\n');

		const concat = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath];
		if (run('ffmpeg', [...concat, '-c', 'copy', reelPath])) return true;
		console.warn('voice:review — WARNING: stream copy failed, re-encoding with libmp3lame 96k');
		if (run('ffmpeg', [...concat, '-c:a', 'libmp3lame', '-b:a', '96k', reelPath])) return true;
		console.warn('voice:review — WARNING: ffmpeg could not build voice/review/reel.mp3');
		return false;
	} finally {
		for (const path of [silencePath, listPath]) {
			if (existsSync(path)) unlinkSync(path);
		}
	}
}

function probe(path: string): { rate: string; channels: string } | null {
	const result = spawnSync(
		'ffprobe',
		['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', path],
		{ encoding: 'utf8' }
	);
	if (result.status !== 0) return null;
	const [rate, channels] = result.stdout.trim().split(',');
	if (!rate || !channels) return null;
	return { rate, channels };
}

function run(command: string, args: string[]): boolean {
	const result = spawnSync(command, args, { encoding: 'utf8' });
	return result.status === 0;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderPage(clips: Clip[], reelStatus: string): string {
	const missing = clips.filter((clip) => !clip.present);
	const blocks = clips
		.map((clip, index) => {
			const marker = clip.present
				? ''
				: `\n\t\t\t<p class="missing">&#9888; missing clip</p>`;
			return `\t\t<article class="clip${clip.present ? '' : ' is-missing'}">
\t\t\t<h2>${index + 1}. <code>${escapeHtml(clip.id)}</code></h2>
\t\t\t<p class="text">${escapeHtml(clip.text)}</p>${marker}
\t\t\t<audio controls preload="none" src="../../static/voice/${escapeHtml(clip.id)}.mp3"></audio>
\t\t</article>`;
		})
		.join('\n');

	return `<!doctype html>
<html lang="en">
<head>
\t<meta charset="utf-8" />
\t<meta name="viewport" content="width=device-width, initial-scale=1" />
\t<title>Voice review — ${clips.length} fragments</title>
\t<style>
\t\t:root { color-scheme: light dark; }
\t\tbody { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 46rem; padding: 1.5rem 1rem 4rem; }
\t\th1 { font-size: 1.5rem; margin-bottom: .25rem; }
\t\t.meta { color: #666; font-size: .95rem; }
\t\t.meta b.miss { color: #c0392b; }
\t\t.clip { border: 1px solid rgba(128,128,128,.4); border-radius: 8px; padding: .75rem 1rem; margin: .75rem 0; }
\t\t.clip.is-missing { border-color: #c0392b; background: rgba(192,57,43,.07); }
\t\t.clip h2 { font-size: 1rem; margin: 0 0 .35rem; font-weight: 600; }
\t\t.clip .text { margin: 0 0 .5rem; }
\t\t.clip code { font-size: .9em; opacity: .7; }
\t\t.missing { color: #c0392b; font-weight: 700; margin: .25rem 0 .5rem; }
\t\taudio { width: 100%; }
\t</style>
</head>
<body>
\t<header>
\t\t<h1>Voice review</h1>
\t\t<p class="meta">${clips.length} fragments &middot; ${clips.length - missing.length} present &middot; <b class="miss">${missing.length} missing</b> &middot; reel.mp3: ${escapeHtml(reelStatus)}</p>
\t</header>
\t<main>
${blocks}
\t</main>
</body>
</html>
`;
}
