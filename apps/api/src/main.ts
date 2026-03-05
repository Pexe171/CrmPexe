import "reflect-metadata";
import * as bodyParser from "body-parser";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { CorrelationIdMiddleware } from "./common/logging/correlation-id.middleware";
import { JsonLoggerService } from "./common/logging/json-logger.service";
import { RequestLoggerMiddleware } from "./common/logging/request-logger.middleware";

/** Limite de body (100MB) para import de JSON do n8n; evita "request entity too large". */
const BODY_LIMIT = "100mb";

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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false
  });
  // Registrar body parser com limite alto como PRIMEIRO middleware (antes de qualquer app.use)
  app.use(bodyParser.json({ limit: BODY_LIMIT }));
  app.use(bodyParser.urlencoded({ extended: true, limit: BODY_LIMIT }));
  console.log(`[API] Body parser limit: ${BODY_LIMIT} (import agent-templates)`);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useLogger(app.get(JsonLoggerService));
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
