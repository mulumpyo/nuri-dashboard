import { EventsService } from "./events.service";
import { kstDate } from "../domain/calendar";

jest.mock("../domain/calendar", () => ({
  ...jest.requireActual("../domain/calendar"),
  kstDate: jest.fn(),
}));

const kst = kstDate as jest.MockedFunction<typeof kstDate>;

describe("EventsService", () => {
  afterEach(() => {
    kst.mockReset();
  });

  it("publishes day.boundary when the KST date changes", () => {
    kst.mockReturnValue("2026-09-23");
    const events = new EventsService();
    const seen: { type: string; date?: string }[] = [];
    const sub = events.observe().subscribe((row) => seen.push(row));
    events.checkBoundary();
    expect(seen).toEqual([]);
    kst.mockReturnValue("2026-09-24");
    events.checkBoundary();
    expect(seen).toEqual([{ type: "day.boundary", date: "2026-09-24" }]);
    events.checkBoundary();
    expect(seen).toHaveLength(1);
    sub.unsubscribe();
    events.onModuleDestroy();
  });
});
