import { PrismaClient, UserRole } from '@prisma/client';

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
      email: 'admin@crmpexe.local',
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
