# Buildloft – Immobilien Analyzer

Buildloft ist eine Next.js-Webapp zur schnellen Voranalyse von Immobilienangeboten.

## Funktionen

- Immobilien-Link von ImmoScout24, Immowelt, Immonet, Kleinanzeigen oder immobilien.de einfügen
- Eckdaten wie Kaufpreis, Wohnfläche, Zimmer, Baujahr, Hausgeld und Miete automatisch erkennen
- Bruttomietrendite, Kaufpreisfaktor, Kaufnebenkosten, Finanzierungsrate und Cashflow berechnen
- Anzeigentext auf Hinweise wie Sonderumlagen, Sanierungsstau, Feuchtigkeit, Erbpacht, Heizungsbedarf, Dach/Fassade, Denkmalschutz und Renovierungsbedarf prüfen
- Manueller Text-Fallback, falls ein Immobilienportal automatisierte Abrufe blockiert
- Responsive Oberfläche für Desktop, Tablet und Smartphone

## Entwicklung

```bash
npm install
npm run dev
```

Danach ist die App unter `http://localhost:3000` erreichbar.

## Hinweis

Die Analyse ist eine automatisierte Vorprüfung. Sie ersetzt keine Prüfung von WEG-Protokollen, Teilungserklärung, Rücklagen, Sonderumlagen, Energieausweis, Mietvertrag, Gebäudetechnik, Finanzierung, Steuern oder rechtlichen Fragen.
