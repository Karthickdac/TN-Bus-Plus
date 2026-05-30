---
name: TN Bus+ per-bus history data model
description: Which fleet tables are keyed by bus_number text vs busId, and what that means for renames.
---

# Per-bus history keying in TN Bus+

In the tnbus schema, fleet-related history tables are keyed inconsistently:

- `maintenance_records` is keyed by **`busId`** (FK to the bus row).
- `fuel_logs` and `inspections` are keyed by **`bus_number` text**, not the bus id.

**Why it matters:** Renaming a bus's `busNumber` (PATCH /admin/buses/:id) must
cascade the new number into `fuel_logs.bus_number` and `inspections.bus_number`
in the **same transaction**, or that history orphans and vanishes from the
per-bus drawer. Maintenance rows are safe because they use busId.

**How to apply:** Any future feature that renames a bus, or adds another
bus_number-keyed history table, must cascade the rename. Prefer keying new
history tables by busId to avoid this trap.

**Also:** `crew.assignedBusNumber` is likewise bus_number-keyed (roster scope) —
a rename should eventually cascade there too; handle in the roster task.
