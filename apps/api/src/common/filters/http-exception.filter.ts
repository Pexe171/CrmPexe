import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Request, Response } from "express";
import { JsonLoggerService } from "../logging/json-logger.service";

type RequestWithCorrelationId = Request & { correlationId?: string };

/** Machine-readable code for clients (i18n, programmatic handling). */
const STATUS_TO_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.PAYMENT_REQUIRED]: "PAYMENT_REQUIRED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.METHOD_NOT_ALLOWED]: "METHOD_NOT_ALLOWED",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
  [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE"
};

interface HttpErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string | string[];
  details?: unknown;
  timestamp: string;
  path: string;
  correlationId?: string | null;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithCorrelationId>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Erro interno no servidor";
    let errorCode = STATUS_TO_ERROR_CODE[HttpStatus.INTERNAL_SERVER_ERROR] ?? "INTERNAL_SERVER_ERROR";
    let details: unknown = undefined;

    try {
      statusCode =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.resolveMessage(exception);
      const custom = this.resolveErrorCodeAndDetails(exception, statusCode, message);
      errorCode = custom.errorCode;
      details = custom.details;
    } catch {
      // use defaults above
    }

    const body: HttpErrorResponseBody = {
      statusCode,
      errorCode,
      message,
      ...(details !== undefined && { details }),
      timestamp: new Date().toISOString(),
      path: request?.url ?? "/",
      correlationId: request?.correlationId ?? null
    };

    try {
      this.logger.error(
        {
          event: "http_error",
          statusCode,
          path: request?.url,
          method: request?.method,
          message: body.message
        },
        exception instanceof Error ? exception.stack : undefined
      );
    } catch {
      // ignore logger failure
    }

    try {
      if (!response.headersSent) {
        response.status(statusCode).json(body);
      }
    } catch {
      try {
        if (!response.headersSent) {
          response.status(statusCode).send(JSON.stringify(body));
        }
      } catch {
        // last resort: do not throw
      }
    }
  }

  private resolveMessage(exception: unknown): string | string[] {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") {
        return response;
      }
      if (typeof response === "object" && response !== null) {
        const responseMessage = (response as { message?: string | string[] }).message;
        if (responseMessage) {
          return responseMessage;
        }
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return "Erro interno no servidor";
  }

  private resolveErrorCodeAndDetails(
    exception: unknown,
    statusCode: number,
    message: string | string[]
  ): { errorCode: string; details?: unknown } {
    const defaultCode = STATUS_TO_ERROR_CODE[statusCode] ?? "INTERNAL_SERVER_ERROR";
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "object" && response !== null) {
        const obj = response as { errorCode?: string; message?: string | string[]; details?: unknown };
        const errorCode = typeof obj.errorCode === "string" ? obj.errorCode : defaultCode;
        const isValidation = Array.isArray(obj.message) && statusCode === HttpStatus.BAD_REQUEST;
        const details = obj.details ?? (isValidation ? obj.message : undefined);
        return { errorCode: isValidation && !obj.errorCode ? "VALIDATION_ERROR" : errorCode, details };
      }
    }
    const isValidation = Array.isArray(message) && statusCode === HttpStatus.BAD_REQUEST;
    return {
      errorCode: isValidation ? "VALIDATION_ERROR" : defaultCode,
      details: isValidation ? message : undefined
    };
  }
}
