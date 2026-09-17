import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/actions";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "Willkommen";
  return (
    <main className="dashboard-page">
      <header className="dashboard-nav"><div className="nav-inner"><a href="/" className="brand"><span className="brand-icon">▣</span>Sicheres Portal</a><div className="account"><span>{session.user.email}</span><form action={logout}><button className="outline-button" type="submit">Abmelden</button></form></div></div></header>
      <div className="dashboard-content">
        <div className="welcome-row"><div><p className="verified"><i />Sicher angemeldet</p><h1>Willkommen, {firstName}.</h1><p>Dies ist dein persönlicher, geschützter Bereich.</p></div><span className="session-badge">Sitzung geschützt</span></div>
        <section className="tiles">
          <article><span className="tile-icon">▤</span><h2>Deine Dokumente</h2><p>Hier können später vertrauliche Inhalte und persönliche Unterlagen bereitgestellt werden.</p><small>Noch keine Dokumente vorhanden</small></article>
          <article><span className="tile-icon teal">●</span><h2>Mitteilungen</h2><p>Wichtige Hinweise erscheinen ausschließlich nach erfolgreicher Anmeldung.</p><small>Keine neuen Mitteilungen</small></article>
        </section>
      </div>
    </main>
  );
}
