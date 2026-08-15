# Leaky fixture

Every paragraph below is a seeded instance of one taxonomy class.

The coordinator drops batched writes (decision 7) and the retry ladder comes from design §4.7; phase W3 will land the spill files.

This PR adds a retry loop around the provider call so reviewers can see the diff clearly.

The manager used to serialize writes itself; it no longer does after the v1 refactor, and today the shared coordinator owns it.

Rejected in review: the reviewer asked for a narrower type, so we kept the loose one.

// The cast is safe — it simply narrows the union at a typed boundary.

First we acquire the lock, then we drain the queue, as you can see in the code above.

// Probably fine for now, the threshold rarely matters.

---- 私有 ----
本节来自设计稿，旧版行为不再保留。
