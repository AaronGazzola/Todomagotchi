import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

function forUser(userId: string, tenantId?: string) {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            if (tenantId) {
              const [, , result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
                prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
                query(args),
              ]);
              return result;
            } else {
              const [, result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
                query(args),
              ]);
              return result;
            }
          },
        },
      },
    })
  );
}

export function createRLSClient(userId: string, tenantId?: string) {
  return prisma.$extends(forUser(userId, tenantId));
}
