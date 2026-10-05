import { Controller, MessageEvent, Sse, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiProduces, ApiTags } from "@nestjs/swagger";
import { interval, map, merge } from "rxjs";
import { AllowDevice, AuthGuard } from "../auth/auth.guard";
import { SseEventDto } from "../common/models";
import { ApiErrors, ApiOk, ApiTalk } from "../common/openapi";
import { EventsService } from "./events.service";

@ApiTags("events")
@ApiCookieAuth("access")
@ApiErrors()
@UseGuards(AuthGuard)
@AllowDevice()
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse()
  @ApiTalk(
    "events_stream",
    "실시간 알림",
    "발송이 바뀌거나 날짜가 넘어가면 바로 알려 드려요. 15초마다 heartbeat도 보내요.",
  )
  @ApiProduces("text/event-stream")
  @ApiOk(SseEventDto)
  stream() {
    const beats = interval(15_000).pipe(map(() => ({ data: { type: "heartbeat" } })));
    const live = this.events.observe().pipe(map((data): MessageEvent => ({ data })));
    return merge(beats, live);
  }
}
