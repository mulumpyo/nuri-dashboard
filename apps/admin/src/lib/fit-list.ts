export const fitListSize = (box: HTMLElement | null, row = 52, chrome = 0) => {
  if (!box) return 10;
  const space = box.clientHeight - chrome - 8;
  if (space <= 0) return 10;
  return Math.min(50, Math.max(1, Math.floor(space / row)));
};
