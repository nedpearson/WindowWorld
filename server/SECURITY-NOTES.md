# Security Notes

## Open Dependabot Alerts — GHSA-w5hq-g745-h8pq (uuid < 14)

**Severity:** Moderate  
**Advisory:** Missing buffer bounds check in `uuid` v3/v5/v6 when the optional `buf` argument is provided.

### Status: Not exploitable in this codebase

Our server only calls `uuidv4()` with **no `buf` argument**, which is the unaffected code path.
The vulnerability is present in transitive dependencies:

| Package | Installed | UUID version | Fix available |
|---------|-----------|-------------|---------------|
| `bullmq@5.76.1` | ✅ Required | `11.1.0` | No upstream fix yet |
| `svix@1.90.0` (via `resend`) | ✅ Required | `10.0.0` | svix 1.92.2+ drops uuid (released but resend hasn't updated yet) |

### Mitigations applied
1. `"overrides": { "uuid": "^14.0.0" }` added to `package.json` — forces hoisted uuid to v14 for any package that _accepts_ it.
2. Our own direct `uuid` dependency is pinned to `^14.0.0`.
3. None of our application code uses the vulnerable `buf` parameter.

### Resolution path
- Wait for `resend` to ship with `svix >= 1.92.0` → eliminates 2/4 alerts.
- Wait for `bullmq >= next` to update its uuid pin → eliminates remaining 2/4.
- No action needed on our end beyond the overrides already applied.
