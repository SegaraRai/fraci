export function getIntegerLengthSigned(
  index: string,
  lenBaseReverse: ReadonlyMap<string, number>
): number | undefined {
  return lenBaseReverse.get(index[0]);
}

export function splitParts(
  index: string,
  lenBaseReverse: ReadonlyMap<string, number>
): [integer: string, fractional: string] | undefined {
  const intLength =
    Math.abs(getIntegerLengthSigned(index, lenBaseReverse) ?? 0) + 1;
  if (intLength < 2 || index.length < intLength) {
    return;
  }
  return [index.slice(0, intLength), index.slice(intLength)];
}

export function getIntegerZero(
  digBaseForward: readonly string[],
  lenBaseForward: ReadonlyMap<number, string>
): string {
  return lenBaseForward.get(1)! + digBaseForward[0];
}

export function getSmallestInteger(
  digBaseForward: readonly string[],
  lenBaseForward: ReadonlyMap<number, string>
): string {
  const minKey = Math.min(...Array.from(lenBaseForward.keys()));
  const minLenChar = lenBaseForward.get(minKey)!;
  return `${minLenChar}${digBaseForward[0].repeat(Math.abs(minKey))}`;
}

export function incrementInteger(
  index: string,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>
): string | null | undefined {
  const intLengthSigned = getIntegerLengthSigned(index, lenBaseReverse);
  if (!intLengthSigned) {
    return;
  }

  const smallestDigit = digBaseForward[0];

  const [lenChar, ...digits] = index.slice(0, Math.abs(intLengthSigned) + 1);
  for (let i = digits.length - 1; i >= 0; i--) {
    const value = digBaseReverse.get(digits[i]);
    if (value == null) {
      return;
    }

    if (value < digBaseForward.length - 1) {
      // No carrying needed.
      digits[i] = digBaseForward[value + 1];
      return `${lenChar}${digits.join("")}`;
    }

    digits[i] = smallestDigit;
  }

  if (intLengthSigned === -1) {
    // The integer is -1. We need to return 0.
    return `${lenBaseForward.get(1)!}${smallestDigit}`;
  }

  const newLenSigned = intLengthSigned + 1;
  const newLenChar = lenBaseForward.get(newLenSigned);
  if (!newLenChar) {
    // Reached the limit.
    return null;
  }

  // Note that digits are all smallestDigit here.
  return `${newLenChar}${smallestDigit.repeat(Math.abs(newLenSigned))}`;
}

export function decrementInteger(
  index: string,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>
): string | null | undefined {
  const intLengthSigned = getIntegerLengthSigned(index, lenBaseReverse);
  if (!intLengthSigned) {
    return;
  }

  const largestDigit = digBaseForward[digBaseForward.length - 1];

  const [lenChar, ...digits] = index.slice(0, Math.abs(intLengthSigned) + 1);
  for (let i = digits.length - 1; i >= 0; i--) {
    const value = digBaseReverse.get(digits[i]);
    if (value == null) {
      return;
    }

    if (value > 0) {
      // No borrowing needed.
      digits[i] = digBaseForward[value - 1];
      return `${lenChar}${digits.join("")}`;
    }

    digits[i] = largestDigit;
  }

  if (intLengthSigned === 1) {
    // The integer is 0. We need to return -1.
    return `${lenBaseForward.get(-1)!}${largestDigit}`;
  }

  const newLenSigned = intLengthSigned - 1;
  const newLenChar = lenBaseForward.get(newLenSigned);
  if (!newLenChar) {
    // Reached the limit.
    return null;
  }

  // Note that digits are all largestDigit here.
  return `${newLenChar}${largestDigit.repeat(Math.abs(newLenSigned))}`;
}

export function getMidpointFractional(
  a: string,
  b: string | null,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>
): string | undefined {
  if (b != null && b <= a) {
    // Precondition failed.
    return;
  }

  if (b) {
    const aPadded = a.padEnd(b.length, digBaseForward[0]);

    // Now `prefixLength` is always 0 or positive.
    const prefixLength = Array.prototype.findIndex.call(
      b,
      (char, i) => char !== aPadded[i]
    );

    // If `prefixLength` is greater than 0, the midpoint is calculated by taking the prefix and the midpoint of the rest.
    if (prefixLength > 0) {
      return `${b.slice(0, prefixLength)}${getMidpointFractional(
        a.slice(prefixLength),
        b.slice(prefixLength),
        digBaseForward,
        digBaseReverse
      )}`;
    }
  }

  // Here, `a[0]` (`aDigit`) and `b[0]` (`bDigit`) are different.
  const aDigit = a ? digBaseReverse.get(a[0]) : 0;
  const bDigit = b ? digBaseReverse.get(b[0]) : digBaseForward.length;
  if (aDigit == null || bDigit == null) {
    // Invalid digit.
    return;
  }

  if (aDigit + 1 !== bDigit) {
    const mid = (aDigit + bDigit) >> 1;
    return digBaseForward[mid];
  }

  // The digits are consecutive.
  if (b && b.length > 1) {
    return b[0];
  }

  // `b` is null or has length 1 (a single digit).
  // the first digit of `a` is the previous digit to `b`, or 9 if `b` is null.
  // given, for example, midpoint('49', '5'), return
  // '4' + midpoint('9', null), which will become
  // '4' + '9' + midpoint('', null), which is '495'
  return `${digBaseForward[aDigit]}${getMidpointFractional(
    a.slice(1),
    null,
    digBaseForward,
    digBaseReverse
  )}`;
}
