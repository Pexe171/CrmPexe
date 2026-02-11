import {
  MarketplaceTemplateStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const REQUIRED_TABLES = [
  "Workspace",
  "Role",
  "Permission",
  "RolePermission",
  "User",
  "WorkspaceMember"
];

const MARKETPLACE_TABLES = [
  "MarketplaceCategory",
  "AutomationTemplate",
  "AutomationTemplateVersion"
];

async function tableExists(tableName: string) {
  const [row] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass(${`public."${tableName}"`}) IS NOT NULL AS "exists";
  `;

  return row?.exists ?? false;
}

async function ensureTablesExist(tableNames: string[]) {
  const results = await Promise.all(
    tableNames.map(async (tableName) => ({
      tableName,
      exists: await tableExists(tableName)
    }))
  );

  return results;
}

async function seedAutomationTemplates(adminId: string) {
  const marketplaceTables = await ensureTablesExist(MARKETPLACE_TABLES);
  const hasAllMarketplaceTables = marketplaceTables.every(
    (table) => table.exists
  );

  if (!hasAllMarketplaceTables) {
    return;
  }

  const marketingCategoryId = "marketing";
  const existingCategory = await prisma.marketplaceCategory.findFirst({
    where: { id: marketingCategoryId },
    select: { id: true }
  });

  if (!existingCategory) {
    await prisma.marketplaceCategory.create({
      data: {
        id: marketingCategoryId,
        name: "Marketing",
        description: "Agentes focados em captação e nutrição de leads.",
        highlights: [
          "Automação rápida",
          "Padronização de dados",
          "Integração com n8n"
        ]
      }
    });
  }

  const leadCaptureWorkflow = {
    name: "Capturador de Leads Universal",
    nodes: [
      {
        parameters: {
          path: "lead-capture-v1",
          responseMode: "lastNode",
          options: {}
        },
        name: "Webhook Lead",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [460, 260]
      },
      {
        parameters: {
          keepOnlySet: true,
          values: {
            string: [
              {
                name: "nome",
                value: '={{$json["body"]["nome"]}}'
              },
              {
                name: "email",
                value: '={{$json["body"]["email"]}}'
              }
            ]
          },
          options: {}
        },
        name: "Padronizar Lead",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [700, 260]
      }
    ],
    connections: {
      "Webhook Lead": {
        main: [
          [
            {
              node: "Padronizar Lead",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    }
  };

  const existingTemplate = await prisma.automationTemplate.findFirst({
    where: { slug: "lead-capture-v1" }
  });

  const leadCaptureTemplate = existingTemplate
    ? await prisma.automationTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: "Capturador de Leads Universal",
          headline: "Receba leads por webhook e normalize os dados no CRM.",
          description:
            "Recebe dados de formulários externos via Webhook e padroniza para o CRM.",
          version: "1.0.0",
          changelog: "Template inicial pronto para captação de leads.",
          category: marketingCategoryId,
          definitionJson: leadCaptureWorkflow,
          workflowData: leadCaptureWorkflow,
          requiredIntegrations: ["n8n"],
          tags: ["leads", "webhook", "n8n"],
          capabilities: [
            "Receber dados via webhook",
            "Padronizar campos essenciais"
          ],
          requirements: ["Instância n8n configurada"],
          rating: 5,
          responseSlaSeconds: 300,
          priceLabel: "Incluso",
          isPublic: true,
          status: MarketplaceTemplateStatus.APPROVED
        }
      })
    : await prisma.automationTemplate.create({
        data: {
          name: "Capturador de Leads Universal",
          slug: "lead-capture-v1",
          headline: "Receba leads por webhook e normalize os dados no CRM.",
          description:
            "Recebe dados de formulários externos via Webhook e padroniza para o CRM.",
          version: "1.0.0",
          changelog: "Template inicial pronto para captação de leads.",
          category: marketingCategoryId,
          definitionJson: leadCaptureWorkflow,
          workflowData: leadCaptureWorkflow,
          requiredIntegrations: ["n8n"],
          tags: ["leads", "webhook", "n8n"],
          capabilities: [
            "Receber dados via webhook",
            "Padronizar campos essenciais"
          ],
          requirements: ["Instância n8n configurada"],
          rating: 5,
          responseSlaSeconds: 300,
          priceLabel: "Incluso",
          isPublic: true,
          status: MarketplaceTemplateStatus.APPROVED,
          createdByAdminId: adminId
        }
      });

  const existingVersion = await prisma.automationTemplateVersion.findFirst({
    where: {
      templateId: leadCaptureTemplate.id,
      version: "1.0.0"
    }
  });

  const leadCaptureVersion = existingVersion
    ? existingVersion
    : await prisma.automationTemplateVersion.create({
        data: {
          templateId: leadCaptureTemplate.id,
          version: "1.0.0",
          changelog: "Primeira versão estável do workflow.",
          definitionJson: leadCaptureWorkflow,
          requiredIntegrations: ["n8n"],
          createdByAdminId: adminId
        }
      });

  if (leadCaptureTemplate.currentVersionId !== leadCaptureVersion.id) {
    await prisma.automationTemplate.update({
      where: { id: leadCaptureTemplate.id },
      data: { currentVersionId: leadCaptureVersion.id }
    });
  }
}

async function main() {
  const requiredTables = await ensureTablesExist(REQUIRED_TABLES);
  const missingRequiredTables = requiredTables.filter((table) => !table.exists);

  if (missingRequiredTables.length > 0) {
    console.log(
      "Seed ignorado: tabelas obrigatórias ausentes.",
      missingRequiredTables.map((table) => table.tableName).join(", ")
    );
    return;
  }

  const workspace =
    (await prisma.workspace.findFirst({
      where: { name: "Workspace Demo" }
    })) ||
    (await prisma.workspace.create({
      data: {
        name: "Workspace Demo",
        code: "DEMO01",
        passwordHash: createHash("sha256").update("123456").digest("hex")
      }
    }));

  const role = await prisma.role.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Admin"
      }
    },
    update: {
      description: "Acesso total ao workspace"
    },
    create: {
      workspaceId: workspace.id,
      name: "Admin",
      description: "Acesso total ao workspace"
    }
  });

  const permission = await prisma.permission.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: "workspace.manage"
      }
    },
    update: {
      description: "Gerenciar configurações do workspace"
    },
    create: {
      workspaceId: workspace.id,
      key: "workspace.manage",
      description: "Gerenciar configurações do workspace"
    }
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: role.id,
        permissionId: permission.id
      }
    },
    update: {
      workspaceId: workspace.id
    },
    create: {
      workspaceId: workspace.id,
      roleId: role.id,
      permissionId: permission.id
    }
  });

  const user = await prisma.user.upsert({
    where: {
      email: "davidhenriquesms18@gmail.com"
    },
    update: {
      name: "Admin",
      contact: "Admin",
      role: UserRole.ADMIN
    },
    create: {
      email: "davidhenriquesms18@gmail.com",
      name: "Admin",
      contact: "Admin",
      role: UserRole.ADMIN
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    update: {
      roleId: role.id
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      roleId: role.id
    }
  });

  await seedAutomationTemplates(user.id);

  console.log("Seed completed: workspace demo created/updated.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
