import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Porra Mundial",
  description: "Predicciones del Mundial 2026 entre amigos"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
