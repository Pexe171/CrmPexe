import { MarketplaceTemplateStatus, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAutomationTemplates(adminId: string) {
  const marketingCategoryId = 'marketing';
  await prisma.marketplaceCategory.create({
    data: {
      id: marketingCategoryId,
      name: 'Marketing',
      description: 'Agentes focados em captação e nutrição de leads.',
      highlights: ['Automação rápida', 'Padronização de dados', 'Integração com n8n'],
    }
  });

  const leadCaptureWorkflow = {
    name: 'Capturador de Leads Universal',
    nodes: [
      {
        parameters: {
          path: 'lead-capture-v1',
          responseMode: 'lastNode',
          options: {},
        },
        name: 'Webhook Lead',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [460, 260],
      },
      {
        parameters: {
          keepOnlySet: true,
          values: {
            string: [
              {
                name: 'nome',
                value: '={{$json["body"]["nome"]}}',
              },
              {
                name: 'email',
                value: '={{$json["body"]["email"]}}',
              }
            ],
          },
          options: {},
        },
        name: 'Padronizar Lead',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [700, 260],
      },
    ],
    connections: {
      'Webhook Lead': {
        main: [
          [
            {
              node: 'Padronizar Lead',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
  };

  const leadCaptureTemplate = await prisma.automationTemplate.create({
    data: {
      name: 'Capturador de Leads Universal',
      slug: 'lead-capture-v1',
      headline: 'Receba leads por webhook e normalize os dados no CRM.',
      description:
        'Recebe dados de formulários externos via Webhook e padroniza para o CRM.',
      version: '1.0.0',
      changelog: 'Template inicial pronto para captação de leads.',
      category: marketingCategoryId,
      definitionJson: leadCaptureWorkflow,
      workflowData: leadCaptureWorkflow,
      requiredIntegrations: ['n8n'],
      tags: ['leads', 'webhook', 'n8n'],
      capabilities: ['Receber dados via webhook', 'Padronizar campos essenciais'],
      requirements: ['Instância n8n configurada'],
      rating: 5,
      responseSlaSeconds: 300,
      priceLabel: 'Incluso',
      isPublic: true,
      status: MarketplaceTemplateStatus.APPROVED,
      createdByAdminId: adminId,
    }
  });

  const leadCaptureVersion = await prisma.automationTemplateVersion.create({
    data: {
      templateId: leadCaptureTemplate.id,
      version: '1.0.0',
      changelog: 'Primeira versão estável do workflow.',
      definitionJson: leadCaptureWorkflow,
      requiredIntegrations: ['n8n'],
      createdByAdminId: adminId,
    }
  });

  await prisma.automationTemplate.update({
    where: { id: leadCaptureTemplate.id },
    data: { currentVersionId: leadCaptureVersion.id },
  });
}

async function main() {
  const existingWorkspace = await prisma.workspace.findFirst({
    select: { id: true },
  });
  if (existingWorkspace?.id) {
    console.log('Seed skipped: workspace already exists.');
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Demo',
    },
  });

  const role = await prisma.role.create({
    data: {
      workspaceId: workspace.id,
      name: 'Admin',
      description: 'Acesso total ao workspace',
    },
  });

  const permission = await prisma.permission.create({
    data: {
      workspaceId: workspace.id,
      key: 'workspace.manage',
      description: 'Gerenciar configurações do workspace',
    },
  });

  await prisma.rolePermission.create({
    data: {
      workspaceId: workspace.id,
      roleId: role.id,
      permissionId: permission.id,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'davidhenriquesms18@gmail.com',
      name: 'Admin',
      contact: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      roleId: role.id,
    },
  });
  await seedAutomationTemplates(user.id);

  console.log('Seed completed: workspace demo created.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
