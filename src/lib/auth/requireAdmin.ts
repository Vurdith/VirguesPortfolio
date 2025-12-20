import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/auth/admin";

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return await getAdminSession(token);
}



