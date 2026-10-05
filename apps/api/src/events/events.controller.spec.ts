import { firstValueFrom, take } from "rxjs";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

describe("EventsController", () => {
  it("forwards shipment.changed onto the SSE stream", async () => {
    const events = new EventsService();
    const controller = new EventsController(events);
    const next = firstValueFrom(controller.stream().pipe(take(1)));
    events.publish({ type: "shipment.changed", shipmentId: "sse-1" });
    await expect(next).resolves.toEqual({ data: { type: "shipment.changed", shipmentId: "sse-1" } });
    events.onModuleDestroy();
  });
});
