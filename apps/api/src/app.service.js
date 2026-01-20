// apps/api/src/app.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getStatus() {
    try {
      // Tenta fazer uma query simples no banco para verificar conexão
      // Se a tabela estiver vazia, count retorna 0 (sucesso)
      // Se o banco estiver fora, lança erro
      await this.prisma.healthCheck.count();

      return {
        status: "ok",
        service: "crmpexe-api",
        database: "connected"
      };
    } catch (error) {
      return {
        status: "error",
        service: "crmpexe-api",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }
}