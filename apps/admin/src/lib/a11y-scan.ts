const nameOf = (el: Element) => {
  const labelled = el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby");
  if (el.getAttribute("aria-labelledby")) {
    const ids = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
    const text = ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join(" ");
    if (text) return text;
  }
  if (labelled) return el.getAttribute("aria-label")?.trim() ?? labelled;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.labels?.length) return Array.from(el.labels).map((row) => row.textContent?.trim() ?? "").join(" ");
    return el.getAttribute("placeholder")?.trim() ?? el.getAttribute("title")?.trim() ?? "";
  }
  if (el instanceof HTMLImageElement) return el.getAttribute("alt")?.trim() ?? "";
  return (el.textContent ?? "").replace(/\s+/g, " ").trim() || (el.getAttribute("title")?.trim() ?? "");
};

export const scanNames = (root: ParentNode) => {
  const gaps: string[] = [];
  const seen = new Set<string>();
  root.querySelectorAll<HTMLElement>("button, [role='button'], [role='dialog'], [role='tab'], [role='tabpanel']").forEach((el, index) => {
    if (el.getAttribute("aria-hidden") === "true") return;
    if (!nameOf(el)) gaps.push(`${el.tagName.toLowerCase()}[${index}]`);
  });
  root.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
    const id = el.id;
    if (!id) return;
    if (seen.has(id)) gaps.push(`duplicate#${id}`);
    seen.add(id);
  });
  return gaps;
};
