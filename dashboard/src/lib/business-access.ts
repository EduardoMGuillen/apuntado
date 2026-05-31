import type { Session } from "next-auth";
import type { Business, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperAdminRole } from "@/lib/roles";

export function isSuperAdminSession(session: Session | null): boolean {
  return isSuperAdminRole(session?.user?.role);
}

export async function getBusinessForSession<T extends Prisma.BusinessInclude>(
  session: Session,
  businessId: string,
  include: T
): Promise<Prisma.BusinessGetPayload<{ include: T }> | null>;
export async function getBusinessForSession(
  session: Session,
  businessId: string,
  include?: undefined
): Promise<Business | null>;
export async function getBusinessForSession<T extends Prisma.BusinessInclude>(
  session: Session,
  businessId: string,
  include?: T
) {
  const userId = session.user?.id;
  if (!userId) return null;

  const where = isSuperAdminSession(session)
    ? { id: businessId }
    : { id: businessId, ownerId: userId };

  return prisma.business.findFirst({ where, include });
}

export async function verifyBusinessAccess<T extends Prisma.BusinessInclude>(
  businessId: string,
  userId: string,
  role: string | null | undefined,
  include: T
): Promise<Prisma.BusinessGetPayload<{ include: T }> | null>;
export async function verifyBusinessAccess(
  businessId: string,
  userId: string,
  role?: string | null,
  include?: undefined
): Promise<Business | null>;
export async function verifyBusinessAccess<T extends Prisma.BusinessInclude>(
  businessId: string,
  userId: string,
  role?: string | null,
  include?: T
) {
  const where =
    role === "super_admin"
      ? { id: businessId }
      : { id: businessId, ownerId: userId };

  return prisma.business.findFirst({ where, include });
}
