import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const missingSecrets = [
      !process.env.JWT_ACCESS_SECRET ? "JWT_ACCESS_SECRET" : null,
      !process.env.JWT_REFRESH_SECRET ? "JWT_REFRESH_SECRET" : null
    ].filter((value): value is string => Boolean(value));

    if (missingSecrets.length > 0) {
      throw new Error(
        `Segredos JWT obrigatórios em produção: ${missingSecrets.join(", ")}.`
      );
    }
  }

  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
  });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3001);
}

bootstrap();
