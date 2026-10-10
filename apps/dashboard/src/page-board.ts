import { pinLeadCarrier, type BoardCompany, type BoardDay } from "@nuri/shared";

export const BOARD_ROWS = 9;
export const BOARD_PAGE_MS = 8000;

export type BoardSlot = BoardCompany & {
  carrierId: string;
  carrier: string;
  showCarrier: boolean;
};

export const flattenDay = (day: BoardDay): Omit<BoardSlot, "showCarrier">[] =>
  pinLeadCarrier(day.carriers).flatMap((group) =>
    group.companies.map((row) => ({
      ...row,
      carrierId: group.carrierId,
      carrier: group.name,
    })),
  );

export const markCarriers = (rows: Omit<BoardSlot, "showCarrier">[]): BoardSlot[] =>
  rows.map((row, i) => ({
    ...row,
    showCarrier: i === 0 || row.carrierId !== rows[i - 1]?.carrierId,
  }));

export const dayPages = (day: BoardDay): BoardSlot[][] => {
  const rows = flattenDay(day);
  if (!rows.length) return [[]];
  const pages: BoardSlot[][] = [];
  for (let i = 0; i < rows.length; i += BOARD_ROWS) {
    pages.push(markCarriers(rows.slice(i, i + BOARD_ROWS)));
  }
  return pages;
};

export const pageIndex = (count: number, tick: number) => (count > 0 ? tick % count : 0);

export type ViewDay = {
  date: string;
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  page: BoardSlot[];
  pageIndex: number;
  pageCount: number;
};

export const viewDays = (days: BoardDay[], tick: number, paged = true): ViewDay[] =>
  days.map((day) => {
    const pages = paged ? dayPages(day) : [markCarriers(flattenDay(day))];
    const index = paged ? pageIndex(pages.length, tick) : 0;
    return {
      date: day.date,
      label: day.label,
      isToday: day.isToday,
      isTomorrow: day.isTomorrow,
      page: pages[index] ?? [],
      pageIndex: index,
      pageCount: pages.length,
    };
  });
