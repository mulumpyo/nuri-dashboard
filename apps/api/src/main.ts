import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupApp } from "./setup-app";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
};

bootstrap();
