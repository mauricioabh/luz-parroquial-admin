import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Correo confirmado | Luz Parroquial",
  description: "Tu correo quedó confirmado. Continúa en la app Luz Parroquial.",
  robots: { index: false, follow: false },
};

export default function EmailConfirmedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
