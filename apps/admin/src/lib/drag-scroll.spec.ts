import { describe, expect, it } from "vitest";
import { bindDragScroll } from "./drag-scroll";

const rail = () => {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollLeft", { writable: true, value: 0 });
  Object.defineProperty(el, "scrollWidth", { value: 400 });
  Object.defineProperty(el, "clientWidth", { value: 200 });
  return el;
};

describe("bindDragScroll", () => {
  it("drags the rail and blocks the following click", () => {
    const el = rail();
    const stop = bindDragScroll(el);

    el.dispatchEvent(new PointerEvent("pointerdown", { clientX: 120, button: 0, pointerId: 1, bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointermove", { clientX: 80, pointerId: 1, bubbles: true }));
    expect(el.scrollLeft).toBe(40);
    expect(el.classList.contains("is-dragging")).toBe(true);

    el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true }));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);

    stop();
  });

  it("lets a card button keep its click", () => {
    const el = rail();
    const button = document.createElement("button");
    el.append(button);
    const stop = bindDragScroll(el);

    button.dispatchEvent(new PointerEvent("pointerdown", { clientX: 120, button: 0, pointerId: 1, bubbles: true }));
    button.dispatchEvent(new PointerEvent("pointermove", { clientX: 80, pointerId: 1, bubbles: true }));
    expect(el.scrollLeft).toBe(0);
    expect(el.classList.contains("is-dragging")).toBe(false);

    stop();
  });
});
