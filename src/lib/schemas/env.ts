import { z } from "zod";

const serverEnvSchema = z.object({
  COOKIE_PASSWORD: z.string().min(1),
});

export function serverEnv() {
  return serverEnvSchema.parse(process.env);
}
