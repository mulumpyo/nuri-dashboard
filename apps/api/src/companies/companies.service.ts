import { Injectable } from "@nestjs/common";
import { badRequest, conflict, notFound } from "../common/errors";
import { EventsService } from "../events/events.service";
import { CompaniesRepository } from "./companies.repository";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

@Injectable()
export class CompaniesService {
  constructor(
    private readonly repo: CompaniesRepository,
    private readonly events: EventsService,
  ) {}

  list(q = "", page = 1, limit = 20) {
    return this.repo.list(q, clamp(Math.trunc(page) || 1, 1, 999), clamp(Math.trunc(limit) || 20, 1, 50));
  }

  find(id: string) {
    return this.repo.find(id);
  }

  findByName(name: string) {
    return this.repo.findByName(name);
  }

  async create(name: string) {
    const trimmed = name.trim();
    if (await this.repo.findByName(trimmed)) throw conflict("COMPANY_EXISTS", "이미 있는 업체예요");
    return this.repo.create(trimmed);
  }

  async update(id: string, name: string) {
    const trimmed = name.trim();
    const other = await this.repo.findByName(trimmed);
    if (other && other.id !== id) throw conflict("COMPANY_EXISTS", "이미 있는 업체예요");
    const row = await this.repo.update(id, trimmed);
    if (!row) throw notFound("COMPANY_NOT_FOUND", "등록된 업체가 없어요");
    this.events.publish({ type: "shipment.changed" });
    return row;
  }

  async remove(id: string) {
    const row = await this.repo.remove(id);
    if (!row) throw notFound("COMPANY_NOT_FOUND", "등록된 업체가 없어요");
    this.events.publish({ type: "shipment.changed" });
    return { status: "ok" as const };
  }

  async removeMany(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (!unique.length) throw badRequest("COMPANY_IDS_REQUIRED", "지울 업체를 골라 주세요");
    let deleted = 0;
    for (const id of unique) {
      const row = await this.repo.remove(id);
      if (row) deleted += 1;
    }
    if (deleted) this.events.publish({ type: "shipment.changed" });
    return { deleted };
  }
}
