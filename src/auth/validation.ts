import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres.")
  .max(32, "El usuario no puede superar 32 caracteres.")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Usa solo letras, numeros y guion bajo en el usuario."
  )
  .transform((username) => username.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña no puede superar 128 caracteres.");

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

export function parseCredentials(input: unknown) {
  return credentialsSchema.safeParse(input);
}

export function isValidUsername(username: string): boolean {
  return usernameSchema.safeParse(username).success;
}

export function isValidPassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}
