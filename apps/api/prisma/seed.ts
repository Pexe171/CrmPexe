import { MarketplaceTemplateStatus, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existingWorkspace = await prisma.workspace.findFirst();
  if (existingWorkspace) {
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

  const leadCaptureCategoryId = 'leads';
  await prisma.marketplaceCategory.create({
    data: {
      id: leadCaptureCategoryId,
      name: 'Leads',
      description: 'Agentes focados em captura e qualificação de leads.',
      highlights: ['Captação multicanal', 'Resposta rápida', 'Integração simples'],
    },
  });

  const leadCaptureWorkflow = {
    nodes: [
      {
        parameters: {
          path: 'lead-capture',
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
                value: "={{$json['body']['nome']}}",
              },
              {
                name: 'email',
                value: "={{$json['body']['email']}}",
              },
            ],
          },
          options: {},
        },
        name: 'Formatar Dados',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [680, 260],
      },
    ],
    connections: {
      'Webhook Lead': {
        main: [
          [
            {
              node: 'Formatar Dados',
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
      headline: 'Captura leads via webhook e normaliza os dados.',
      description:
        'Recebe dados básicos de leads via webhook, normaliza nome e e-mail e devolve a resposta pronta para testes rápidos.',
      version: '1.0.0',
      changelog: 'Template inicial para captura simples de leads.',
      category: leadCaptureCategoryId,
      definitionJson: leadCaptureWorkflow,
      requiredIntegrations: ['n8n'],
      tags: ['leads', 'webhook', 'n8n'],
      capabilities: ['Receber dados via webhook', 'Normalizar campos essenciais'],
      requirements: ['Instância n8n configurada'],
      rating: 5,
      responseSlaSeconds: 300,
      status: MarketplaceTemplateStatus.APPROVED,
      createdByAdminId: user.id,
    },
  });

  const leadCaptureVersion = await prisma.automationTemplateVersion.create({
    data: {
      templateId: leadCaptureTemplate.id,
      version: '1.0.0',
      changelog: 'Primeira versão estável do workflow.',
      definitionJson: leadCaptureWorkflow,
      requiredIntegrations: ['n8n'],
      createdByAdminId: user.id,
    },
  });

  await prisma.automationTemplate.update({
    where: { id: leadCaptureTemplate.id },
    data: { currentVersionId: leadCaptureVersion.id },
  });

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
