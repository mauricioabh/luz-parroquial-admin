"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Inicialización perezosa del cliente Supabase del navegador.
 *
 * Aunque este módulo lleva la directiva `"use client"`, Next.js puede
 * llegar a evaluar el chunk en el servidor durante el prerender de páginas
 * autenticadas. Hacer el throw en module-scope rompía el build con
 * "Missing env.NEXT_PUBLIC_SUPABASE_URL" cuando esas envs no están
 * disponibles en build (caso normal en entornos donde solo se inyectan en
 * runtime). El Proxy difiere la creación al primer uso real desde el cliente.
 */
let cachedClient: SupabaseClient | null = null;

function buildSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseKey) {
    throw new Error(
      "Missing env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = buildSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
  has(_target, prop) {
    return prop in buildSupabaseClient();
  },
});
