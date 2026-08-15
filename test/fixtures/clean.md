# Clean fixture

Every line below is a sanctioned keep or clean prose; the linter must report nothing.

Batched writes are tracked in #1470; TODO(alice): batch these flushes once the coordinator lands.

Rate-limit headers follow RFC 9110 §10.1.5 for cache-control semantics.

The old connection drains fully before the new one accepts traffic <!-- cot-lint-ignore: runtime lifecycle, not change history -->.

The spill threshold is 512 nested entries (measured: 512 nests ≈ 0.15s on the CI runner).

Without the write lock, concurrent turns can interleave partial flushes.

The coordinator serializes writes per session, flushes buffered events before disposal resolves, and reports backend failures to the caller.
