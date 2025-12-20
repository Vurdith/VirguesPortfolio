import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await getAdminSession(token);
  if (!session) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}



