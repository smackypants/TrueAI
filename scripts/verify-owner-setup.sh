#!/usr/bin/env bash
#
# verify-owner-setup.sh — confirm the five owner-only setup steps for
# the trueai-localai repo are actually live. Run from a workstation
# where `gh` is authenticated as a repo *admin* (so it can read repo
# settings, environments, rulesets, and app installations).
#
# Reports ✅ / ❌ per item and exits non-zero if anything is missing.
#
# Usage:
#   scripts/verify-owner-setup.sh [--owner OWNER] [--repo REPO]
#
# Defaults: OWNER=smackypants, REPO=trueai-localai.

set -uo pipefail

OWNER="smackypants"
REPO="trueai-localai"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2 ;;
    --repo)  REPO="$2";  shift 2 ;;
    -h|--help)
      sed -n '2,/^set -uo/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

command -v gh >/dev/null || { echo "❌ 'gh' CLI not found"; exit 1; }
command -v jq >/dev/null || { echo "❌ 'jq' not found"; exit 1; }

FAIL=0
ok()    { echo "✅ $1"; }
fail()  { echo "❌ $1"; FAIL=$((FAIL + 1)); }
warn()  { echo "⚠️  $1"; }
info()  { echo "ℹ️  $1"; }

echo "==> Verifying owner-only setup for $OWNER/$REPO"
echo

# --- 1. Workflow permissions -------------------------------------------------
echo "[1/5] Actions workflow permissions"
PERMS_JSON="$(gh api "/repos/$OWNER/$REPO/actions/permissions/workflow" 2>/dev/null || echo '{}')"
DEFAULT_PERMS="$(printf '%s' "$PERMS_JSON" | jq -r '.default_workflow_permissions // ""')"
PR_APPROVE="$(printf '%s' "$PERMS_JSON" | jq -r '.can_approve_pull_request_reviews // false')"

if [[ "$DEFAULT_PERMS" == "write" ]]; then
  ok "default_workflow_permissions = write"
else
  fail "default_workflow_permissions = '${DEFAULT_PERMS:-unknown}' (need 'write')"
fi
if [[ "$PR_APPROVE" == "true" ]]; then
  ok "can_approve_pull_request_reviews = true"
else
  fail "can_approve_pull_request_reviews = ${PR_APPROVE} (need true)"
fi
echo

# --- 2. Auto-merge / squash settings ----------------------------------------
echo "[2/5] Pull-request merge settings"
REPO_JSON="$(gh api "/repos/$OWNER/$REPO" 2>/dev/null || echo '{}')"
for key in allow_auto_merge allow_squash_merge delete_branch_on_merge; do
  val="$(printf '%s' "$REPO_JSON" | jq -r --arg k "$key" '.[$k] // false')"
  if [[ "$val" == "true" ]]; then
    ok "$key = true"
  elif [[ "$key" == "delete_branch_on_merge" ]]; then
    warn "$key = $val (recommended but not required)"
  else
    fail "$key = $val (need true)"
  fi
done
echo

# --- 3. Environments (release / play / fdroid) ------------------------------
echo "[3/5] Environments"
ENVS_JSON="$(gh api "/repos/$OWNER/$REPO/environments" 2>/dev/null || echo '{"environments":[]}')"
for env_name in release play fdroid; do
  if printf '%s' "$ENVS_JSON" | jq -e --arg n "$env_name" '.environments[]? | select(.name == $n)' >/dev/null; then
    ok "environment '$env_name' exists"
  else
    fail "environment '$env_name' missing"
  fi
done
echo

# --- 4. Rulesets imported ----------------------------------------------------
echo "[4/5] Repository rulesets"
RULESETS_JSON="$(gh api "/repos/$OWNER/$REPO/rulesets" 2>/dev/null || echo '[]')"
for name in \
  "Protect default branch (main/master)" \
  "Protect release tags (v*)" \
  "Protect workflows, license, and config files"; do
  if printf '%s' "$RULESETS_JSON" | jq -e --arg n "$name" '.[]? | select(.name == $n and .enforcement == "active")' >/dev/null; then
    ok "ruleset '$name' is active"
  elif printf '%s' "$RULESETS_JSON" | jq -e --arg n "$name" '.[]? | select(.name == $n)' >/dev/null; then
    warn "ruleset '$name' exists but is not 'active' (run scripts/configure-rulesets.sh)"
    FAIL=$((FAIL + 1))
  else
    fail "ruleset '$name' not imported (run scripts/configure-rulesets.sh)"
  fi
done
echo

# --- 5. Bot installations ---------------------------------------------------
echo "[5/5] Bot app installations"
INSTALL_JSON="$(gh api "/repos/$OWNER/$REPO/installations" --paginate 2>/dev/null || echo '{"installations":[]}')"
for slug_label in \
  "github-actions:github-actions[bot]" \
  "copilot-swe-agent:copilot-swe-agent[bot]" \
  "dependabot:dependabot[bot]"; do
  slug="${slug_label%%:*}"
  label="${slug_label##*:}"
  app_id="$(printf '%s' "$INSTALL_JSON" | jq -r --arg s "$slug" '.installations[]? | select(.app_slug == $s) | .app_id' | head -n1)"
  if [[ -n "$app_id" ]]; then
    ok "$label installed (app_id $app_id)"
  elif [[ "$slug" == "copilot-swe-agent" ]]; then
    warn "$label not installed (optional — install via https://github.com/apps/copilot-swe-agent)"
  else
    fail "$label not installed"
  fi
done
echo

# --- Summary -----------------------------------------------------------------
if [[ "$FAIL" -eq 0 ]]; then
  echo "🎉 All owner-only setup steps look good."
  exit 0
else
  echo "❌ ${FAIL} item(s) need attention. See .github/copilot/AGENT_RUNTIME.md for fix instructions."
  exit 1
fi
