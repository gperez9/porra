import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

export function canAccessAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!canAccessAdmin(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

export async function redirectAuthenticatedUser(destination = "/dashboard") {
  const user = await getCurrentUser();

  if (user) {
    redirect(destination);
  }
}
