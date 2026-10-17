#!/bin/bash
set -euo pipefail

# Only run on Claude Code Remote sessions
# Direnv will handle the local environment setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install pixi if not already installed.
# We use the double check to avoid polluting the PATH with duplicates.
if ! command -v pixi >/dev/null 2>&1; then
  export PATH="$HOME/.pixi/bin:$PATH"
  if ! command -v pixi >/dev/null 2>&1; then
    export PIXI_NO_PATH_UPDATE=1
    curl -fsSL https://pixi.sh/install.sh | sh
  fi
fi

# Ensure that the pixi bin directory is in the PATH for all shells Claude Code starts.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qs '.pixi/bin' "$CLAUDE_ENV_FILE"; then
  echo 'export PATH="$HOME/.pixi/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

# Activate the pixi environment for all shells Claude Code starts, mirroring .envrc's direnv setup.
# Capture the output first so that a failure doesn't leave a marker without an activation script.
# The marker names the environment so that a bare "# pixi shell-hook" marker, left behind by
# earlier versions of this hook after a failed activation, doesn't count as activated.
pixi_marker="# pixi shell-hook"
if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qsxF "$pixi_marker" "$CLAUDE_ENV_FILE"; then
  pixi_shell_hook="$(pixi shell-hook --shell bash")"
  {
    echo "$pixi_marker"
    echo "$pixi_shell_hook"
  } >> "$CLAUDE_ENV_FILE"
fi

# Installing for the claude target alone rewrites apm.lock.yaml without the other targets' deployments.
# Put the file back exactly as it was afterwards, so that it isn't committed by accident
# and so that any edits made before the session started aren't lost.
repo_root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
apm_lock="$repo_root/apm.lock.yaml"
apm_lock_backup="$(mktemp)"
cp -- "$apm_lock" "$apm_lock_backup"
restore_apm_lock() {
  cp -- "$apm_lock_backup" "$apm_lock"
  rm -f -- "$apm_lock_backup"
}
trap restore_apm_lock EXIT

APM_TARGET=claude pixi run task init
