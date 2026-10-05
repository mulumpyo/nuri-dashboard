import { Injectable } from "@nestjs/common";
import { Response } from "express";
import { AuthRepository } from "../auth/auth.repository";
import { AuthSessionService } from "../auth/auth.session-service";
import { badRequest, notFound } from "../common/errors";
import { PAIRING_TTL_SEC } from "../domain/constants";
import { EventsService } from "../events/events.service";
import { DevicesRepository } from "./devices.repository";

type PairState = { status: "pending" | "approved"; deviceId?: string };

const digits = (code: string) => code.replace(/\D/g, "").slice(0, 6);

@Injectable()
export class DevicesService {
  constructor(
    private readonly repo: DevicesRepository,
    private readonly tokens: AuthRepository,
    private readonly auth: AuthSessionService,
    private readonly events: EventsService,
  ) {}

  async requestCode() {
    const code = this.tokens.createCode();
    await this.tokens.savePairing(code, JSON.stringify({ status: "pending" } satisfies PairState), PAIRING_TTL_SEC);
    return { code, expiresIn: PAIRING_TTL_SEC };
  }

  async status(code: string) {
    const raw = await this.tokens.getPairing(digits(code));
    if (!raw) throw notFound("PAIR_EXPIRED", "코드가 만료됐어요");
    return JSON.parse(raw) as PairState;
  }

  async approve(code: string, userId: string) {
    const pin = digits(code);
    const raw = await this.tokens.getPairing(pin);
    if (!raw) throw notFound("PAIR_EXPIRED", "코드가 만료됐어요");
    const current = JSON.parse(raw) as PairState;
    if (current.status === "approved" && current.deviceId) return { status: "ok", deviceId: current.deviceId };
    const attemptsKey = `pair-try:${pin}`;
    const tries = Number((await this.tokens.getPairing(attemptsKey)) ?? "0") + 1;
    await this.tokens.savePairing(attemptsKey, String(tries), PAIRING_TTL_SEC);
    if (tries > 8) throw badRequest("PAIR_LOCKED", "시도 횟수를 넘었어요");
    const device = await this.repo.create({ name: "디스플레이", approvedBy: userId });
    await this.tokens.savePairing(
      pin,
      JSON.stringify({ status: "approved", deviceId: device.id } satisfies PairState),
      PAIRING_TTL_SEC,
    );
    return { status: "ok", deviceId: device.id };
  }

  async claim(code: string, res: Response, origin?: string) {
    const pin = digits(code);
    const state = await this.status(pin);
    if (state.status !== "approved" || !state.deviceId) throw badRequest("PAIR_PENDING", "아직 연결되지 않았어요");
    await this.auth.issuePair(res, { userId: state.deviceId, kind: "device", deviceId: state.deviceId }, origin);
    await this.tokens.dropPairing(pin);
    return { status: "ok", deviceId: state.deviceId };
  }

  list() {
    return this.repo.list();
  }

  async revoke(id: string) {
    const row = await this.repo.revoke(id);
    if (!row) throw notFound("DEVICE_NOT_FOUND", "연결된 화면이 없어요");
    await this.tokens.dropDevice(id);
    this.events.publish({ type: "device.revoked", deviceId: id });
    return { status: "ok" };
  }
}
