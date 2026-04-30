#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
MACHINE="mac"
BRANCH="wip-${MACHINE}"
ORIG_INDEX=$(git rev-parse --verify HEAD 2>/dev/null || echo "")
git add -A
TREE=$(git write-tree)
if [ -n "$ORIG_INDEX" ]; then git read-tree HEAD; fi
LAST_TREE=$(git rev-parse "${BRANCH}^{tree}" 2>/dev/null || echo "")
if [ "$TREE" = "$LAST_TREE" ]; then exit 0; fi
PARENT=$(git rev-parse "$BRANCH" 2>/dev/null || echo "")
MSG="wip auto $(date -Iseconds) [${MACHINE}] from $(git rev-parse --abbrev-ref HEAD)"
if [ -n "$PARENT" ]; then
  COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "$MSG")
else
  COMMIT=$(git commit-tree "$TREE" -m "$MSG")
fi
git update-ref "refs/heads/${BRANCH}" "$COMMIT"
git push origin "$BRANCH" --quiet
