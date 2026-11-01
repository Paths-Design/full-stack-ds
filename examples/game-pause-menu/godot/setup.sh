#!/usr/bin/env bash
# Materialize the generated Full Stack DS Godot addon inside this consumer project.
#
# A Godot project can only resolve res:// paths inside its own tree, so the
# committed generated package (packages/ds-godot/addons/full_stack_ds) is copied
# here at setup time and the copy is gitignored. Generated package bytes are
# never duplicated into git.
#
# Usage:  ./setup.sh [--check]
#   (default) copy packages/ds-godot/addons/full_stack_ds -> ./addons/full_stack_ds
#   --check   verify the copied addon is present and matches the package source
#
# Override the package location with FSDS_GODOT_PACKAGE=/abs/path/to/packages/ds-godot.
set -euo pipefail

LANE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_ROOT="$(cd "$LANE_DIR/../../.." && pwd)"
PACKAGE_DIR="${FSDS_GODOT_PACKAGE:-$WORKTREE_ROOT/packages/ds-godot}"
SOURCE_DIR="$PACKAGE_DIR/addons/full_stack_ds"
TARGET_DIR="$LANE_DIR/addons/full_stack_ds"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "FSDS Godot setup: missing generated package addon at $SOURCE_DIR" >&2
  echo "  Set FSDS_GODOT_PACKAGE to the absolute packages/ds-godot directory." >&2
  exit 1
fi

if [[ "${1:-}" == "--check" ]]; then
  if [[ ! -d "$TARGET_DIR" ]]; then
    echo "FSDS Godot setup: addon copy is missing; run ./setup.sh first." >&2
    exit 1
  fi
  if ! diff -rq --exclude='.godot' --exclude='*.uid' "$SOURCE_DIR" "$TARGET_DIR" >&2; then
    echo "FSDS Godot setup: copied addon is stale against $SOURCE_DIR; run ./setup.sh." >&2
    exit 1
  fi
  echo "FSDS Godot setup: copied addon matches $SOURCE_DIR"
  exit 0
fi

rm -rf "$TARGET_DIR"
mkdir -p "$LANE_DIR/addons"
cp -R "$SOURCE_DIR" "$TARGET_DIR"
# The package ships no engine import cache; remove any that leaked into the copy.
rm -rf "$TARGET_DIR/.godot"

# Typography parity: copy the committed Inter faces into the project so
# `res://fonts/inter/*.ttf` resolves inside the Godot project boundary.
rm -rf "$LANE_DIR/fonts"
mkdir -p "$LANE_DIR/fonts"
cp -R "$LANE_DIR/../fonts/inter" "$LANE_DIR/fonts/inter"

# Design-token parity: copy the committed token graph + Orion brand file so the
# lane resolves its palette from tokens instead of a lane-local palette copy.
rm -rf "$LANE_DIR/fixtures/ds-tokens"
mkdir -p "$LANE_DIR/fixtures/ds-tokens"
cp "$WORKTREE_ROOT/packages/ds-tokens/generated/resolved.tokens.json" "$LANE_DIR/fixtures/ds-tokens/resolved.tokens.json"
cp "$WORKTREE_ROOT/packages/ds-tokens/src/brands/orion.tokens.json" "$LANE_DIR/fixtures/ds-tokens/orion.tokens.json"

for required in \
  components/Tabs/Tabs.tscn \
  components/Switch/Switch.tscn \
  components/Popover/Popover.tscn \
  components/Button/Button.tscn \
  components/Badge/Badge.tscn \
  components/Card/Card.tscn \
  components/Icon/Icon.tscn \
  components/Text/Text.tscn \
  components/Divider/Divider.tscn \
  runtime/glyph_catalog.json; do
  if [[ ! -e "$TARGET_DIR/$required" ]]; then
    echo "FSDS Godot setup: copied package is incomplete, missing $required" >&2
    exit 1
  fi
done

for required in fixtures/ds-tokens/resolved.tokens.json fixtures/ds-tokens/orion.tokens.json; do
  if [[ ! -e "$LANE_DIR/$required" ]]; then
    echo "FSDS Godot setup: token source is missing at $LANE_DIR/$required" >&2
    exit 1
  fi
done

for required in fonts/inter/Inter-Regular.ttf fonts/inter/Inter-Bold.ttf; do
  if [[ ! -e "$LANE_DIR/$required" ]]; then
    echo "FSDS Godot setup: Inter typography asset is missing at $LANE_DIR/$required" >&2
    exit 1
  fi
done

echo "FSDS Godot setup: copied $SOURCE_DIR"
echo "                   -> $TARGET_DIR"
echo "FSDS Godot setup: copied ../fonts/inter -> $LANE_DIR/fonts/inter"
