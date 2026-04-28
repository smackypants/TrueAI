#!/usr/bin/env bash
#
# BEGIN_HELP
# configure-rulesets.sh — one-shot ruleset bootstrap for the
# trueai-localai repository.
#
# Reads the GitHub App installations on the repository, looks up the
# numeric `app_id` for each bot we rely on (github-actions[bot],
# copilot-swe-agent[bot], dependabot[bot]), patches the placeholder
# `actor_id: -1` entries in the JSON files under `.github/rulesets/`,
# and POSTs each ruleset to the repository (or PUTs over it if a
# ruleset of the same name already exists). The result is a fully
# active set of branch- and tag-protection rules with the correct
# bypass actors — no manual `Settings → Rules → Rulesets → Import`
# clicking required.
#
# Re-run any time. The script is idempotent.
#
# Requirements (run on the maintainer's workstation, NOT in CI):
#   - gh CLI authenticated as a repo *admin* (`gh auth login`).
#   - jq + python3.
#   - The bots you want to authorize must already be installed on the
#     repository (Copilot agent: install via
#     https://github.com/apps/copilot-swe-agent; Dependabot: enable
#     under Settings → Code security).
#
# Usage:
#   scripts/configure-rulesets.sh [--owner OWNER] [--repo REPO] [--dry-run]
#
# Defaults: OWNER=smackypants, REPO=trueai-localai.
# END_HELP

set -euo pipefail

OWNER="smackypants"
REPO="trueai-localai"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner)   OWNER="$2"; shift 2 ;;
    --repo)    REPO="$2";  shift 2 ;;
    --dry-run) DRY_RUN=1;  shift ;;
    -h|--help)
      sed -n '/^# BEGIN_HELP$/,/^# END_HELP$/p' "$0" \
        | sed '1d;$d;s/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

command -v gh >/dev/null || { echo "::error:: 'gh' CLI not found"; exit 1; }
command -v jq >/dev/null || { echo "::error:: 'jq' not found"; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULESETS_DIR="$REPO_ROOT/.github/rulesets"

if [[ ! -d "$RULESETS_DIR" ]]; then
  echo "::error:: $RULESETS_DIR not found"; exit 1
fi

echo "==> Fetching GitHub App installations on $OWNER/$REPO ..."
INSTALLATIONS_JSON="$(gh api "/repos/$OWNER/$REPO/installations" --paginate)"

# Slug -> app_id lookup, returns empty string if not installed.
app_id_for() {
  local slug="$1"
  printf '%s' "$INSTALLATIONS_JSON" \
    | jq -r --arg slug "$slug" \
        '.installations[] | select(.app_slug == $slug) | .app_id' \
    | head -n1
}

GITHUB_ACTIONS_ID="$(app_id_for 'github-actions')"
COPILOT_AGENT_ID="$(app_id_for 'copilot-swe-agent')"
DEPENDABOT_ID="$(app_id_for 'dependabot')"

echo "    github-actions[bot]    app_id = ${GITHUB_ACTIONS_ID:-<not installed>}"
echo "    copilot-swe-agent[bot] app_id = ${COPILOT_AGENT_ID:-<not installed>}"
echo "    dependabot[bot]        app_id = ${DEPENDABOT_ID:-<not installed>}"

if [[ -z "$GITHUB_ACTIONS_ID" ]]; then
  echo "::error:: github-actions[bot] is not installed on $OWNER/$REPO. Cannot proceed: the release workflows would be blocked."
  exit 1
fi

# Pre-process the ruleset JSON to assign each placeholder Integration
# entry to a specific bot based on its `_comment` text, then recursively
# strip every `_comment` field (the Rulesets API rejects unknown keys).
# More robust than positional matching.
assign_actor_ids() {
  local src="$1"
  python3 - "$src" "${GITHUB_ACTIONS_ID:-0}" "${COPILOT_AGENT_ID:-0}" "${DEPENDABOT_ID:-0}" <<'PY'
import json, sys
src, gha, copilot, dependabot = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
with open(src) as f:
    data = json.load(f)

def strip_comments(obj):
    """Recursively drop any '_comment' keys the Rulesets API would reject."""
    if isinstance(obj, dict):
        obj.pop("_comment", None)
        for v in obj.values():
            strip_comments(v)
    elif isinstance(obj, list):
        for v in obj:
            strip_comments(v)

new_actors = []
for actor in data.get("bypass_actors", []):
    comment = (actor.get("_comment", "") or "").lower()
    if actor.get("actor_type") == "Integration" and actor.get("actor_id", 0) <= 0:
        if "github-actions" in comment:
            target = gha
        elif "copilot" in comment:
            target = copilot
        elif "dependabot" in comment:
            target = dependabot
        else:
            target = 0
        if target <= 0:
            # Bot not installed — drop the entry so the ruleset stays valid.
            continue
        actor["actor_id"] = target
    new_actors.append(actor)
data["bypass_actors"] = new_actors
strip_comments(data)
print(json.dumps(data, indent=2))
PY
}

# Find an existing ruleset of the given name on the repo, if any.
find_ruleset_id() {
  local name="$1"
  gh api "/repos/$OWNER/$REPO/rulesets" --paginate \
    | jq -r --arg name "$name" '.[] | select(.name == $name) | .id' \
    | head -n1
}

upsert_ruleset() {
  local file="$1"
  local body name id endpoint method
  body="$(assign_actor_ids "$file")"
  name="$(printf '%s' "$body" | jq -r '.name')"
  id="$(find_ruleset_id "$name")"

  if [[ -n "$id" ]]; then
    endpoint="/repos/$OWNER/$REPO/rulesets/$id"
    method="PUT"
  else
    endpoint="/repos/$OWNER/$REPO/rulesets"
    method="POST"
  fi

  echo "==> $method $endpoint  ($(basename "$file") -> '$name')"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '%s\n' "$body"
    return 0
  fi
  printf '%s' "$body" | gh api --method "$method" "$endpoint" --input -
}

shopt -s nullglob
for f in "$RULESETS_DIR"/*.json; do
  upsert_ruleset "$f"
done

echo "==> Done. Verify under https://github.com/$OWNER/$REPO/settings/rules"
