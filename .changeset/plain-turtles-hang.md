---
"fraci": minor
---

Implementated Binary Fractional Indexing.

Added support for binary-based fractional indices using `Uint8Array` for more efficient storage and operations. This implementation provides:

- Improved performance with optimized binary operations for generating and comparing indices
- Enhanced memory efficiency for applications handling large numbers of indices
- Specialized factory functions for creating binary or string-based indices

New Features:

- Added `fraciBinary` and `fraciString` factory functions for creating specialized fractional indexing utilities
- Added `base` and `brand` properties to `Fraci` for better type safety and runtime information
- Enhanced validation and error handling for binary fractional indices

Breaking Changes:

- **Template Parameter Signature**: Changed template parameter signature for `fraci`, `Fraci`, and `FractionalIndex` types
- **Removed Properties**: Removed `digitBase` and `lengthBase` properties from `Fraci`

Added comprehensive type system with clear separation between binary and string-based indices:

- `AnyFractionalIndex`, `AnyBinaryFractionalIndex`, `AnyStringFractionalIndex`
- `AnyFractionalIndexBase`, `AnyBinaryFractionalIndexBase`, `AnyStringFractionalIndexBase`
- `AnyFraci`, `AnyBinaryFraci`, `AnyStringFraci`
- `FraciOptionsBase`, `BinaryFraciOptions`, `StringFraciOptions`
