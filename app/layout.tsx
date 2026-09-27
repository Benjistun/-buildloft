import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buildloft – Immobilien Analyzer",
  description: "Immobilienanzeigen prüfen, Kennzahlen berechnen und mögliche Risiken erkennen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
