#!/usr/bin/env bash
set -euo pipefail

for name in SSH_HOST SSH_USER SSH_PRIVATE_KEY SSH_KNOWN_HOSTS DEPLOY_PATH; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Required deployment setting is missing: $name"
    exit 1
  fi
done

SSH_PORT="${SSH_PORT:-22}"
PRODUCTION_URL="${PRODUCTION_URL:-}"
PRODUCTION_RESOLVE="${PRODUCTION_RESOLVE:-}"

[[ "$SSH_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Invalid SSH_HOST: use a hostname or IPv4 address.' >&2; exit 1; }
[[ "$SSH_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || { echo 'Invalid SSH_USER.' >&2; exit 1; }
[[ "$SSH_PORT" =~ ^[0-9]{1,5}$ ]] && (( 10#$SSH_PORT >= 1 && 10#$SSH_PORT <= 65535 )) || { echo 'Invalid SSH_PORT.' >&2; exit 1; }
[[ "$DEPLOY_PATH" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo 'DEPLOY_PATH must be an absolute directory without spaces.' >&2; exit 1; }
DEPLOY_PATH="${DEPLOY_PATH%/}"
case "$DEPLOY_PATH/" in
  //|*/./*|*/../*|*//*) echo 'DEPLOY_PATH must be a dedicated website directory, not / or a relative path.' >&2; exit 1 ;;
esac
if [[ -n "$PRODUCTION_URL" && ! "$PRODUCTION_URL" =~ ^https?:// ]]; then
  echo 'PRODUCTION_URL must start with http:// or https://.' >&2
  exit 1
fi
test -s dist/index.html

ssh_dir="$(mktemp -d)"
trap 'rm -f "$ssh_dir/key" "$ssh_dir/known_hosts" "$ssh_dir/config"; rmdir "$ssh_dir"' EXIT
chmod 700 "$ssh_dir"
printf '%s\n' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$ssh_dir/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" | tr -d '\r' > "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/key" "$ssh_dir/known_hosts"
ssh-keygen -y -P '' -f "$ssh_dir/key" > /dev/null

cat > "$ssh_dir/config" <<EOF
Host production-target
  HostName $SSH_HOST
  User $SSH_USER
  Port $SSH_PORT
  IdentityFile $ssh_dir/key
  UserKnownHostsFile $ssh_dir/known_hosts
  IdentitiesOnly yes
  BatchMode yes
  StrictHostKeyChecking yes
  ConnectTimeout 15
  ConnectionAttempts 2
EOF
chmod 600 "$ssh_dir/config"

# The destination must already exist, be writable, and resolve outside /.
ssh -F "$ssh_dir/config" production-target \
  "set -eu; resolved=\$(realpath -e -- '$DEPLOY_PATH'); test \"\$resolved\" != /; test -d \"\$resolved\"; test -w \"\$resolved\"; command -v rsync > /dev/null"

rsync --archive --compress --no-owner --no-group \
  --delay-updates --delete-delay --chmod=D755,F644 \
  --exclude='/.well-known/' \
  -e "ssh -F $ssh_dir/config" \
  dist/ "production-target:$DEPLOY_PATH/"

if [[ -n "$PRODUCTION_URL" ]]; then
  curl_options=()
  if [[ -n "$PRODUCTION_RESOLVE" ]]; then
    curl_options+=(--resolve "$PRODUCTION_RESOLVE")
  fi
  curl --fail --silent --show-error --location \
    --retry 5 --retry-delay 2 --retry-all-errors \
    --connect-timeout 10 --max-time 30 \
    "${curl_options[@]}" \
    --output /dev/null "$PRODUCTION_URL"
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '### Production deployment completed\n\nRevision: `%s`\n' "${GITHUB_SHA:-local}" >> "$GITHUB_STEP_SUMMARY"
fi
