import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { ADMIN_COOKIE_NAME, getAdminSession, isPasswordSet } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await getAdminSession(token);
  if (session) redirect("/admin");

  const passwordSet = await isPasswordSet();
  return <AdminLoginForm mode={passwordSet ? "login" : "setup"} />;
}



