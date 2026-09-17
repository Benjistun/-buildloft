import Link from "next/link";
import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="center-page">
      <section className="login-card">
        <Link href="/" className="brand"><span className="brand-icon">▣</span>Sicheres Portal</Link>
        <div className="shield login-shield">✓</div>
        <h1>Sicher anmelden</h1>
        <p>Nutze dein GitHub-Konto. Dein Passwort wird ausschließlich von GitHub verarbeitet.</p>
        {error && <div className="error-box" role="alert">Die Anmeldung wurde abgelehnt. Prüfe, ob dein GitHub-Benutzername freigegeben ist.</div>}
        <form action={login}><button className="primary-button full" type="submit">Mit GitHub fortfahren <span>→</span></button></form>
        <Link href="/" className="back-link">Zurück zur Startseite</Link>
      </section>
    </main>
  );
}
