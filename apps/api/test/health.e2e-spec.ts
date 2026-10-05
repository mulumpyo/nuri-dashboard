import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/setup-app";
import { PG } from "../src/db/db.module";
import { REDIS } from "../src/redis/redis.module";
import { hasInfra } from "./helpers";

(hasInfra ? describe : describe.skip)("health e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    const redis = app.get(REDIS) as { quit: () => Promise<unknown> };
    const pg = app.get(PG) as { client: { end: () => Promise<void> } };
    await app.close();
    await redis.quit().catch(() => undefined);
    await pg.client.end().catch(() => undefined);
  });

  it("lives", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200).expect({ status: "ok" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("is ready", async () => {
    await request(app.getHttpServer()).get("/api/health/ready").expect(200);
  });

  it("rejects unauthenticated board", async () => {
    await request(app.getHttpServer()).get("/api/shipments/board").expect(401);
  });
});
