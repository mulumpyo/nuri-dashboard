export const fitListSize = (box: HTMLElement | null, row = 52, chrome = 0) => {
  if (!box) return 10;
  const space = box.clientHeight - chrome - 8;
  if (space <= 0) return 10;
  return Math.min(50, Math.max(1, Math.floor(space / row)));
};

export const pageAfterFit = (page: number, oldSize: number, newSize: number) => {
  const prev = Math.max(1, oldSize);
  const next = Math.max(1, newSize);
  const current = Math.max(1, page);
  if (prev === next) return current;
  return Math.floor(((current - 1) * prev) / next) + 1;
};
