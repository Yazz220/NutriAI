#!/usr/bin/env bash
# Auto-WIP snapshot: captures working tree state to wip-pc branch and pushes,
# without touching the current branch, HEAD, or staging area.
set -e
cd "$(dirname "$0")/.."

MACHINE="pc"
BRANCH="wip-${MACHINE}"

# Stage everything into the index temporarily, write a tree, then reset index back.
ORIG_INDEX=$(git rev-parse --verify HEAD 2>/dev/null || echo "")
git add -A
TREE=$(git write-tree)

# Restore index to HEAD so user's staging area is untouched.
if [ -n "$ORIG_INDEX" ]; then
  git read-tree HEAD
fi

# Skip if tree matches last wip-pc commit (no changes).
LAST_TREE=$(git rev-parse "${BRANCH}^{tree}" 2>/dev/null || echo "")
if [ "$TREE" = "$LAST_TREE" ]; then
  exit 0
fi

PARENT=$(git rev-parse "$BRANCH" 2>/dev/null || echo "")
MSG="wip auto $(date -Iseconds) [${MACHINE}] from $(git rev-parse --abbrev-ref HEAD)"

if [ -n "$PARENT" ]; then
  COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "$MSG")
else
  COMMIT=$(git commit-tree "$TREE" -m "$MSG")
fi

git update-ref "refs/heads/${BRANCH}" "$COMMIT"
git push origin "$BRANCH" --quiet
