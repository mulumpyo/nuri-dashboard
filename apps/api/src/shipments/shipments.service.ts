import { Injectable } from "@nestjs/common";
import { BOARD_DAYS } from "../domain/constants";
import type { PayType } from "../domain/pay-type";
import { carrierNeedsTime, parseShipTime } from "../domain/ship-time";
import { CarriersService } from "../carriers/carriers.service";
import { conflict, notFound } from "../common/errors";
import { addDays, collectBusinessDays, dayLabel, isStamp, kstDate, TIMEZONE } from "../domain/calendar";
import { EventsService } from "../events/events.service";
import { HolidaysService } from "../holidays/holidays.service";
import { ShipmentsRepository } from "./shipments.repository";

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly repo: ShipmentsRepository,
    private readonly carriers: CarriersService,
    private readonly holidays: HolidaysService,
    private readonly events: EventsService,
  ) {}

  searchCompanies(q: string) {
    return this.repo.searchCompanies(q.trim());
  }

  async add(input: {
    companyName?: string;
    companyId?: string;
    carrierId: string;
    shipDate: string;
    boxCount: number;
    payType?: PayType;
    shipTime?: string;
    note?: string;
  }) {
    const carrier = await this.carriers.find(input.carrierId);
    if (!carrier) throw notFound("CARRIER_NOT_FOUND", "택배사를 찾지 못했어요");
    const company = input.companyId
      ? await this.repo.findCompany(input.companyId)
      : await this.repo.findCompanyByName((input.companyName ?? "").trim());
    if (!company) throw notFound("COMPANY_NOT_FOUND", "등록된 업체가 없어요");
    const payType = input.payType ?? "prepaid";
    const shipTime = this.resolveTime(carrier.name, input.shipTime);
    const row = await this.repo.increment({
      companyId: company.id,
      carrierId: carrier.id,
      shipDate: input.shipDate,
      boxCount: input.boxCount,
      payType,
      shipTime,
      note: this.noteOf(input.note),
    });
    this.events.publish({ type: "shipment.changed", date: input.shipDate, shipmentId: row.id });
    return row;
  }

  async patch(id: string, input: { boxCount?: number; payType?: PayType; shipTime?: string; note?: string }) {
    let row = input.boxCount != null ? await this.repo.updateCount(id, input.boxCount) : await this.repo.find(id);
    if (!row) throw notFound("SHIPMENT_NOT_FOUND", "발송 내역이 없어요");
    if (input.payType && input.payType !== row.payType) {
      try {
        row = await this.repo.updatePayType(id, input.payType);
      } catch {
        throw conflict("PAY_TYPE_EXISTS", "같은 날·택배사에 이미 그 결제 구분이 있어요");
      }
    }
    if (input.shipTime !== undefined) {
      const carrier = await this.carriers.find(row.carrierId);
      if (!carrier) throw notFound("CARRIER_NOT_FOUND", "택배사를 찾지 못했어요");
      const shipTime = this.resolveTime(carrier.name, input.shipTime);
      if (shipTime) row = await this.repo.updateShipTime(id, shipTime);
    }
    if (input.note !== undefined) {
      const next = this.noteOf(input.note);
      if (next !== (row.note ?? "")) {
        const moved = await this.repo.updateNote(row.id, next);
        if (!moved) throw notFound("SHIPMENT_NOT_FOUND", "발송 내역이 없어요");
        row = moved;
      }
    }
    if (!row) throw notFound("SHIPMENT_NOT_FOUND", "발송 내역이 없어요");
    this.events.publish({ type: "shipment.changed", date: row.shipDate, shipmentId: row.id });
    return row;
  }

  async remove(id: string) {
    const row = await this.repo.remove(id);
    if (!row) throw notFound("SHIPMENT_NOT_FOUND", "발송 내역이 없어요");
    this.events.publish({ type: "shipment.changed", date: row.shipDate, shipmentId: row.id });
    return { status: "ok" };
  }

  async board(from?: string, asOf?: string) {
    const today = isStamp(asOf) ? asOf : kstDate();
    const start = from ?? today;
    const holidayRows = await this.holidays.list();
    const holidaySet = new Set(holidayRows.map((row) => row.date));
    const days = collectBusinessDays(start, BOARD_DAYS, holidaySet);
    const last = days[days.length - 1] ?? start;
    const [carrierList, rows] = await Promise.all([this.carriers.list(), this.repo.inRange(days[0] ?? start, last)]);
    const tomorrow = addDays(today, 1);
    return {
      from: start,
      timezone: TIMEZONE,
      days: days.map((date) => ({
        date,
        label: dayLabel(date, today),
        isToday: date === today,
        isTomorrow: date === tomorrow,
        carriers: carrierList
          .filter((carrier) => carrier.active)
          .sort((a, b) => Number(b.name === "경기택배") - Number(a.name === "경기택배"))
          .map((carrier) => ({
            carrierId: carrier.id,
            name: carrier.name,
            companies: rows
              .filter((row) => row.shipDate === date && row.carrierId === carrier.id)
              .sort((a, b) => (a.shipTime ?? "").localeCompare(b.shipTime ?? "") || a.companyName.localeCompare(b.companyName, "ko"))
              .map((row) => ({
                companyId: row.companyId,
                name: row.companyName,
                boxCount: row.boxCount,
                payType: row.payType === "collect" ? "collect" : "prepaid",
                shipTime: row.shipTime ?? null,
                note: row.note ?? "",
                shipmentId: row.id,
              })),
          })),
      })),
    };
  }

  private resolveTime(carrierName: string, value?: string) {
    const shipTime = parseShipTime(value);
    return carrierNeedsTime(carrierName) ? shipTime : null;
  }

  private noteOf(value?: string) {
    return (value ?? "").trim().slice(0, 40);
  }
}
