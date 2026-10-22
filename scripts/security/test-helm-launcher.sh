#!/bin/bash

set -euo pipefail

# Agent-runnable. Never decrypts anything and never prompts for a passphrase.
# Plan: docs/helm-secrets-encryption-plan.md §3.5. Modelled on Orb's
# scripts/security/test-orb-launcher.sh.

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

# `! cmd` never trips `set -e` (bash ignores the status of a negated command),
# so every must-not-succeed check goes through this instead.
must_not() {
  if "$@" >/dev/null 2>&1; then
    printf 'FAIL: expected to fail but succeeded: %s\n' "$*" >&2
    exit 1
  fi
}

/bin/bash -n "$repo_root/scripts/security/helm-dev"
/bin/bash -n "$repo_root/scripts/security/helm-secrets-seal"
/bin/bash -n "$repo_root/scripts/security/helm-secrets-set"

# helm-secrets-seal calls main unconditionally, so it is checked by text only.
source "$repo_root/scripts/security/helm-dev"
source "$repo_root/scripts/security/helm-secrets-set"

[[ "$(mode_of "$repo_root/package.json")" =~ ^[0-7]{3,4}$ ]]
[[ "$(printf 'ALPHA=old\nBETA=keep\n' | replace_value ALPHA new)" == $'ALPHA=new\nBETA=keep' ]]
[[ "$(printf 'ALPHA=keep\n' | replace_value ANTHROPIC_API_KEY new)" == $'ALPHA=keep\nANTHROPIC_API_KEY=new' ]]
[[ "$(printf 'ALPHA=old\nBETA=keep\n' | remove_value ALPHA)" == 'BETA=keep' ]]
is_allowed_name ANTHROPIC_API_KEY
is_removable_name ANTHROPIC_API_KEY
is_removable_name BYPASS_AUTH_USER_ID
must_not is_allowed_name BYPASS_AUTH_USER_ID

# ------------------------------------------------------------------
# Required names (Stan, 2026-10-21): ANTHROPIC_API_KEY optional,
# BYPASS_AUTH_USER_ID not required. helm-dev and helm-secrets-seal must agree.
# ------------------------------------------------------------------
for name in "${required_environment[@]}"; do
  /usr/bin/grep -qx "  $name" "$repo_root/scripts/security/helm-secrets-seal" || {
    printf 'FAIL: helm-secrets-seal does not require %s\n' "$name" >&2
    exit 1
  }
done
for name in ANTHROPIC_API_KEY BYPASS_AUTH_USER_ID; do
  for required in "${required_environment[@]}"; do
    [[ "$required" != "$name" ]] || { printf 'FAIL: helm-dev requires %s\n' "$name" >&2; exit 1; }
  done
done

# ------------------------------------------------------------------
# Development-account roots. The admin home appears only in helm-dev's printed
# re-issue instruction, never as a path a launcher reads or writes.
# ------------------------------------------------------------------
[[ "$HELM_PROJECT_ROOT" == "/Users/developer/Projects/helm" ]]
[[ "$HELM_SECRET_ROOT" == "/Users/developer/Project-secrets" ]]
[[ "$HELM_SECRET_FILE" == "/Users/developer/Project-secrets/helm-secrets/helm.env.enc" ]]
[[ "$HELM_TLS_DIR" == "/Users/developer/Project-secrets/helm-secrets/tls" ]]
for name in helm-secrets-seal helm-secrets-set; do
  /usr/bin/grep -qx 'readonly secret_root="/Users/developer/Project-secrets"' "$repo_root/scripts/security/$name"
  /usr/bin/grep -qx 'readonly secret_dir="$secret_root/helm-secrets"' "$repo_root/scripts/security/$name"
  must_not /usr/bin/grep -q '/Users/stanleybaptista' "$repo_root/scripts/security/$name"
done
[[ "$(/usr/bin/grep -c '/Users/stanleybaptista' "$repo_root/scripts/security/helm-dev")" == "1" ]]
/usr/bin/grep -qx 'readonly HELM_TLS_ADMIN_STAGING="/Users/stanleybaptista/Release/helm-tls"' "$repo_root/scripts/security/helm-dev"
# Nothing Orb's: a Helm launcher must never touch Orb's store.
must_not /usr/bin/grep -q 'orb-secrets\|orb\.env\.enc' "$repo_root/scripts/security/helm-dev" "$repo_root/scripts/security/helm-secrets-seal" "$repo_root/scripts/security/helm-secrets-set"

# ------------------------------------------------------------------
# TLS: verify only. The mkcert CA stays in the admin account, so helm-dev
# must never issue a leaf, and devices use the Bonjour name only.
# ------------------------------------------------------------------
must_not /usr/bin/grep -Eq 'ipconfig|getifaddr|route -n|HELM_DEV_IP|hosts\.txt|mkcert_bin' "$repo_root/scripts/security/helm-dev"
# mkcert appears only in comments and inside the printed admin-side command.
[[ -z "$(/usr/bin/grep -n 'mkcert' "$repo_root/scripts/security/helm-dev" | /usr/bin/grep -v -E '^[0-9]+:[[:space:]]*#' | /usr/bin/grep -v 'mkcert CA lives' | /usr/bin/grep -v 'HELM_TLS_ADMIN_STAGING/helm-dev.pem -key-file')" ]]

