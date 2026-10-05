import { jwtSecret, validateEnv } from "./env";

describe("env", () => {
  const prev = process.env.JWT_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prev;
  });

  const longSecret = "a".repeat(32);

  it("rejects empty required keys", () => {
    expect(() => validateEnv({ JWT_SECRET: " ", DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => validateEnv({ JWT_SECRET: longSecret, DATABASE_URL: "", REDIS_URL: "redis://x" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a short jwt secret", () => {
    expect(() => validateEnv({ JWT_SECRET: "too-short", DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" })).toThrow(
      /32자/,
    );
  });

  it("accepts a complete env", () => {
    expect(validateEnv({ JWT_SECRET: longSecret, DATABASE_URL: "postgres://x", REDIS_URL: "redis://x" })).toMatchObject({
      JWT_SECRET: longSecret,
    });
  });

  it("does not fall back to a default jwt secret", () => {
    delete process.env.JWT_SECRET;
    expect(() => jwtSecret()).toThrow(/JWT_SECRET/);
  });
});
