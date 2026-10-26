---
"prisma-mock": patch
---

`aggregate` and `groupBy` return `_min` and `_max` with the type of the field. A `DateTime` gives a `Date` instead of epoch milliseconds, and a `String` gives the string instead of `NaN` (#158).
