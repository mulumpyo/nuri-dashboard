const REQUIRED = ["JWT_SECRET", "DATABASE_URL", "REDIS_URL"] as const;
export const JWT_SECRET_MIN = 32;

export const isProduction = (env = process.env.NODE_ENV) => env === "production";

export const docsEnabled = () => process.env.DOCS_ENABLED === "true" || !isProduction();

const assertJwtSecret = (secret?: string) => {
  const value = secret?.trim() ?? "";
  if (!value) throw new Error("JWT_SECRET이 필요해요");
  if (value.length < JWT_SECRET_MIN) {
    throw new Error(`JWT_SECRET은 ${JWT_SECRET_MIN}자 이상이어야 해요`);
  }
  return value;
};

export const validateEnv = (env: Record<string, unknown>) => {
  const missing = REQUIRED.filter((key) => !String(env[key] ?? "").trim());
  if (missing.length) {
    throw new Error(`환경 변수가 비어 있어요: ${missing.join(", ")}`);
  }
  assertJwtSecret(String(env.JWT_SECRET ?? ""));
  return env;
};

export const jwtSecret = () => assertJwtSecret(process.env.JWT_SECRET);
