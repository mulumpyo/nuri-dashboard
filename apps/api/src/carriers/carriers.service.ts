import { Injectable, OnModuleInit } from "@nestjs/common";
import { DEFAULT_CARRIERS, isDefaultCarrier } from "@nuri/shared";
import { conflict, notFound } from "../common/errors";
import { EventsService } from "../events/events.service";
import { CarriersRepository } from "./carriers.repository";

@Injectable()
export class CarriersService implements OnModuleInit {
  constructor(
    private readonly repo: CarriersRepository,
    private readonly events: EventsService,
  ) {}

  onModuleInit() {
    return this.repo.ensureDefaults(DEFAULT_CARRIERS);
  }

  list() {
    return this.repo.list();
  }

  find(id: string) {
    return this.repo.find(id);
  }

  async create(body: { name: string; sortOrder?: number }) {
    const row = await this.repo.create({ name: body.name.trim(), sortOrder: body.sortOrder ?? 99, active: true });
    this.events.publish({ type: "shipment.changed" });
    return row;
  }

  async update(id: string, body: Partial<{ name: string; sortOrder: number; active: boolean }>) {
    const row = await this.repo.update(id, body.name ? { ...body, name: body.name.trim() } : body);
    if (!row) throw notFound("CARRIER_NOT_FOUND", "택배사를 찾지 못했어요");
    this.events.publish({ type: "shipment.changed" });
    return row;
  }

  async remove(id: string) {
    const current = await this.repo.find(id);
    if (!current) throw notFound("CARRIER_NOT_FOUND", "택배사를 찾지 못했어요");
    if (isDefaultCarrier(current.name)) throw conflict("CARRIER_DEFAULT", "기본 택배사는 지울 수 없어요");
    const row = await this.repo.remove(id);
    if (!row) throw notFound("CARRIER_NOT_FOUND", "택배사를 찾지 못했어요");
    this.events.publish({ type: "shipment.changed" });
    return { status: "ok" as const };
  }
}
