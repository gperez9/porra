"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/auth/password";
import {
  createUserSession,
  deleteCurrentSession,
  setSessionCookie
} from "@/auth/session";
import { parseCredentials } from "@/auth/validation";
import { db } from "@/data/db";

export type AuthActionState = {
  error: string | null;
};

const invalidCredentialsMessage = "Usuario o contraseña incorrectos.";

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsedCredentials = parseCredentials({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!parsedCredentials.success) {
    return {
      error: parsedCredentials.error.issues[0]?.message ?? "Datos invalidos."
    };
  }

  const { username, password } = parsedCredentials.data;

  try {
    const user = await db.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password)
      }
    });

    await setSessionCookie(await createUserSession(user.id));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Ese usuario ya existe." };
    }

    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsedCredentials = parseCredentials({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!parsedCredentials.success) {
    return { error: invalidCredentialsMessage };
  }

  const { username, password } = parsedCredentials.data;
  const user = await db.user.findUnique({ where: { username } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: invalidCredentialsMessage };
  }

  await setSessionCookie(await createUserSession(user.id));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteCurrentSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
