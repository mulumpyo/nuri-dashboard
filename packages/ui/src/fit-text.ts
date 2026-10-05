export const fitText = (el: HTMLElement, minPx = 10) => {
  el.style.whiteSpace = "nowrap";
  el.style.overflow = "hidden";
  const width = el.clientWidth;
  if (!width) return;
  el.style.removeProperty("font-size");
  const max = parseFloat(getComputedStyle(el).fontSize);
  const min = Math.max(minPx, max * 0.32);
  let lo = min;
  let hi = max;
  let best = min;
  for (let i = 0; i < 18; i += 1) {
    const size = (lo + hi) / 2;
    el.style.fontSize = `${size}px`;
    if (el.scrollWidth <= width + 0.5) {
      best = size;
      lo = size;
    } else {
      hi = size;
    }
  }
  el.style.fontSize = `${best}px`;
};
