export const withJosa = (word: string, a: string, b: string) => {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return `${word}${b}`;
  return `${word}${(code - 0xac00) % 28 ? a : b}`;
};
