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

interface HttpErrorResponseBody {
  statusCode: number;
  message: string | string[];
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
    const request = context.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);

    const body: HttpErrorResponseBody = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId ?? null
    };

    this.logger.error(
      {
        event: "http_error",
        statusCode,
        path: request.url,
        method: request.method,
        message: body.message
      },
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(statusCode).json(body);
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
}
