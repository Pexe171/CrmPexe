import { Global, Module } from "@nestjs/common";
import { CorrelationIdMiddleware } from "./correlation-id.middleware";
import { CorrelationIdService } from "./correlation-id.service";
import { ExternalCallLoggerService } from "./external-call-logger.service";
import { JsonLoggerService } from "./json-logger.service";
import { RequestLoggerMiddleware } from "./request-logger.middleware";

@Global()
@Module({
  providers: [
    CorrelationIdService,
    JsonLoggerService,
    ExternalCallLoggerService,
    CorrelationIdMiddleware,
    RequestLoggerMiddleware
  ],
  exports: [
    CorrelationIdService,
    JsonLoggerService,
    ExternalCallLoggerService,
    CorrelationIdMiddleware,
    RequestLoggerMiddleware
  ]
})
export class LoggingModule {}
