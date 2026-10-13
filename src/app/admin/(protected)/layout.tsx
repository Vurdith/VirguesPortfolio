import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/auth/admin";
import { listThreads } from "@/lib/chat/store";
import { readDb } from "@/lib/db";

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

  // What is waiting on the owner, for the badges in the navigation.
  const [db, threads] = await Promise.all([readDb(), listThreads().catch(() => [])]);
  const counts = {
    quotes: db.quotes.filter((quote) => quote.status === "new").length,
    reviews: db.reviews.filter((review) => review.status === "pending").length,
    briefs: threads.filter((thread) => thread.status === "open" || (thread.status === "resolved" && thread.handled === "new")).length,
  };

  return <AdminShell counts={counts}>{children}</AdminShell>;
}
