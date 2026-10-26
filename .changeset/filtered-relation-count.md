---
"prisma-mock": patch
---

A filtered relation count, such as `_count: { select: { posts: { where: { published: true } } } }`, only counts the related rows that match its `where`. Before, the `where` was ignored and every related row was counted (#161).

Also, `_count: true` counts every list relation instead of throwing, and a relation set to `false` in the `_count` select is left out.