work_tmp="$(/usr/bin/mktemp -d)"
trap '/bin/rm -rf "$work_tmp"' EXIT
HELM_DEV_MDNS_HOST="test-host.local"
HELM_DEV_LOCAL_HOSTNAME="Test-Host"

make_leaf() {
  local name="$1" days="$2" sans="$3"
  /opt/homebrew/bin/openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout "$work_tmp/$name-key.pem" -out "$work_tmp/$name.pem" -days "$days" -subj "/CN=$name" \
    -addext "subjectAltName=$sans" >/dev/null 2>&1
  /bin/chmod 600 "$work_tmp/$name.pem" "$work_tmp/$name-key.pem"
}

tls_must_fail() {
  local label="$1" cert="$2" key="$3" expected="$4" output=""
  if output="$(verify_tls_certificate "$cert" "$key" 2>&1)"; then
    printf 'FAIL: TLS check accepted %s\n' "$label" >&2
    exit 1
  fi
  [[ "$output" == *"$expected"* ]] || { printf 'FAIL: TLS check for %s did not say: %s\n%s\n' "$label" "$expected" "$output" >&2; exit 1; }
  [[ "$output" == *"re-issued from the admin account"* ]] || { printf 'FAIL: TLS check for %s gave no re-issue instruction\n' "$label" >&2; exit 1; }
  [[ "$output" == *"mkcert -cert-file"*"localhost 127.0.0.1 ::1 Test-Host.local"* ]] || { printf 'FAIL: TLS check for %s gave no exact mkcert command\n' "$label" >&2; exit 1; }
}

full_sans="DNS:localhost,IP:127.0.0.1,IP:::1,DNS:Test-Host.local"
make_leaf good 30 "$full_sans"
make_leaf extra 30 "$full_sans,IP:192.168.86.90"
make_leaf no-bonjour 30 "DNS:localhost,IP:127.0.0.1,IP:::1"
make_leaf no-ipv6 30 "DNS:localhost,IP:127.0.0.1,DNS:test-host.local"
make_leaf expiring 2 "$full_sans"

( verify_tls_certificate "$work_tmp/good.pem" "$work_tmp/good-key.pem" )
( verify_tls_certificate "$work_tmp/extra.pem" "$work_tmp/extra-key.pem" )
tls_must_fail "a leaf without the Bonjour name" "$work_tmp/no-bonjour.pem" "$work_tmp/no-bonjour-key.pem" "does not cover: dns:test-host.local"
tls_must_fail "a leaf without ::1" "$work_tmp/no-ipv6.pem" "$work_tmp/no-ipv6-key.pem" "does not cover: ip address:0:0:0:0:0:0:0:1"
tls_must_fail "a leaf expiring within 7 days" "$work_tmp/expiring.pem" "$work_tmp/expiring-key.pem" "expires within 7 days"
tls_must_fail "a key from another leaf" "$work_tmp/good.pem" "$work_tmp/extra-key.pem" "key does not match"
tls_must_fail "a missing leaf" "$work_tmp/absent.pem" "$work_tmp/good-key.pem" "certificate is missing"
/bin/chmod 644 "$work_tmp/good.pem"
if ( verify_tls_certificate "$work_tmp/good.pem" "$work_tmp/good-key.pem" ) 2>/dev/null; then
  printf 'FAIL: TLS check accepted a group/other-readable leaf\n' >&2
  exit 1
fi
printf 'TLS verify-only checks passed (2 accepted, 6 rejected).\n'

# ------------------------------------------------------------------
# Plaintext refusal: helm-dev must not start while Next.js could load a
# plaintext env file, whether it is a file or a symlink (today's .env.local is
# a symlink into Project-secrets).
# ------------------------------------------------------------------
fake_root="$work_tmp/project"
/bin/mkdir -p "$fake_root"
( refuse_plaintext_env "$fake_root" )
for name in "${plaintext_env_names[@]}"; do
  printf 'X=1\n' > "$fake_root/$name"
  if ( refuse_plaintext_env "$fake_root" ) 2>/dev/null; then
    printf 'FAIL: helm-dev accepted a plaintext %s file\n' "$name" >&2
    exit 1
  fi
  /bin/rm -f "$fake_root/$name"
  /bin/ln -s "$work_tmp/absent-target" "$fake_root/$name"
  if ( refuse_plaintext_env "$fake_root" ) 2>/dev/null; then
    printf 'FAIL: helm-dev accepted a %s symlink, even a dangling one\n' "$name" >&2
    exit 1
  fi
  /bin/rm -f "$fake_root/$name"
done
printf 'Plaintext refusal checks passed (%d names, file and symlink).\n' "${#plaintext_env_names[@]}"

