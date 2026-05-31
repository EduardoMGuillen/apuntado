import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { businesses: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description={`${users.length} cuentas registradas`}
      />

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Negocios</th>
                <th className="px-4 py-3 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{user.email}</td>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">
                    {user.role === "super_admin" ? (
                      <Badge variant="secondary">super_admin</Badge>
                    ) : (
                      <span className="text-muted-foreground">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{user._count.businesses}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.createdAt.toLocaleDateString("es-HN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Los super admins se definen con la variable{" "}
        <code className="rounded bg-muted px-1">SUPER_ADMIN_EMAILS</code> en el servidor.
      </p>
    </div>
  );
}
