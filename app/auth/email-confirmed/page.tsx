"use client";

import { useEffect } from "react";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.luzparroquial.app";

/**
 * Landing tras confirmar el correo desde el enlace de Supabase (registro en la app móvil de oración).
 * No crea sesión en la web de administración: solo agradece y enlaza a la tienda / app.
 * Supabase puede añadir tokens en el hash de la URL; los quitamos del historial sin leerlos.
 */
export default function EmailConfirmedPage() {
  useEffect(() => {
    const { pathname, search } = window.location;
    if (window.location.hash) {
      window.history.replaceState(null, document.title, pathname + search);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-serif text-2xl font-semibold text-foreground">
          Luz Parroquial
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu espacio para rezar y acompañar tu oración
        </p>
        <div className="my-8 h-px w-16 mx-auto bg-primary opacity-40" />
        <h1 className="font-serif text-xl font-semibold text-foreground">
          ¡Bienvenido/a!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu correo ha sido confirmado
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          Tu cuenta está lista. Abre Luz Parroquial e inicia sesión con el
          mismo correo y contraseña para comenzar a rezar.
        </p>
        <a
          href={PLAY_STORE_URL}
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground no-underline hover:opacity-95"
        >
          Abrir en Google Play
        </a>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Esta página es solo de confirmación; no es el panel de administración.
        </p>
      </div>
    </main>
  );
}
