```markdown
# Adventskalender 2025 — Statisches Projekt (für GitHub Pages)

Dieses Repository enthält eine einfache, konfigurierbare statische Webseite für einen Adventskalender (01.12.2025–24.12.2025).
Die Seite zeigt Türchen, die je nach lokalem Datum geöffnet werden können. Inhalt jedes Türchens ist eine Audiodatei.

Wichtig
- Lege deine Audiodateien im Ordner `audio/` ab.
- Benenne die Dateien wie folgt (Beispiel; verschiedene Endungen sind möglich):
  - `Kapitel1.mp3`
  - `Kapitel2.m4a`
  - …
  - `Kapitel24.m4a`

Konfiguration
- config.json: Hauptkonfiguration (Audio-Pfad, Präfix, unterstützte Endungen, Hintergrundbild)
- layout.json: Positionen und Größen für die 24 Türchen (top/left/width/height in Prozent)

Deployment (GitHub Pages)
1. Erstelle ein neues Repository `lloydnant89/adventskalender-2025`.
2. Lege die Dateien aus diesem Projekt in das Repo (Branch: main).
3. Füge den Ordner `audio/` mit deinen Audiodateien hinzu.
4. Aktiviere GitHub Pages: Settings → Pages → Branch: main → Root (oder / (root)).
5. Warte ein paar Minuten, die Seite sollte dann unter `https://lloydnant89.github.io/adventskalender-2025/` erreichbar sein.

Anpassungen
- Hintergrundbild: setze `backgroundImage` in config.json (z. B. "assets/bg.jpg"). Lade das Bild ins Repo (z. B. in `assets/`).
- Tür-Positionen: passe `layout.json` an. Beispielformat:
  {
    "door": {
      "1": { "top": 5, "left": 6, "width": 12, "height": 14 },
      "2": { "top": 30, "left": 10, "width": 18, "height": 16 },
      ...
    }
  }
  Werte sind Prozentangaben relativ zur Bühne (Stage).

Dateinamen-Logik
- Default: Präfix `Kapitel` + Tageszahl ohne führende Null (z. B. Kapitel1).
- Es wird automatisch auch die zweistellige Variante getestet (Kapitel01), sowie lowercase-Fallbacks.
- Unterstützte Endungen in config.json (Standard: m4a, mp3, ogg, wav).

Lokale Zeit
- Die Seite verwendet standardmäßig die lokale Zeit des Besuchers, um freizugeben, ob ein Türchen geöffnet werden kann.

Hilfe
- Wenn du möchtest, lade ich dir eine ZIP-Datei mit dem Projekt herunterbereit.
- Alternativ: Ich kann das Repo für dich anlegen und pushen, falls du mir kurz Schreibrechte gibst oder mir einen Gast-Collaborator hinzufügst. (Falls du das nicht möchtest, kopiere die Dateien manuell in dein neues Repo.)

Viel Spaß beim Befüllen der Türchen!
```