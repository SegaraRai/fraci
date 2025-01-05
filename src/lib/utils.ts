function splitBase(base: string): string[] {
  // Intentionally not using a spread operator to ensure consistent splitting behavior.
  // That means we don't support strings with surrogate pairs.
  const forward = base.split("");

  if (forward.length < 4) {
    // There is no clear rationale for this number, but it seems like a reasonable minimum.
    // - We need at least 2 characters to represent +1 and -1 in integer length bases.
    // - We need at least 3 characters to calculate the middle of fractional parts.
    // - I'm afraid of something, so +1.
    throw new Error("Base must have at least 4 characters.");
  }

  let lastCode = -1;
  for (const char of forward) {
    const code = char.charCodeAt(0);
    if (code <= lastCode) {
      throw new Error(
        "Invalid base characters. Characters must be unique and in ascending order."
      );
    }
    lastCode = code;
  }

  return forward;
}

export function createDigitBaseMap(
  base: string
): [forward: readonly string[], reverse: ReadonlyMap<string, number>] {
  // We always convert characters to an array first to ensure consistent splitting behavior.
  const forward = splitBase(base);

  return [forward, new Map(forward.map((char, index) => [char, index]))];
}

export function createIntegerLengthBaseMap(
  base: string
): [
  forward: ReadonlyMap<number, string>,
  reverse: ReadonlyMap<string, number>
] {
  // We always convert characters to an array first to ensure consistent splitting behavior.
  const forward = splitBase(base);

  const positiveBegin = forward.length >> 1;
  const forwardEntries = forward.map(
    (char, index) =>
      [
        index < positiveBegin
          ? index - positiveBegin // Negative integers start from -1 and go down for convenience.
          : index - positiveBegin + 1, // Note that length 0 is not used.
        char,
      ] as const
  );

  return [
    new Map(forwardEntries),
    new Map(forwardEntries.map(([value, char]) => [char, value])),
  ];
}
