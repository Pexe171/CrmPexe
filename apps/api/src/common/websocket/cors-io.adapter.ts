import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";

/**
 * IoAdapter that applies CORS origins from CORS_ORIGIN env (same as HTTP API).
 * Prevents WebSocket connections from arbitrary origins.
 */
export class CorsIoAdapter extends IoAdapter {
  override createIOServer(port: number, options?: ServerOptions) {
    const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: corsOrigins.length > 0 ? corsOrigins : true,
        credentials: true
      }
    });
  }
}
