# Buildloft – Immobilien Analyzer

Buildloft läuft als statische Website direkt über GitHub Pages auf **buildloft.de**.

## Funktionen

- Immobilien-Link als Quelle hinterlegen
- Anzeigentext direkt im Browser analysieren
- Kaufpreis, Wohnfläche, Zimmer, Baujahr, Hausgeld, Kaltmiete und Energieklasse erkennen
- Bruttomietrendite und Kaufpreisfaktor berechnen
- Finanzierung, Kreditrate und monatlichen Cashflow durchspielen
- Hinweise auf Sonderumlagen, Sanierungsstau, Feuchtigkeit, Erbpacht, Heizung, Dach/Fassade, Denkmalschutz und Renovierungsbedarf markieren
- Keine Anmeldung, kein Backend und keine Vercel-Abhängigkeit

## Hosting

Die Website besteht nur aus `index.html`, `styles.css` und `app.js` und kann direkt von GitHub Pages ausgeliefert werden.

> Hinweis: Immobilienportale blockieren häufig das automatische Auslesen ihrer Seiten aus einem Browser. Deshalb wird der Anzeigentext in die Website eingefügt und lokal analysiert.
