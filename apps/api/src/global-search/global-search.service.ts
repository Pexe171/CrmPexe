import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GlobalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, query: string | undefined, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);
    const normalizedQuery = query?.trim();

    if (!normalizedQuery) {
      return {
        query: "",
        results: {
          contacts: [],
          conversations: [],
          messages: [],
          deals: [],
          tasks: []
        }
      };
    }

    const [contacts, conversations, messages, deals, tasks] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          OR: [
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            { email: { contains: normalizedQuery, mode: "insensitive" } },
            { phone: { contains: normalizedQuery, mode: "insensitive" } }
          ]
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      this.prisma.conversation.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          OR: [
            { channel: { contains: normalizedQuery, mode: "insensitive" } },
            { contact: { name: { contains: normalizedQuery, mode: "insensitive" } } },
            { contact: { email: { contains: normalizedQuery, mode: "insensitive" } } },
            { contact: { phone: { contains: normalizedQuery, mode: "insensitive" } } }
          ]
        },
        include: {
          contact: {
            select: { id: true, name: true, email: true, phone: true }
          },
          assignedToUser: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        take: 5
      }),
      this.prisma.message.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          text: { contains: normalizedQuery, mode: "insensitive" }
        },
        include: {
          conversation: {
            select: {
              id: true,
              channel: true,
              contact: {
                select: { id: true, name: true, email: true, phone: true }
              }
            }
          }
        },
        orderBy: { sentAt: "desc" },
        take: 5
      }),
      this.prisma.deal.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          title: { contains: normalizedQuery, mode: "insensitive" }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      this.prisma.task.findMany({
        where: {
          workspaceId: resolvedWorkspaceId,
          title: { contains: normalizedQuery, mode: "insensitive" }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      })
    ]);

    return {
      query: normalizedQuery,
      results: {
        contacts,
        conversations,
        messages,
        deals,
        tasks
      }
    };
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    const normalized = workspaceId?.trim();
    if (normalized) {
      await this.ensureWorkspaceMembership(userId, normalized);
      return normalized;
    }
    const currentWorkspaceId = await this.getCurrentWorkspaceId(userId);
    await this.ensureWorkspaceMembership(userId, currentWorkspaceId);
    return currentWorkspaceId;
  }

  private async getCurrentWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true }
    });

    if (!user?.currentWorkspaceId) {
      throw new BadRequestException("Workspace atual não definido.");
    }

    return user.currentWorkspaceId;
  }

  private async ensureWorkspaceMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId }
    });

    if (!membership) {
      throw new BadRequestException("Workspace inválido.");
    }
  }
}
