import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Subject } from "rxjs";
import { kstDate } from "../domain/calendar";

export type SsePayload = { type: string; date?: string; shipmentId?: string; deviceId?: string };

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly stream = new Subject<SsePayload>();
  private lastDay = kstDate();
  private timer?: ReturnType<typeof setInterval>;

  onModuleInit(): void {
    this.timer = setInterval(() => this.checkBoundary(), 30_000);
  }

  checkBoundary(now = new Date()): void {
    const today = kstDate(now);
    if (today === this.lastDay) return;
    this.lastDay = today;
    this.publish({ type: "day.boundary", date: today });
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  publish(payload: SsePayload): void {
    this.stream.next(payload);
  }

  observe() {
    return this.stream.asObservable();
  }
}
