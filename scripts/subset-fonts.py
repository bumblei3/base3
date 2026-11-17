#!/usr/bin/env python3
"""subset-fonts.py — die Schriften auf die tatsächlich genutzten Zeichen stützen.

`fetch-fonts.py` holt den latin-Subset von Google. Die Seiten rendern davon
deutlich weniger, und beide Dateien liegen per `<link rel="preload">` auf dem
kritischen Pfad. Stand vor diesem Schritt: 40,8 KB = 59,6 % des Transfers
(gemessen an der Live-Seite).

Das Skript liest die Zeichen aus `index.html` und `404.html` (sichtbarer Text,
alt-/title-/aria-label-Attribute plus einer kleinen Grundlage), stygt beide
woff2 darauf zurück und prüft anschließend, ob noch jedes genutzte Zeichen
drin ist. Variable Achsen (wght) bleiben erhalten, sonst gäbe es fünf statische
Dateien statt einer.

Aufruf:  python3 scripts/subset-fonts.py [--check]
Exit:    0 = gestützt und vollständig, 1 = Abweichung/Fehler
"""

import argparse
import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
FONT_DIR = BASE3 / "assets" / "fonts"
SOURCES = ("index.html", "404.html")

# Grundlage, die die Seiten nicht wirklich rendern, aber jeder Text braucht.
BASIS = "".join(chr(c) for c in range(0x20, 0x7F)) + "äöüÄÖÜß×—–„“”‚‘…§°"

# Zeichen, die bewusst auf die Systemschrift ausweichen: Symbole und Emoji,
# die weder Outfit noch JetBrains Mono enthalten.
AUSNAHMEN = {ord(c) for c in "♟♞♜♝♛♚⬡⚔☰↗→🔥🌊🌿🏠🐙️|"}


def _sichtbarer_text(html: str) -> str:
    """Text, der im Browser gerendert wird — Kommentare zuerst entfernen.

    Die Reihenfolge ist entscheidend: in index.html steht im HTML-Kommentar
    über dem Font-Preload der Wortlaut „inline-<style>". Würde man zuerst nach
    <style>-Blöcken suchen, verschlingerte der Ausdruck die Kommentare in den
    Block — und damit CSS-Wortschatz in die Zeichenmenge.
    """
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    html = re.sub(r"<(script|style)\b.*?</\1>", " ", html, flags=re.S | re.I)
    attribute = []
    for tag in re.findall(r"<[^>]+>", html):
        for name in ("alt", "title", "aria-label", "placeholder"):
            wert = re.search(rf'{name}="([^"]*)"', tag)
            if wert:
                attribute.append(wert.group(1))
    return re.sub(r"<[^>]+>", " ", html) + " " + " ".join(attribute)


def used_characters() -> str:
    """Zeichen, die die Seiten rendern — aus dem Markup gelesen, nicht gelistet."""
    text = "".join(_sichtbarer_text((BASE3 / n).read_text(encoding="utf-8")) for n in SOURCES)
    # Leerzeichen/Zeilenumbrüche sind keine Glyphen-Anforderung.
    return "".join(sorted({z for z in text if z.isprintable()}))


def subset_characters() -> str:
    """Eingabe für die Stützung: Textzeichen plus Grundlage.

    Die Grundlage darf im Font fehlen (die Seiten rendern sie nicht) — sie
    wird nur mitgenommen, wenn der Font die Glyphen hat. Anforderung ist
    ausschließlich die Textmenge.
    """
    return "".join(sorted(set(used_characters()) | set(BASIS)))


def _cmap(pfad: Path) -> dict[int, str]:
    from fontTools.ttLib import TTFont

    with TTFont(pfad) as font:
        return font.getBestCmap()


def _achsen(pfad: Path) -> list[tuple[str, float, float]]:
    from fontTools.ttLib import TTFont

    with TTFont(pfad) as font:
        if "fvar" not in font:
            return []
        return [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes]


def _gewichtsbereich(pfad: Path) -> str:
    for tag, lo, hi in _achsen(pfad):
        if tag == "wght":
            return f"{int(lo)} {int(hi)}"
    raise ValueError(f"{pfad.name}: keine wght-Achse — ist das noch eine Variable Font?")


def _subset(pfad: Path, zeichen: str) -> int:
    from fontTools import subset

    optionen = subset.Options()
    optionen.flavor = "woff2"
    optionen.name_IDs = ["*"]
    optionen.notdef_outline = True
    optionen.recalc_bounds = True
    optionen.layout_features = ["*"]
    font = subset.load_font(str(pfad), optionen)
    auswahl = subset.Subsetter(options=optionen)
    auswahl.populate(text=zeichen)
    auswahl.subset(font)
    font.save(str(pfad))
    return pfad.stat().st_size


def subset_out(verzeichnis: Path) -> int:
    """Stützt alle woff2 in `verzeichnis`; 0 = vollständig."""
    zeichen = used_characters()
    print(f"genutzte Zeichen: {len(zeichen)} (aus {', '.join(SOURCES)})", file=sys.stderr)

    fehler: list[str] = []
    for datei in sorted(verzeichnis.glob("*.woff2")):
        vorher = datei.stat().st_size
        nachher = _subset(datei, subset_characters())
        cmap = _cmap(datei)
        print(f"  {datei.name:<32} {vorher/1024:6.1f} → {nachher/1024:6.1f} KB  "
              f"{len(cmap)} Glyphen", file=sys.stderr)

        fehlend = sorted(z for z in zeichen if ord(z) not in cmap)
        unerwartet = [z for z in fehlend if ord(z) not in AUSNAHMEN]
        if unerwartet:
            fehler.append(f"{datei.name}: Zeichen fehlen: {''.join(unerwartet)}")
        if not _achsen(datei):
            fehler.append(f"{datei.name}: variable Achsen gegangen (fvar fehlt)")

    if fehler:
        for zeile in fehler:
            print(f"FEHLER: {zeile}", file=sys.stderr)
        return 1
    print("SUBSET OK", file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Schriften auf die genutzten Zeichen stützen.")
    parser.add_argument("--check", action="store_true", help="nur prüfen, nichts schreiben")
    parser.add_argument("--out", default=str(FONT_DIR), help="Verzeichnis mit den woff2-Dateien")
    args = parser.parse_args()

    if args.check:
        zeichen = used_characters()
        print(f"genutzte Zeichen: {len(zeichen)} (aus {', '.join(SOURCES)})", file=sys.stderr)
        fehler: list[str] = []
        for datei in sorted(Path(args.out).glob("*.woff2")):
            cmap = _cmap(datei)
            print(f"  {datei.name:<32} {datei.stat().st_size/1024:6.1f} KB  "
                  f"{len(cmap)} Glyphen", file=sys.stderr)
            unerwartet = [
                z for z in zeichen if ord(z) not in cmap and ord(z) not in AUSNAHMEN
            ]
            if unerwartet:
                fehler.append(f"{datei.name}: Zeichen fehlen: {''.join(sorted(unerwartet))}")
            if not _achsen(datei):
                fehler.append(f"{datei.name}: variable Achsen gegangen (fvar fehlt)")
        if fehler:
            for zeile in fehler:
                print(f"FEHLER: {zeile}", file=sys.stderr)
            return 1
        print("SUBSET OK", file=sys.stderr)
        return 0

    return subset_out(Path(args.out))


if __name__ == "__main__":
    sys.exit(main())
