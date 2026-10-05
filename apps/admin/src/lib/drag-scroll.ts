const THRESHOLD = 6;
const IGNORE = "button, a, input, select, textarea, label, [role='switch']";

export const bindDragScroll = (el: HTMLElement) => {
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  let moved = false;
  let pointerId: number | null = null;

  const down = (event: PointerEvent) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if ((event.target as HTMLElement | null)?.closest(IGNORE)) return;
    startX = event.clientX;
    startLeft = el.scrollLeft;
    dragging = true;
    moved = false;
    pointerId = event.pointerId;
  };

  const move = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    if (!moved && Math.abs(dx) < THRESHOLD) return;
    if (!moved && pointerId !== null) el.setPointerCapture?.(pointerId);
    moved = true;
    el.classList.add("is-dragging");
    el.scrollLeft = startLeft - dx;
    event.preventDefault();
  };

  const up = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null && el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    pointerId = null;
    el.classList.remove("is-dragging");
    if (!moved) return;
    const block = (next: Event) => {
      next.preventDefault();
      next.stopPropagation();
    };
    el.addEventListener("click", block, { capture: true, once: true });
    event.preventDefault();
  };

  const wheel = (event: WheelEvent) => {
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    el.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", wheel, { passive: false });

  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("wheel", wheel);
    el.classList.remove("is-dragging");
  };
};
