import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const themeSchema = z.union([z.literal("light"), z.literal("dark")]);
export type Theme = z.infer<typeof themeSchema>;

const STORAGE_KEY = "_hirely-theme";

export const getThemeServerFn = createServerFn().handler(
  async () => (getCookie(STORAGE_KEY) || "dark") as Theme,
);

export const setThemeServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(themeSchema))
  .handler(async ({ data }) => setCookie(STORAGE_KEY, data));
