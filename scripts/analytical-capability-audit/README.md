# Analytical outcome audit

Run from the checkout whose source revision you are reviewing:

```sh
node --test scripts/analytical-capability-audit/audit.test.mjs
node scripts/analytical-capability-audit/audit.mjs
```

The second command writes JSON to stdout. Save reports under ignored `tmp/` when
needed; they are revision-scoped observations, not another tracked status ledger.
Linked worktrees read governance from the canonical checkout. Each result names
its spec, lifecycle, resolution, criterion dispositions/references, closure notes
and contribution class. Structured successors remain distinct from IDs mentioned
in prose. Missing successor metadata is exposed rather than guessed.

Recorded completion requires nonempty acceptance, exactly one passed referenced
record per criterion, and no unknown criterion records. This is a record-quality
check, not execution or verification of those references. Abandonment may mean a
useful negative result or unfinished work: read the reason. Supersession routes a
review to subsequent evidence without counting the predecessor again. The audit
does not execute shell text, write CAWS evidence, decide milestones, or gate
ordinary admission on Stage-2 subtraction.

The normative interpretation is the
[analytical capability contract](../../docs/architecture/analytical-capability-contract.md).
