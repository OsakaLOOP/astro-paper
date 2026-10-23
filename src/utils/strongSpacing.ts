const SYMBOL = /[\p{P}\p{S}]/u;

const firstCharacter = (value: string) => Array.from(value)[0] ?? "";

const lastCharacter = (value: string) => Array.from(value).at(-1) ?? "";

export const startsWithSymbol = (value?: string) =>
  Boolean(value && SYMBOL.test(firstCharacter(value)));

export const endsWithSymbol = (value?: string) =>
  Boolean(value && SYMBOL.test(lastCharacter(value)));

export const strongSpacingClassNames = (before?: string, after?: string) => [
  ...(endsWithSymbol(before) ? ["strong--flush-start"] : []),
  ...(startsWithSymbol(after) ? ["strong--flush-end"] : []),
];
