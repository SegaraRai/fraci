---
"fraci": minor
---

Keep every conflict-retry candidate strictly inside its requested bounds,
including batched generation, and make retry selection logarithmic in `skip`.

Reject oversized input keys and impractically large generation counts before
expensive work. Replace recursive midpoint construction and repeated array
spreads with stack-safe, allocation-efficient implementations.

Document bytewise database collation requirements and safe group compaction,
and make random-operation benchmarks deterministic.
