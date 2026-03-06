import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { CorrelationIdMiddleware } from "./common/logging/correlation-id.middleware";
import { JsonLoggerService } from "./common/logging/json-logger.service";
import { RequestLoggerMiddleware } from "./common/logging/request-logger.middleware";
import { CorsIoAdapter } from "./common/websocket/cors-io.adapter";

const SENTRY_DSN = process.env.SENTRY_DSN?.trim();
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1
  });
}

async function bootstrap() {
  const requestBodyLimit = "200mb";
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
  app.useWebSocketAdapter(new CorsIoAdapter(app));
  app.useLogger(app.get(JsonLoggerService));
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (isProduction) {
    if (corsOrigins.length === 0) {
      throw new Error("CORS_ORIGIN deve ser definido em produção.");
    }

    if (corsOrigins.includes("*")) {
      throw new Error("CORS_ORIGIN não pode ser '*' em produção.");
    }
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.use(json({ limit: requestBodyLimit }));
  app.use(urlencoded({ extended: true, limit: requestBodyLimit }));
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  const correlationMiddleware = app.get(CorrelationIdMiddleware);
  const requestLoggerMiddleware = app.get(RequestLoggerMiddleware);
  app.use(correlationMiddleware.use.bind(correlationMiddleware));
  app.use(requestLoggerMiddleware.use.bind(requestLoggerMiddleware));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  await app.listen(3001);
}

bootstrap();
