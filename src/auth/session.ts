import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/data/db";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export const SESSION_COOKIE_NAME = "porra_session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}

export async function createUserSession(userId: string): Promise<string> {
  const token = createSessionToken();

  await db.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: getSessionExpiresAt()
    }
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: getSessionExpiresAt()
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
  }

  await clearSessionCookie();
}
