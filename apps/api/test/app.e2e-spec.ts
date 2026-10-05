import { INestApplication } from "@nestjs/common";
import { get as httpGet } from "node:http";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { firstValueFrom, filter, take, timeout } from "rxjs";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/setup-app";
import { DB, PG } from "../src/db/db.module";
import { REDIS } from "../src/redis/redis.module";
import { eq } from "drizzle-orm";
import { invites, users } from "../src/db/schema";
import { EventsService } from "../src/events/events.service";
import { createTotp } from "../src/domain/totp";
import type { Database } from "../src/db/drizzle";
import { deviceTag } from "@nuri/shared";
import { OPENAPI_OPS } from "../src/common/openapi";
import { cookieOf, hasInfra, sweepE2e } from "./helpers";

(hasInfra ? describe : describe.skip)("app e2e", () => {
  let app: INestApplication;
  let auth: { Cookie: string };
  let document: ReturnType<typeof setupApp>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    document = setupApp(app);
    await app.init();
    const db = app.get(DB) as Database;
    const jwt = app.get(JwtService);
    await sweepE2e(db);
    const [user] = await db
      .insert(users)
      .values({ email: `e2e-${Date.now()}@nuri.test`, role: "owner" })
      .returning();
    auth = { Cookie: `access=${jwt.sign({ sub: user.id, kind: "admin", role: "owner" })}` };
  });

  afterAll(async () => {
    const db = app.get(DB) as Database;
    await sweepE2e(db).catch(() => undefined);
    const redis = app.get(REDIS) as { quit: () => Promise<unknown> };
    const pg = app.get(PG) as { client: { end: () => Promise<void> } };
    await app.close();
    await redis.quit().catch(() => undefined);
    await pg.client.end().catch(() => undefined);
  }, 20_000);

  const stamp = () => Date.now();

  const lastRecoveryToken = async () => {
    const redis = app.get(REDIS) as {
      keys: (pattern: string) => Promise<string[]>;
      ttl: (key: string) => Promise<number>;
    };
    const keys = await redis.keys("chal:rec:*");
    if (!keys.length) throw new Error("recovery token missing");
    let latest = keys[0]!;
    let remain = -1;
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl > remain) {
        remain = ttl;
        latest = key;
      }
    }
    return latest.slice("chal:rec:".length);
  };

  it("exposes openapi tags and operation ids", async () => {
    const verbs = ["get", "post", "put", "patch", "delete"] as const;
    const ops = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
      verbs.flatMap((verb) => {
        const op = (item as Record<string, { operationId?: string; summary?: string; description?: string } | undefined>)?.[
          verb
        ];
        return op ? [{ path, verb, id: op.operationId, summary: op.summary, description: op.description }] : [];
      }),
    );
    expect(ops.filter((row) => !row.id || !row.summary || !row.description)).toEqual([]);
    expect(ops.map((row) => row.id).sort()).toEqual([...OPENAPI_OPS].sort());
    const paths = Object.keys(document.paths ?? {});
    expect(paths).toEqual(
      expect.arrayContaining([
        "/api/health/ready",
        "/api/shipments",
        "/api/events",
        "/api/holidays/sync",
        "/api/carriers",
        "/api/auth/logout",
        "/api/auth/invites",
        "/api/auth/users",
        "/api/auth/security",
        "/api/devices/claim",
        "/api/companies",
        "/api/companies/bulk-delete",
        "/api/auth/activity",
      ]),
    );
    const board = document.paths?.["/api/shipments/board"]?.get as {
      parameters?: { name?: string }[];
      responses?: Record<string, { content?: Record<string, unknown> }>;
    };
    expect(board.parameters?.some((row) => row.name === "from")).toBe(true);
    expect(board.responses?.["200"]?.content?.["application/json"]).toBeTruthy();
    const companies = document.paths?.["/api/companies"]?.get as {
      parameters?: { name?: string }[];
      responses?: Record<string, { content?: Record<string, unknown> }>;
    };
    expect(companies.parameters?.map((row) => row.name)).toEqual(expect.arrayContaining(["q", "page", "limit"]));
    expect(companies.parameters?.find((row) => row.name === "q") as { description?: string }).toMatchObject({
      description: expect.stringMatching(/이름/),
    });
    expect(companies.responses?.["200"]?.content?.["application/json"]).toBeTruthy();
    const companyPage = document.components?.schemas?.CompanyPageDto as { properties?: { total?: { description?: string } } };
    expect(companyPage.properties?.total?.description).toMatch(/전체/);
    const createShip = document.paths?.["/api/shipments"]?.post as {
      requestBody?: { content?: { "application/json"?: { schema?: { $ref?: string } } } };
    };
    const shipRef = createShip.requestBody?.content?.["application/json"]?.schema?.$ref ?? "";
    const shipName = shipRef.split("/").at(-1) ?? "";
    const shipDto = document.components?.schemas?.[shipName] as {
      properties?: { carrierId?: { description?: string } };
    };
    expect(shipDto.properties?.carrierId?.description).toMatch(/택배사/);
    const login = document.paths?.["/api/auth/login"]?.post as {
      description?: string;
      responses?: Record<string, unknown>;
    };
    expect(login.description).toMatch(/초대/);
    expect(login.responses?.["429"]).toBeTruthy();
    expect(login.responses?.["502"]).toBeTruthy();
    const issued = document.components?.schemas?.PairIssuedDto as { properties?: { expiresIn?: { type?: string } } };
    expect(issued.properties?.expiresIn).toBeTruthy();
    const createTalk = document.paths?.["/api/shipments"]?.post as { description?: string };
    expect(createTalk.description).toMatch(/결제/);
    const holidaysSync = document.paths?.["/api/holidays/sync"]?.post as { description?: string };
    expect(holidaysSync.description).toMatch(/쉬는/);
    const rename = document.paths?.["/api/companies/{id}"]?.patch as { description?: string; summary?: string };
    expect(rename.summary).toBe("업체 이름 수정");
    expect(rename.description).toMatch(/이름/);
    const refresh = document.paths?.["/api/auth/refresh"]?.post as {
      responses?: Record<string, { content?: Record<string, unknown> }>;
    };
    expect(refresh.responses?.["200"]?.content?.["application/json"]).toBeTruthy();
    await request(app.getHttpServer()).get("/api/docs").expect(200);
  });

  it("increments the same shipment, patches, searches, and deletes", async () => {
    const listed = await request(app.getHttpServer()).get("/api/carriers").set(auth).expect(200);
    let carrierId = listed.body[0]?.id as string | undefined;
    if (!carrierId) {
      const created = await request(app.getHttpServer())
        .post("/api/carriers")
        .set(auth)
        .send({ name: `CJ-${stamp()}` })
        .expect(201);
      carrierId = created.body.id as string;
    }
    const events = app.get(EventsService);
    const changed = firstValueFrom(
      events.observe().pipe(
        filter((row) => row.type === "shipment.changed"),
        take(1),
        timeout(3000),
      ),
    );
    const companyName = `한빛상사-${stamp()}`;
    await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name: companyName }).expect(201);
    const log = await request(app.getHttpServer()).get("/api/auth/activity?kind=work").set(auth).expect(200);
    expect(
      log.body.items.some(
        (row: { talk: string; detail: string }) => row.detail === companyName && row.talk.includes("등록"),
      ),
    ).toBe(true);
    const pages = await request(app.getHttpServer())
      .get(`/api/companies?q=${encodeURIComponent(companyName)}&page=1&limit=8`)
      .set(auth)
      .expect(200);
    expect(pages.body.items.some((row: { name: string }) => row.name === companyName)).toBe(true);
    expect(pages.body.page).toBe(1);
    const extra = `${companyName}-더`;
    await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name: extra }).expect(201);
    const page2 = await request(app.getHttpServer())
      .get(`/api/companies?q=${encodeURIComponent(companyName)}&page=2&limit=1`)
      .set(auth)
      .expect(200);
    expect(page2.body.page).toBe(2);
    expect(page2.body.pages).toBeGreaterThanOrEqual(2);
    expect(page2.body.total).toBeGreaterThanOrEqual(2);
    expect(page2.body.items).toHaveLength(1);
    const clamped = await request(app.getHttpServer())
      .get(`/api/companies?q=${encodeURIComponent(companyName)}&page=1&limit=999`)
      .set(auth)
      .expect(200);
    expect(clamped.body.limit).toBeLessThanOrEqual(50);
    const first = await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 2 })
      .expect(201);
    await changed;
    const second = await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 3 })
      .expect(201);
    expect(second.body.boxCount).toBe((first.body.boxCount as number) + 3);
    expect(second.body.payType ?? "prepaid").toBe("prepaid");
    const collect = await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 1, payType: "collect" })
      .expect(201);
    expect(collect.body.id).not.toBe(second.body.id);
    expect(collect.body.payType).toBe("collect");
    expect(collect.body.boxCount).toBe(1);
    const clash = await request(app.getHttpServer())
      .patch(`/api/shipments/${second.body.id}`)
      .set(auth)
      .send({ payType: "collect" })
      .expect(409);
    expect(clash.body.code).toBe("PAY_TYPE_EXISTS");
    const patched = await request(app.getHttpServer())
      .patch(`/api/shipments/${second.body.id}`)
      .set(auth)
      .send({ boxCount: 9 })
      .expect(200);
    expect(patched.body.boxCount).toBe(9);
    const boardPay = await request(app.getHttpServer()).get("/api/shipments/board?from=2026-09-23").set(auth).expect(200);
    const pays = (boardPay.body.days as { carriers: { companies: { payType?: string; name?: string }[] }[] }[])
      .flatMap((day) => day.carriers)
      .flatMap((group) => group.companies)
      .filter((row) => row.name === companyName)
      .map((row) => row.payType);
    expect(pays).toEqual(expect.arrayContaining(["prepaid", "collect"]));
    const companies = await request(app.getHttpServer())
      .get(`/api/shipments/companies?q=${encodeURIComponent(companyName)}`)
      .set(auth)
      .expect(200);
    expect(companies.body.some((row: { name: string }) => row.name === companyName)).toBe(true);
    await request(app.getHttpServer()).delete(`/api/shipments/${second.body.id}`).set(auth).expect(200);
    const board = await request(app.getHttpServer()).get("/api/shipments/board?from=2026-09-23").set(auth).expect(200);
    expect(board.body.timezone).toBe("Asia/Seoul");
    expect(board.body.days).toHaveLength(4);
    expect(board.headers["x-request-id"]).toBeTruthy();
  });

  it("requires and shows ship time for 퀵발송", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/carriers")
      .set(auth)
      .send({ name: `퀵-${stamp()}` })
      .expect(201);
    const carrierId = created.body.id as string;
    const companyName = `한빛상사-${stamp()}`;
    await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name: companyName }).expect(201);
    await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 1 })
      .expect(400);
    const first = await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 1, shipTime: "14:30" })
      .expect(201);
    expect(first.body.shipTime).toBe("14:30");
    const again = await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 2, shipTime: "16:00" })
      .expect(201);
    expect(again.body.id).toBe(first.body.id);
    expect(again.body.boxCount).toBe(3);
    expect(again.body.shipTime).toBe("16:00");
    const patched = await request(app.getHttpServer())
      .patch(`/api/shipments/${first.body.id}`)
      .set(auth)
      .send({ shipTime: "17:30" })
      .expect(200);
    expect(patched.body.shipTime).toBe("17:30");
    const board = await request(app.getHttpServer()).get("/api/shipments/board?from=2026-09-23").set(auth).expect(200);
    const found = (board.body.days as { carriers: { companies: { shipTime?: string }[] }[] }[])
      .flatMap((day) => day.carriers)
      .flatMap((group) => group.companies)
      .find((row) => row.shipTime === "17:30");
    expect(found).toBeTruthy();
  });

  it("registers companies and deletes them with their shipments", async () => {
    const name = `등록업체-${stamp()}`;
    const created = await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name }).expect(201);
    await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name }).expect(409);
    await request(app.getHttpServer()).delete(`/api/companies/${created.body.id}`).set(auth).expect(200);

    const kept = `유지업체-${stamp()}`;
    const row = await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name: kept }).expect(201);
    const carriers = await request(app.getHttpServer()).get("/api/carriers").set(auth).expect(200);
    let carrierId = carriers.body[0]?.id as string | undefined;
    if (!carrierId) {
      const carrier = await request(app.getHttpServer())
        .post("/api/carriers")
        .set(auth)
        .send({ name: `CJ-${stamp()}` })
        .expect(201);
      carrierId = carrier.body.id as string;
    }
    await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyId: row.body.id, carrierId, shipDate: "2026-09-23", boxCount: 1 })
      .expect(201);
    await request(app.getHttpServer()).delete(`/api/companies/${row.body.id}`).set(auth).expect(200);
    const after = await request(app.getHttpServer()).get("/api/shipments/board?from=2026-09-23").set(auth).expect(200);
    const leftover = (after.body.days as { carriers: { companies: { name: string }[] }[] }[])
      .flatMap((day) => day.carriers)
      .flatMap((group) => group.companies)
      .some((item) => item.name === kept);
    expect(leftover).toBe(false);
    const extraA = await request(app.getHttpServer())
      .post("/api/companies")
      .set(auth)
      .send({ name: `일괄A-${stamp()}` })
      .expect(201);
    const extraB = await request(app.getHttpServer())
      .post("/api/companies")
      .set(auth)
      .send({ name: `일괄B-${stamp()}` })
      .expect(201);
    const bulk = await request(app.getHttpServer())
      .post("/api/companies/bulk-delete")
      .set(auth)
      .send({ ids: [extraA.body.id, extraB.body.id] })
      .expect(201);
    expect(bulk.body.deleted).toBe(2);
    await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName: `없는업체-${stamp()}`, carrierId, shipDate: "2026-09-23", boxCount: 1 })
      .expect(404);
  });

  it("creates a holiday that the board skips", async () => {
    await request(app.getHttpServer())
      .post("/api/holidays")
      .set(auth)
      .send({ date: "2027-03-11", name: "E2E휴일" })
      .expect(201);
    const listed = await request(app.getHttpServer()).get("/api/holidays").set(auth).expect(200);
    expect(listed.body.some((row: { date: string }) => row.date === "2027-03-11")).toBe(true);
    const board = await request(app.getHttpServer()).get("/api/shipments/board?from=2027-03-10").set(auth).expect(200);
    const dates = (board.body.days as { date: string }[]).map((row) => row.date);
    expect(dates).toEqual(["2027-03-10", "2027-03-12", "2027-03-15", "2027-03-16"]);
    await request(app.getHttpServer()).delete("/api/holidays/2027-03-11").set(auth).expect(200);
  });

  it("returns holiday sync status without blocking", async () => {
    const sync = await request(app.getHttpServer()).post("/api/holidays/sync").set(auth).expect(201);
    expect(["ok", "degraded"]).toContain(sync.body.status);
    await request(app.getHttpServer()).get("/api/holidays/status").set(auth).expect(200);
  });

  it("hides and deletes a carrier with its shipments", async () => {
    const name = `삭제택배-${stamp()}`;
    const created = await request(app.getHttpServer()).post("/api/carriers").set(auth).send({ name }).expect(201);
    const carrierId = created.body.id as string;
    const companyName = `업체-${stamp()}`;
    await request(app.getHttpServer()).post("/api/companies").set(auth).send({ name: companyName }).expect(201);
    await request(app.getHttpServer())
      .post("/api/shipments")
      .set(auth)
      .send({ companyName, carrierId, shipDate: "2026-09-23", boxCount: 1 })
      .expect(201);
    await request(app.getHttpServer()).patch(`/api/carriers/${carrierId}`).set(auth).send({ active: false }).expect(200);
    const hidden = await request(app.getHttpServer()).get("/api/shipments/board?from=2026-09-23").set(auth).expect(200);
    const names = (hidden.body.days as { carriers: { name: string }[] }[]).flatMap((day) =>
      day.carriers.map((row) => row.name),
    );
    expect(names).not.toContain(name);
    const events = app.get(EventsService);
    const changed = firstValueFrom(
      events.observe().pipe(
        filter((row) => row.type === "shipment.changed"),
        take(1),
        timeout(3000),
      ),
    );
    await request(app.getHttpServer()).delete(`/api/carriers/${carrierId}`).set(auth).expect(200);
    await changed;
  });

  it("pairs a display then revokes it", async () => {
    const issued = await request(app.getHttpServer()).post("/api/devices/code").expect(201);
    expect(issued.body.code).toMatch(/^\d{6}$/);
    await request(app.getHttpServer()).get(`/api/devices/code/${issued.body.code}`).expect(200);
    await request(app.getHttpServer())
      .post("/api/devices/claim")
      .send({ code: issued.body.code })
      .expect(400);
    const approved = await request(app.getHttpServer())
      .post("/api/devices/approve")
      .set(auth)
      .send({ code: issued.body.code })
      .expect(201);
    const claimed = await request(app.getHttpServer())
      .post("/api/devices/claim")
      .send({ code: issued.body.code })
      .expect(201);
    const deviceAccess = cookieOf(claimed, "access");
    expect(deviceAccess).toBeTruthy();
    await request(app.getHttpServer()).get("/api/shipments/board").set("Cookie", deviceAccess).expect(200);
    await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", deviceAccess).expect(200);
    await request(app.getHttpServer()).get("/api/devices").set("Cookie", deviceAccess).expect(403);
    await request(app.getHttpServer())
      .post("/api/shipments")
      .set("Cookie", deviceAccess)
      .send({ carrierId: "x", shipDate: "2026-10-03", boxCount: 1 })
      .expect(403);
    const devices = await request(app.getHttpServer()).get("/api/devices").set(auth).expect(200);
    expect(devices.body.some((row: { id: string }) => row.id === approved.body.deviceId)).toBe(true);
    const tag = deviceTag(String(approved.body.deviceId));
    const paired = await request(app.getHttpServer())
      .get(`/api/auth/activity?kind=work&q=${encodeURIComponent(tag)}`)
      .set(auth)
      .expect(200);
    expect(
      paired.body.items.some(
        (row: { talk: string; detail: string }) => row.detail.includes(tag) && row.talk.includes("연결했어요"),
      ),
    ).toBe(true);

    await request(app.getHttpServer()).post(`/api/devices/${approved.body.deviceId}/revoke`).set(auth).expect(201);
    await request(app.getHttpServer()).get("/api/shipments/board").set("Cookie", deviceAccess).expect(401);
  });

  it("invites an admin who can start without TOTP", async () => {
    const email = `invite-${stamp()}@nuri.test`;
    await request(app.getHttpServer()).patch("/api/auth/security").set(auth).send({ totpRequired: true }).expect(403);
    const invited = await request(app.getHttpServer()).post("/api/auth/invites").set(auth).send({ email }).expect(201);
    expect(invited.body.link).toContain("/invite/");
    const token = String(invited.body.link).split("/invite/")[1];
    const missingLogin = await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    expect(missingLogin.body.mode).toBe("password");
    const blocked = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email, password: "nuri-pass-1" })
      .expect(401);
    expect(blocked.body.code).toBe("PASSWORD_INVALID");
    const peek = await request(app.getHttpServer()).get(`/api/auth/invite/${token}`).expect(200);
    expect(peek.body.status).toBe("ok");
    const accepted = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ token, password: "nuri-pass-1" })
      .expect(201);
    expect(accepted.body.mode).toBe("ready");
    const access = cookieOf(accepted, "access");
    const me = await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", access).expect(200);
    expect(me.body.role).toBe("admin");
    expect(me.body.email).toBe(email);
    expect(me.body.totpRequired).toBe(false);
    expect(me.body.canManageTotp).toBe(false);
    expect(me.body.canManageUsers).toBe(false);
    await request(app.getHttpServer()).get("/api/auth/users").set("Cookie", access).expect(403);
    await request(app.getHttpServer()).get("/api/auth/activity").set("Cookie", access).expect(403);
    await request(app.getHttpServer()).post("/api/auth/invites").set("Cookie", access).send({ email: `no-${stamp()}@nuri.test` }).expect(403);
    await request(app.getHttpServer()).post("/api/auth/logout").set("Cookie", access).expect(200);
    const again = await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    expect(again.body.mode).toBe("password");
    await request(app.getHttpServer()).post("/api/auth/login/verify").send({ email }).expect(400);
    const session = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email, password: "nuri-pass-1" })
      .expect(201);
    expect(cookieOf(session, "access")).toBeTruthy();
    const logins = await request(app.getHttpServer()).get("/api/auth/activity?kind=login&q=" + encodeURIComponent(email)).set(auth).expect(200);
    expect(
      logins.body.items.some(
        (row: { email: string; talk: string; actor: string }) =>
          row.email === email && row.talk.includes("로그인") && row.actor === "관리자",
      ),
    ).toBe(true);
    const used = await request(app.getHttpServer()).get(`/api/auth/invite/${token}`).expect(200);
    expect(used.body.status).toBe("used");
  });

  it("marks expired invite links", async () => {
    const email = `stale-${stamp()}@nuri.test`;
    const invited = await request(app.getHttpServer()).post("/api/auth/invites").set(auth).send({ email }).expect(201);
    const token = String(invited.body.link).split("/invite/")[1];
    const db = app.get(DB) as Database;
    await db.update(invites).set({ expiresAt: new Date(0) }).where(eq(invites.token, token));
    const peek = await request(app.getHttpServer()).get(`/api/auth/invite/${token}`).expect(200);
    expect(peek.body.status).toBe("expired");
    const denied = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ token, password: "nuri-pass-1" })
      .expect(404);
    expect(denied.body.code).toBe("INVITE_EXPIRED");
    expect(denied.body.message).toBe("초대가 만료됐어요");
    const missing = await request(app.getHttpServer()).get("/api/auth/invite/not-a-real-token").expect(200);
    expect(missing.body.status).toBe("missing");
  });

  it("marks expired recovery links", async () => {
    const email = `rec-stale-${stamp()}@nuri.test`;
    process.env.BOOTSTRAP_ADMIN_EMAIL = email;
    await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email, password: "nuri-pass-1" })
      .expect(201);
    const sent = await request(app.getHttpServer()).post("/api/auth/recovery").send({ email }).expect(201);
    expect(sent.body).toEqual({ status: "queued" });
    const token = await lastRecoveryToken();
    const peek = await request(app.getHttpServer()).get(`/api/auth/recovery/${token}`).expect(200);
    expect(peek.body.status).toBe("ok");
    const redis = app.get(REDIS) as { del: (key: string) => Promise<unknown> };
    await redis.del(`chal:rec:${token}`);
    const stale = await request(app.getHttpServer()).get(`/api/auth/recovery/${token}`).expect(200);
    expect(stale.body.status).toBe("expired");
    const denied = await request(app.getHttpServer())
      .post("/api/auth/recovery/start")
      .send({ token, password: "nuri-pass-1" })
      .expect(404);
    expect(denied.body.code).toBe("RECOVERY_INVALID");
    expect(denied.body.message).toBe("복구 링크가 만료됐어요");
  });

  it("lets the bootstrap admin list and delete other accounts", async () => {
    const bootEmail = `boot-users-${stamp()}@nuri.test`;
    process.env.BOOTSTRAP_ADMIN_EMAIL = bootEmail;
    await request(app.getHttpServer()).post("/api/auth/login").send({ email: bootEmail }).expect(201);
    const created = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email: bootEmail, password: "nuri-pass-1" })
      .expect(201);
    const boot = cookieOf(created, "access");
    const me = await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", boot).expect(200);
    expect(me.body.canManageUsers).toBe(true);
    await request(app.getHttpServer()).get("/api/auth/users").set(auth).expect(200);
    await request(app.getHttpServer()).delete(`/api/auth/users/${me.body.id}`).set(auth).expect(409);

    const other = `member-${stamp()}@nuri.test`;
    const invited = await request(app.getHttpServer())
      .post("/api/auth/invites")
      .set("Cookie", boot)
      .send({ email: other })
      .expect(201);
    const token = String(invited.body.link).split("/invite/")[1];
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ token, password: "nuri-pass-1" })
      .expect(201);

    const listed = await request(app.getHttpServer()).get("/api/auth/users").set("Cookie", boot).expect(200);
    expect(listed.body.some((row: { email: string }) => row.email === other)).toBe(true);
    await request(app.getHttpServer()).delete(`/api/auth/users/${me.body.id}`).set("Cookie", boot).expect(409);
    const target = listed.body.find((row: { email: string }) => row.email === other) as { id: string };
    await request(app.getHttpServer()).delete(`/api/auth/users/${target.id}`).set("Cookie", boot).expect(200);
    const after = await request(app.getHttpServer()).get("/api/auth/users").set("Cookie", boot).expect(200);
    expect(after.body.some((row: { email: string }) => row.email === other)).toBe(false);
    const otherLogin = await request(app.getHttpServer()).post("/api/auth/login").send({ email: other }).expect(201);
    expect(otherLogin.body.mode).toBe("password");
    const otherVerify = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email: other, password: "nuri-pass-1" })
      .expect(401);
    expect(otherVerify.body.code).toBe("PASSWORD_INVALID");
  });

  it("lets the bootstrap admin turn TOTP on, enroll, recover, and log in", async () => {
    const email = `totp-${stamp()}@nuri.test`;
    process.env.BOOTSTRAP_ADMIN_EMAIL = email;
    const opened = await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    expect(opened.body.mode).toBe("set-password");
    const created = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email, password: "nuri-pass-1" })
      .expect(201);
    const bootAccess = cookieOf(created, "access");
    expect(bootAccess).toBeTruthy();
    const enabled = await request(app.getHttpServer())
      .patch("/api/auth/security")
      .set("Cookie", bootAccess)
      .send({ totpRequired: true })
      .expect(200);
    expect(enabled.body.totpRequired).toBe(true);
    const enroll = await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    expect(enroll.body.mode).toBe("enroll");
    const code = createTotp(email, enroll.body.secret).generate();
    await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ challengeKey: enroll.body.challengeKey, code })
      .expect(201);
    const login = await request(app.getHttpServer()).post("/api/auth/login").send({ email }).expect(201);
    expect(login.body.mode).toBe("login");
    const next = createTotp(email, enroll.body.secret).generate();
    const session = await request(app.getHttpServer())
      .post("/api/auth/login/verify")
      .send({ email, code: next })
      .expect(201);
    const access = cookieOf(session, "access");
    const refresh = cookieOf(session, "refresh");
    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
    await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", `${access}; ${refresh}`).expect(200);
    await request(app.getHttpServer()).get("/api/shipments/board").set("Cookie", access).expect(200);

    const rotated = await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", refresh).expect(201);
    const nextAccess = cookieOf(rotated, "access");
    const nextRefresh = cookieOf(rotated, "refresh");
    await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", nextAccess).expect(200);
    await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", refresh).expect(401);

    const recovered = await request(app.getHttpServer()).post("/api/auth/recovery").send({ email }).expect(201);
    expect(recovered.body).toEqual({ status: "queued" });
    const unknown = await request(app.getHttpServer())
      .post("/api/auth/recovery")
      .send({ email: `ghost-${stamp()}@nuri.test` })
      .expect(201);
    expect(unknown.body).toEqual(recovered.body);
    const recToken = await lastRecoveryToken();
    const recEnroll = await request(app.getHttpServer())
      .post("/api/auth/recovery/start")
      .send({ token: recToken })
      .expect(201);
    const recCode = createTotp(email, recEnroll.body.secret).generate();
    await request(app.getHttpServer())
      .post("/api/auth/register/verify")
      .send({ challengeKey: recEnroll.body.challengeKey, code: recCode })
      .expect(201);

    await request(app.getHttpServer())
      .patch("/api/auth/security")
      .set("Cookie", nextAccess)
      .send({ totpRequired: false })
      .expect(200);
    await request(app.getHttpServer()).post("/api/auth/logout").set("Cookie", `${nextAccess}; ${nextRefresh}`).expect(200);
    await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", nextAccess).expect(401);
    await request(app.getHttpServer()).post("/api/auth/refresh").set("Cookie", nextRefresh).expect(401);
  });

  it("opens the HTTP event stream", async () => {
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
      const req = httpGet(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/events",
          headers: { Cookie: auth.Cookie, Accept: "text/event-stream" },
        },
        resolve,
      );
      req.on("error", reject);
    });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers["content-type"])).toMatch(/text\/event-stream/);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("sse timeout")), 2000);
      res.on("data", (chunk) => {
        if (chunk.toString().includes("data:")) {
          clearTimeout(timer);
          res.destroy();
          resolve();
        }
      });
      app.get(EventsService).publish({ type: "shipment.changed" });
    });
  });
});
