export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const focusables = (root: ParentNode | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
    (el) => el.tabIndex !== -1 && !el.closest("[inert]"),
  );

export const trapTab = (event: KeyboardEvent, root: ParentNode | null) => {
  if (event.key !== "Tab") return;
  const nodes = focusables(root);
  if (!nodes.length) return;
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

export const setInert = (on: boolean, ...selectors: string[]) => {
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => {
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }
};
