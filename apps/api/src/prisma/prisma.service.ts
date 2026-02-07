import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    const softDeleteModels = new Set(["Company", "Contact", "Deal", "Task"]);

    this.$use(async (params, next) => {
      if (!params.model || !softDeleteModels.has(params.model)) {
        return next(params);
      }

      if (params.action === "findUnique") {
        params.action = "findFirst";
      }

      if (params.action === "findFirst" || params.action === "findMany") {
        const where = params.args?.where ?? {};
        if (where.deletedAt === undefined) {
          params.args = {
            ...params.args,
            where: {
              ...where,
              deletedAt: null
            }
          };
        }
      }

      if (params.action === "update" || params.action === "updateMany") {
        const where = params.args?.where ?? {};
        if (where.deletedAt === undefined) {
          params.args = {
            ...params.args,
            where: {
              ...where,
              deletedAt: null
            }
          };
        }
      }

      if (params.action === "delete") {
        params.action = "update";
        params.args = {
          where: params.args?.where,
          data: {
            deletedAt: new Date(),
            version: { increment: 1 }
          }
        };
      }

      if (params.action === "deleteMany") {
        params.action = "updateMany";
        const where = params.args?.where ?? {};
        params.args = {
          ...params.args,
          where: {
            ...where,
            deletedAt: null
          },
          data: {
            ...(params.args?.data ?? {}),
            deletedAt: new Date()
          }
        };
      }

      return next(params);
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
