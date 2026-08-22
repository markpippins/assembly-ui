#!/bin/bash
# ==============================================================================
# assembly-ui drift handler
#
# Adapted from a Google AI Studio (GAIS) auditor utility. The original script
# was a tackle-ui copy with hardcoded paths that do not match this repository:
# it pointed at src/types.ts and server.ts (neither exists here), the tackle-ui
# port 4202, and it ran a destructive `git reset --hard HEAD~1`. This version is
# corrected for the assembly-ui layout: types live in src/types/index.ts, the
# API client is src/services/apiClient.ts, and work happens on dated dev-*
# branches (not directly on main). assembly-ui is live-only — there is no
# mock-fixture server; the Vite dev server proxies /api to assembly-srv (3107)
# and /nebula to nebula-srv (3101).
#
# What this script does:
#   1. Fetches origin and diffs the local HEAD against origin/main across the
#      core API surface (server.js, src/types/, src/services/apiClient.ts, and
#      the component tree under src/components/ + src/views/).
#   2. If drift is detected, compiles a structured markdown payload at
#      $AUDITOR_PAYLOAD containing the raw diffs, ready to feed an LLM auditor
#      prompt for contract/envelope/routing analysis.
#   3. Syncs the local main ref (non-destructively) and prints the next-step
#      hint to start a fresh dev branch. It does NOT hard-reset the current
#      branch (the live-mode commits on dev-* branches must be preserved) and
#      it does NOT invoke a GUI editor.
# ==============================================================================
set -euo pipefail

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
APP_NAME="Assembly UI"
SCHEMA_DIR="src/types"
API_CLIENT="src/services/apiClient.ts"
FRONTEND_DIRS="src/components src/views"
PORT_FILE="vite.config.ts"
AUDITOR_PAYLOAD="gais_auditor_payload.md"

# Drift baseline. The upstream main branch is the contract baseline for this
# fork; the live-mode work lives on dated dev-* branches ahead of it. We diff
# the working tree against origin/main to surface upstream contract changes.
BASE_BRANCH="${BASE_BRANCH:-origin/main}"

# ------------------------------------------------------------------------------
# 1. Fetch upstream and detect drift
# ------------------------------------------------------------------------------
echo "Checking upstream for $APP_NAME contract drift (baseline: $BASE_BRANCH)..."
git fetch origin --quiet

# Surface updates across the core API layer. The component globs catch any
# renamed/added .tsx files automatically (git diff --name-only with a dir
# prefix recurses).
IF_CHANGES=$(git diff "$BASE_BRANCH" HEAD --name-only -- \
    "$PORT_FILE" \
    "$API_CLIENT" \
    "$SCHEMA_DIR" \
    $FRONTEND_DIRS)

if [ -n "$IF_CHANGES" ]; then
    echo "⚠️  Upstream drift detected for $APP_NAME. Compiling auditor payload..."

    # 2. Compose the auditor context directive
    {
        cat <<EOF
# AUDITOR PROMPT CONTEXT: APPLICATION DRIFT DETECTED IN [$APP_NAME]
System Directive: You are the designated API Auditor for the $APP_NAME system suite.
Analyze the raw structural git diffs attached below between the $BASE_BRANCH baseline
and the local working branch.

## TARGET OBJECTIVES:
1. CONTRACT DRIFT: Identify newly declared or altered TypeScript interfaces in $SCHEMA_DIR/*.ts.
2. ENVELOPE MISMATCHES: Audit payload keys vs actual routing parameters in $API_CLIENT.
3. UNIMPLEMENTED ROUTING: Explicitly call out components making api requests to paths
   that do not exist or differ from definitions in $PORT_FILE.
4. SPECIFICATION OUTPUT: Draft the structured critique payload required to bring the
   frontend and backend back into lockstep synchronization.

---

EOF

        # 3. Backend route surface (vite.config.ts — live proxy targets)
        echo "### 1. BACKEND ROUTE SURFACE CHANGES ($PORT_FILE)"
        echo '```diff'
        git diff "$BASE_BRANCH" HEAD -U5 -- "$PORT_FILE" || \
            echo "(no changes to $PORT_FILE)"
        echo '```'
        echo

        # 4. API client envelope (src/services/apiClient.ts)
        echo "### 2. API CLIENT ENVELOPE CHANGES ($API_CLIENT)"
        echo '```diff'
        git diff "$BASE_BRANCH" HEAD -U5 -- "$API_CLIENT" || \
            echo "(no changes to $API_CLIENT)"
        echo '```'
        echo

        # 5. Type contract changes (src/types/)
        echo "### 3. CORE TYPE CONTRACT CHANGES ($SCHEMA_DIR)"
        echo '```diff'
        git diff "$BASE_BRANCH" HEAD -U5 -- "$SCHEMA_DIR" || \
            echo "(no changes to $SCHEMA_DIR)"
        echo '```'
        echo

        # 6. Frontend component API usage. Capture context around `api.` calls
        #    (the assembly-ui client is a singleton `api` from
        #    src/services/apiClient, not a bare `apiRequest(...)` helper).
        echo "### 4. FRONTEND VIEW COMPONENT CALL ENVELOPES ($FRONTEND_DIRS)"
        echo '```diff'
        git diff "$BASE_BRANCH" HEAD -U3 -- $FRONTEND_DIRS | \
            grep -A 3 -B 3 'api\.' || \
            echo "No component api.* call alterations found."
        echo '```'
    } > "$AUDITOR_PAYLOAD"

    echo "✅ Auditor context payload compiled at: $AUDITOR_PAYLOAD"
else
    echo "✅ No core contract drift detected for $APP_NAME against $BASE_BRANCH."
fi

# ------------------------------------------------------------------------------
# 7. Workspace reset hint (non-destructive)
#
# The original script ran `git reset --hard HEAD~1 && git pull origin main &&
# git checkout -b dev-<ts>` on the current branch. On this fork that would
# discard the live-mode commits that exist only on dated dev-* branches. We
# instead sync the main ref and print the next-step command; the operator
# decides whether to branch from main or continue on the current dev branch.
# ------------------------------------------------------------------------------
echo
echo "Syncing local main ref (origin/main)..."
git fetch origin main:main --quiet 2>/dev/null || \
    git update-ref refs/heads/main origin/main

NEW_DEV_BRANCH="dev-$(date +%Y%m%d%H%M%S)"
echo
echo "Next step — start a fresh dev branch from main:"
echo "    git checkout main && git checkout -b \"$NEW_DEV_BRANCH\""
echo
echo "Or continue on the current branch ($(git rev-parse --abbrev-ref HEAD))."

# ------------------------------------------------------------------------------
# 8. Port configuration hint
#
# assembly-ui is live-only: the Vite dev server (vite.config.ts) uses PORT
# (default 4214) and proxies /api to assembly-srv (API_TARGET, default 3107)
# and /nebula to nebula-srv (NEBULA_TARGET, default 3101). The correct way to
# override the port is the env var, set by the startup script / systemd unit.
# ------------------------------------------------------------------------------
echo
echo "To run the assembly-ui Vite dev server on a custom port:"
echo "    PORT=<port> npm run dev"
