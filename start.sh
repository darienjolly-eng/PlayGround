#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
BUILD_DIR="$PROJECT_DIR/dist"

[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "PORT must be numeric: $PORT" >&2; exit 1; }
/usr/bin/time -p mkdir -p "$BUILD_DIR" "$OPENCODE_WEB_DIR"
# This is a dependency-free static HTML project; copying the entry point is its build step.
/usr/bin/time -p cp "$PROJECT_DIR/index.html" "$BUILD_DIR/index.html"
/usr/bin/time -p node -e 'const fs=require("node:fs"); const p=process.argv[1]; const value={project:process.argv[2],directory:process.argv[3]}; fs.writeFileSync(p,JSON.stringify(value)+"\n")' "$OPENCODE_WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$BUILD_DIR"
cd "$BUILD_DIR"
echo "Serving $BUILD_DIR on 0.0.0.0:$PORT"
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0
