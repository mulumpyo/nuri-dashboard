import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb } from "./drizzle";

export const DB = Symbol("DB");
export const PG = Symbol("PG");

@Global()
@Module({
  providers: [
    {
      provide: PG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createDb(config.getOrThrow("DATABASE_URL")),
    },
    {
      provide: DB,
      inject: [PG],
      useFactory: (pair: ReturnType<typeof createDb>) => pair.db,
    },
  ],
  exports: [DB, PG],
})
export class DbModule {}