# ------------------------------------------------------------------
# package.json: plain `npm run dev` must refuse to start without the launcher's
# certificate variables. Checked by text so this test never starts a server.
# ------------------------------------------------------------------
/usr/bin/grep -q 'HELM_DEV_CERT' "$repo_root/package.json"
/usr/bin/grep -q 'start the dev server with /usr/local/helm-bin/helm-dev' "$repo_root/package.json"
must_not /usr/bin/grep -q 'localhost+1' "$repo_root/package.json"

# ------------------------------------------------------------------
# PATH shadowing. Prints each launcher name that the given PATH resolves to
# anything other than the root-owned installed copy.
#
# Limitation: this sees what a non-interactive bash resolves. A zsh function or
# alias in owner-writable ~/.zshrc is invisible to it. The defence is starting
# the server by absolute path: /usr/local/helm-bin/helm-dev.
# ------------------------------------------------------------------
shadowed_launchers() {
  local search_path="$1" name="" resolved=""
  for name in "${expected_launchers[@]}"; do
    resolved="$(PATH="$search_path" /usr/bin/which "$name" 2>/dev/null || true)"
    if [[ -n "$resolved" && "$resolved" != "$installed_dir/$name" ]]; then
      printf '%s -> %s\n' "$name" "$resolved"
    fi
  done
}

# ------------------------------------------------------------------
# Installed launcher integrity, against a manifest that fails closed: a
# missing launcher, a missing directory, wrong owner or mode, drifted bytes and
# an unexpected file are all errors.
#
# Root ownership limits what PATH resolves, not what an agent executes:
# `bash scripts/security/helm-dev` runs the repo copy. What this check buys is
# that a change to the PATH-resolved copy is detected. Not a boundary.
# ------------------------------------------------------------------
installed_dir="/usr/local/helm-bin"
expected_launchers=(helm-dev helm-secrets-seal helm-secrets-set)

# The detector must see a planted copy ahead of the installed one.
shadow_dir="$work_tmp/shadow"
/bin/mkdir -p "$shadow_dir"
printf '#!/bin/bash\necho planted\n' > "$shadow_dir/helm-dev"
/bin/chmod 755 "$shadow_dir/helm-dev"
[[ "$(shadowed_launchers "$shadow_dir:$installed_dir:/usr/bin:/bin")" == "helm-dev -> $shadow_dir/helm-dev" ]] || {
  printf 'FAIL: a PATH-shadowed helm-dev was not detected\n' >&2
  exit 1
}

integrity_errors=()

if [[ ! -d "$installed_dir" ]]; then
  integrity_errors+=("$installed_dir does not exist — no launcher is installed")
else
  for name in "${expected_launchers[@]}"; do
    installed="$installed_dir/$name"
    repo_copy="$repo_root/scripts/security/$name"

    [[ -f "$repo_copy" ]] || { integrity_errors+=("$name: missing from scripts/security"); continue; }
    [[ -f "$installed" ]] || { integrity_errors+=("$name: EXPECTED but not installed in $installed_dir"); continue; }

    owner="$(/usr/bin/stat -f '%Su:%Sg' "$installed")"
    mode="$(/usr/bin/stat -f '%Lp' "$installed")"
    [[ "$owner" == "root:wheel" ]] || integrity_errors+=("$name: owner is $owner, expected root:wheel")
    [[ "$mode" == "755" ]]        || integrity_errors+=("$name: mode is $mode, expected 755")
    /usr/bin/cmp -s "$installed" "$repo_copy" || integrity_errors+=("$name: installed bytes differ from the repository copy")
  done

  for installed in "$installed_dir"/*; do
    [[ -e "$installed" ]] || continue
    name="$(basename "$installed")"
    found=0
    for expected in "${expected_launchers[@]}"; do
      [[ "$name" == "$expected" ]] && found=1
    done
    (( found == 1 )) || integrity_errors+=("$name: INSTALLED BUT NOT EXPECTED — not in the manifest")
  done
fi

if (( ${#integrity_errors[@]} > 0 )); then
  printf '\nFAIL: installed launcher integrity\n\n' >&2
  for e in "${integrity_errors[@]}"; do printf '  ✗ %s\n' "$e" >&2; done
  printf '\nThe installed copy is what runs. To reinstall one, from the admin account:\n' >&2
  printf '  sudo install -o root -g wheel -m 755 <reviewed clone>/scripts/security/<name> %s/<name>\n\n' "$installed_dir" >&2
  exit 1
fi
printf 'Installed launchers match the repository (%d checked, owner and mode asserted).\n' "${#expected_launchers[@]}"

shadowed="$(shadowed_launchers "$PATH")"
if [[ -n "$shadowed" ]]; then
  printf '\nFAIL: launcher names on PATH resolve outside %s:\n%s\n' "$installed_dir" "$shadowed" >&2
  printf 'Start the server by absolute path: %s/helm-dev\n\n' "$installed_dir" >&2
  exit 1
fi
printf 'No launcher is shadowed on this PATH.\n'

printf 'Helm launcher syntax and helper checks passed.\n'
