#!/bin/bash
# THE GATE, RUN FROM ONE PLACE (CLAUDE.md, "The gate" — 23 October, Rowland: "64 min is too long ... shorten the
# cycle"). Two cycles:
#
#   quick   every change — about 20 minutes: tsc, eslint, vitest, the build; then, four at a time against the
#           checkout's dev server: every screen (smoke), every report at three sizes and the paper-by-paper
#           comparison against what is live, every acceptance script, the page inventory and the journeys.
#   full    the quick gate plus the forty random projects (every fact reconciled) and, last and alone, the
#           two-device sync — about 65 minutes. Run before anything that touches the sync, the mappers or the
#           schema, the report engine (src/lib/report/) or the seeds; and once a day on main regardless.
#
#   scripts/gate.sh quick|full CHECKOUT PORT LIVE_CHECKOUT LIVE_PORT OUT
#
# CHECKOUT's dev server must already be up on PORT (a worktree's own vite config and cacheDir — CLAUDE.md, "Two
# dev servers, one dependency cache"), and LIVE_CHECKOUT's on LIVE_PORT at origin/main, for the paper comparison.
# OUT holds a log a step and summary.txt — PASS/FAIL a line, DONE at the end; every step keeps running after a
# failure, so one run says everything. Nothing in the checkout may be edited while it runs: the dev server reloads
# under the tests and the failures that follow are not the change's.
set -u
MODE="${1:?quick|full}"; DIR="${2:?checkout}"; PORT="${3:?port}"; LIVE="${4:?live checkout}"; LPORT="${5:?live port}"; O="${6:?out dir}"
[ "$MODE" = quick ] || [ "$MODE" = full ] || { echo "gate.sh: quick or full" >&2; exit 2; }
cd "$DIR" || exit 2
export SMOKE_BASE="http://127.0.0.1:$PORT"
rm -rf "$O"; mkdir -p "$O/paper" "$O/paper-live" "$O/fuzz-a" "$O/fuzz-b"
R="$O/summary.txt"; : > "$R"
echo "gate $MODE · $DIR @ $(git -C "$DIR" rev-parse --short HEAD) · live $(git -C "$LIVE" rev-parse --short HEAD) · $(date -u +%FT%TZ)" > "$O/about.txt"
step() { local name="$1"; shift; local log="$O/$(echo "$name" | tr ' /' '__').log"; local t0=$(date +%s);
  "$@" > "$log" 2>&1; local rc=$?; echo "$( [ $rc -eq 0 ] && echo PASS || echo FAIL ) $name ($(( $(date +%s) - t0 ))s) rc=$rc" >> "$R"; }
export -f step; export O R
# what live's papers say, from the live checkout's server, beside the first checks
( cd "$LIVE" && SMOKE_BASE="http://127.0.0.1:$LPORT" node scripts/report-stress.mjs "$O/paper-live" --repeatable > "$O/paper-live.log" 2>&1; echo "rc=$?" >> "$O/paper-live.log" ) &
step tsc npx tsc --noEmit
step eslint npx eslint src --max-warnings "$(node -e "console.log(/--max-warnings (\d+)/.exec(require('./package.json').scripts.lint ?? '')?.[1] ?? 64)")"
step vitest npx vitest run --exclude '.claude/**' --exclude 'node_modules/**'
step build npx vite build
FA=; FB=
if [ "$MODE" = full ]; then
  step report-fuzz-a node scripts/report-stress.mjs "$O/fuzz-a" --seeds "$(seq -s, 1 20)" & FA=$!
  step report-fuzz-b node scripts/report-stress.mjs "$O/fuzz-b" --seeds "$(seq -s, 21 40)" & FB=$!
fi
one() { case "$1" in
  smoke) step smoke node scripts/smoke.mjs ;;
  report-stress) step report-stress node scripts/report-stress.mjs "$O/paper" --repeatable && { while ! grep -q '^rc=' "$O/paper-live.log" 2>/dev/null; do sleep 5; done; if grep -q '^rc=0' "$O/paper-live.log"; then step paper-parity node scripts/paper-parity.mjs "$O/paper-live" "$O/paper"; else step paper-parity sh -c 'echo "the live papers were not drawn (paper-live.log) — nothing to compare"; exit 1'; fi; } ;;
  journeys) step journeys node scripts/journeys.mjs "$O/journeys.json" ;;
  inventory) step inventory node scripts/inventory.mjs ;;
  *) step "acceptance $1" node "scripts/acceptance/$1.mjs" ;;
esac; }
export -f one
# every acceptance script the gate lists (CLAUDE.md), the long ones first so the pool ends together
ACC="$(grep -o 'node scripts/acceptance/[a-z0-9-]*\.mjs' CLAUDE.md | sed 's#node scripts/acceptance/##; s#\.mjs##' | awk '!seen[$0]++' | tr '\n' ' ')"
PAR=$([ "$MODE" = quick ] && echo 4 || echo 3)
echo "smoke report-stress inventory structure journeys $ACC" | tr ' ' '\n' | awk '!seen[$0]++' | xargs -P "$PAR" -I{} bash -c 'one {}'
if [ "$MODE" = full ]; then
  wait $FA $FB
  for i in $(seq 1 30); do pgrep -f "report-stress|acceptance/" >/dev/null || break; sleep 2; done
  step sync-two-devices node scripts/sync-two-devices.mjs
fi
echo DONE >> "$R"
n=$(grep -c '^PASS' "$R"); f=$(grep -c '^FAIL' "$R")
echo "gate $MODE: $n passed, $f failed" >> "$R"
[ "$f" -eq 0 ]
