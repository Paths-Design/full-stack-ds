#!/usr/bin/env python3
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: (new — CAWS-HOOK-ADVISORY-BUDGET-TIERS-01)
# edit_stance: YOURS TO EDIT. This is a starting hook helper, not a locked one.
#   The one edit to avoid is making it emit a partially decoded character, which
#   is the failure this helper exists to prevent.
"""Byte-exact truncation of advisory text for the CAWS hook composer.

CAWS-HOOK-ADVISORY-BUDGET-TIERS-01. The hook composer must fit an advisory card
into a byte budget without splitting a UTF-8 character. Bash cannot do this
correctly: substring expansion indexes by CHARACTER in a UTF-8 locale (so a byte
length cannot be expressed), and building the output from `printf %b` octal
escapes re-interprets those escapes. Four shell-only attempts each produced a
split character, an unbounded emit, or whole-string returns, so the cut lives
here, next to the pack's other Python helper (classify_command.py).

Usage: advisory_truncate.py <max-bytes>
Reads the text on stdin, writes the longest prefix of at most <max-bytes> bytes
that ends on a character boundary, and exits 0. Exit 3 signals a usage error so
the caller can fall back to its own bounded cut.
"""
import sys


def main(argv):
    if len(argv) != 2:
        return 3
    try:
        limit = int(argv[1])
    except ValueError:
        return 3
    if limit < 0:
        return 3

    data = sys.stdin.buffer.read()
    if len(data) <= limit:
        sys.stdout.buffer.write(data)
        return 0

    # The largest byte prefix that decodes cleanly. `errors="ignore"` drops only
    # the incomplete trailing sequence the cut introduced.
    truncated = data[:limit].decode("utf-8", "ignore")
    sys.stdout.buffer.write(truncated.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
