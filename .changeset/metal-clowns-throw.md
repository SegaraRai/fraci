---
"fraci": minor
---

**BREAKING CHANGE**: Renamed base constants for better consistency and clarity:

- `BASE16` -> `BASE16L` (lowercase hex digits)
- `BASE26` -> `BASE26L` (lowercase alphabets)
- `BASE36` -> `BASE36L` (lowercase alphanumeric)
- `BASE64` -> `BASE64URL` (URL-safe Base64 characters)

Added new complementary constants:

- `BASE16U` (uppercase hex digits)

The naming convention now uses `L` suffix for lowercase and `U` suffix for uppercase variants.
