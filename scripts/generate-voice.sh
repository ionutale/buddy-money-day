#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"
studio="${STUDIO_DIR:-/Users/ionutale/developer-playground/qwen3-tts-mlx-studio}"

exec "${studio}/.venv/bin/python" "${studio}/game_voice/generate_lines.py" \
	--lines "${repo_root}/voice/lines.json" \
	--speaker uncle_fu \
	--language English \
	--out "${repo_root}/static/voice" \
	--format mp3 \
	--bitrate 96 \
	"$@"
