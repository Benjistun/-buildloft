import Link from "next/link";
import { auth } from "@/auth";
import { login } from "./actions";

export default async function Home() {
  const session = await auth();
  return (
    <main className="shell">
      <section className="frame">
        <header className="topbar">
          <Link href="/" className="brand"><span className="brand-icon">▣</span>Sicheres Portal</Link>
          <span className="secure-label"><i />Geschützter Zugang</span>
        </header>
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Nur für berechtigte Personen</span>
            <h1>Vertrauliches bleibt vertraulich.</h1>
            <p className="lead">Melde dich sicher mit deinem GitHub-Konto an, um deinen persönlichen Bereich zu öffnen. Diese Website speichert kein eigenes Passwort.</p>
            {session?.user ? (
              <Link className="primary-button" href="/dashboard">Zum Dashboard <span>→</span></Link>
            ) : (
              <form action={login}><button className="primary-button" type="submit">Mit GitHub anmelden <span>→</span></button></form>
            )}
            <p className="hint">OAuth-Anmeldung · Serverseitige Prüfung · Sichere Sitzung</p>
          </div>
          <aside className="security-card">
            <div className="shield">✓</div>
            <div>
              <p className="card-kicker">Sicherheitsstandard</p>
              <h2>Identität geprüft. Zugriff geschützt.</h2>
              <ul>
                <li>Anmeldung über GitHub OAuth</li>
                <li>Serverseitig geschützte Inhalte</li>
                <li>Optionale Benutzer-Allowlist</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
