import { PrismaClient, UserRole } from "@prisma/client";
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

  console.log("Seed completed: admin user and workspace created/updated.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
