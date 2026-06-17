#!/usr/bin/env bash
# Keep deployment credentials out of command traces even if invoked with `bash -x`.
set +x
set -euo pipefail

usage() {
	cat <<'EOF'
Usage: scripts/deploy-web.sh [--dry-run] [--skip-checks]

Build and deploy the SvelteKit site in web/ to Cloudflare Workers using
web/wrangler.jsonc.

This script does not accept credentials as arguments. Authenticate Wrangler
out-of-band with local credentials or a private environment secret.

Options:
  --dry-run       Build and run Wrangler's dry-run deploy without uploading.
  --skip-checks   Skip local Svelte/design/theme checks before building.
  -h, --help      Show this help.
EOF
}

dry_run=0
skip_checks=0

while [ "$#" -gt 0 ]; do
	case "$1" in
		--dry-run)
			dry_run=1
			;;
		--skip-checks)
			skip_checks=1
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			printf '%s\n\n' 'Unknown option. This script does not accept credentials or positional arguments.' >&2
			usage >&2
			exit 2
			;;
	esac
	shift
done

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
web_dir="$repo_root/web"

if ! command -v bun >/dev/null 2>&1; then
	printf '%s\n' 'bun is required to build and deploy this site.' >&2
	exit 1
fi

cd "$web_dir"

if [ ! -d node_modules ]; then
	bun install --frozen-lockfile
fi

wrangler="$web_dir/node_modules/.bin/wrangler"
if [ ! -x "$wrangler" ]; then
	printf '%s\n' 'Wrangler is missing from web/node_modules; run bun install --frozen-lockfile.' >&2
	exit 1
fi

case "${WRANGLER_LOG:-}" in
	debug|trace)
		printf '%s\n' 'Refusing to deploy with WRANGLER_LOG=debug/trace; verbose Wrangler logs can expose request metadata.' >&2
		exit 1
		;;
esac

branch=$(git -C "$repo_root" branch --show-current 2>/dev/null || true)
sha=$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || true)
printf 'Deploying web from %s%s\n' "${branch:-detached}" "${sha:+@$sha}"

if ! git -C "$repo_root" diff --quiet --ignore-submodules -- || \
	! git -C "$repo_root" diff --cached --quiet --ignore-submodules --; then
	printf '%s\n' 'Warning: working tree has uncommitted changes; deploying local contents.' >&2
fi

if [ "$skip_checks" -eq 0 ]; then
	bun run check
	bun run test:design
	bun run test:social
	bun run test:theme:static
fi

bun run build

if [ "$dry_run" -eq 1 ]; then
	"$wrangler" deploy --dry-run
else
	"$wrangler" deploy

	if command -v curl >/dev/null 2>&1; then
		printf '\nPublic status checks:\n'
		for url in \
			http://recursivecodingagents.com \
			http://www.recursivecodingagents.com \
			https://recursivecodingagents.com \
			https://www.recursivecodingagents.com
		do
			status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url" 2>/dev/null || true)
			if [ -z "$status" ] || [ "$status" = "000" ]; then
				status="unreachable"
			fi
			printf '  %s %s\n' "$status" "$url"
		done
	fi
fi
