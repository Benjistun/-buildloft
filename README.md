# Sicheres Portal – GitHub + Vercel

Diese Website verwendet **Auth.js** und **GitHub OAuth**. Das Dashboard wird auf dem Server geschützt; nicht angemeldete Besucher werden zur Login-Seite umgeleitet. Die Website speichert keine eigenen Passwörter.

## 1. Projekt zu GitHub hochladen

1. ZIP-Datei entpacken.
2. Auf GitHub ein neues Repository erstellen.
3. Den **Inhalt** des Ordners `secure-portal-vercel` in das Repository hochladen.

## 2. Erstes Vercel-Projekt anlegen

1. Bei [Vercel](https://vercel.com/) anmelden.
2. **Add New → Project** wählen.
3. Das GitHub-Repository importieren.
4. Das erkannte Framework **Next.js** beibehalten und bereitstellen.
5. Die endgültige Vercel-Adresse kopieren, zum Beispiel `https://mein-portal.vercel.app`.

Die Anmeldung funktioniert erst, nachdem die folgenden Schritte abgeschlossen sind.

## 3. GitHub OAuth App erstellen

1. GitHub öffnen: **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Eintragen:
   - **Application name:** Sicheres Portal
   - **Homepage URL:** deine Vercel-Adresse
   - **Authorization callback URL:** `https://DEINE-DOMAIN/api/auth/callback/github`
3. Die **Client ID** kopieren und ein **Client Secret** erzeugen.

## 4. Geschützte Variablen in Vercel eintragen

Unter **Project → Settings → Environment Variables** diese Werte anlegen:

| Name | Wert |
|---|---|
| `AUTH_SECRET` | Mit `npx auth secret` erzeugter langer Zufallswert |
| `AUTH_GITHUB_ID` | Client ID der GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | Client Secret der GitHub OAuth App |
| `ALLOWED_GITHUB_USERS` | Empfohlen: dein GitHub-Benutzername |

Mehrere erlaubte Nutzer werden mit Kommas getrennt: `anna,max,maria`.

Danach unter **Deployments** die letzte Bereitstellung erneut ausführen (**Redeploy**).

## 5. Eigene Domain verwenden

In Vercel unter **Settings → Domains** deine Domain hinzufügen. Anschließend in der GitHub OAuth App Homepage- und Callback-URL auf die eigene Domain ändern.

## Lokal testen (optional)

```bash
npm install
cp .env.example .env.local
npx auth secret
npm run dev
```

Für den lokalen Test lautet die GitHub-Callback-URL:

`http://localhost:3000/api/auth/callback/github`

## Sicherheits-Hinweise

- `.env` und `.env.local` niemals zu GitHub hochladen.
- `ALLOWED_GITHUB_USERS` setzen, wenn nur bestimmte Personen Zugriff erhalten sollen.
- GitHub Client Secrets bei Verdacht auf Veröffentlichung sofort erneuern.
- Geschützte Inhalte gehören ausschließlich in serverseitig geprüfte Seiten oder APIs.

Die Einrichtung folgt den offiziellen Anleitungen von [Auth.js](https://authjs.dev/getting-started/installation?framework=next-js), dem [GitHub-Provider](https://authjs.dev/getting-started/providers/github) und [Vercel Git Deployments](https://vercel.com/docs/git).
