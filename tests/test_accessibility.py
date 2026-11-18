"""Tests für Kontrast-Check und Accessibility-Markup der Landing Page."""

import importlib.util
import re
import sys
from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "check_contrast", BASE3 / "scripts" / "check-contrast.py"
)
assert _spec is not None and _spec.loader is not None
cc = importlib.util.module_from_spec(_spec)
sys.modules["check_contrast"] = cc
_spec.loader.exec_module(cc)

HTML = (BASE3 / "index.html").read_text(encoding="utf-8")


# ------------------------------------------------------------- Mathe
def test_ratio_extremes():
    assert abs(cc.contrast_ratio("#ffffff", "#000000") - 21.0) < 0.01
    assert abs(cc.contrast_ratio("#000000", "#ffffff") - 21.0) < 0.01
    assert cc.contrast_ratio("#ffffff", "#ffffff") == 1.0


def test_detects_insufficient_contrast():
    assert cc.contrast_ratio("#777777", "#ffffff") < cc.AA_NORMAL
    assert cc.contrast_ratio("#818cf8", "#05071a") >= cc.AA_NORMAL


# ------------------------------------------------------- reale Seite
def test_real_palette_has_no_failures():
    """Die committede Palette muss alle AA-Schwellen bestehen."""
    failures = [
        (name, cc.contrast_ratio(fg, bg), large)
        for name, fg, bg, large in cc.build_pairs()
        if cc.contrast_ratio(fg, bg) < (cc.AA_LARGE if large else cc.AA_NORMAL)
    ]
    assert failures == []


def test_palette_tokens_match_root_block():
    assert cc.check_palette_consistency() == []


# -------------------------------------------------- Accessibility-Markup
def test_skip_link_exists_and_targets_main():
    assert 'class="skip-link"' in HTML
    assert 'href="#main-content"' in HTML
    assert 'id="main-content"' in HTML


def test_focus_visible_styles_exist():
    assert ":focus-visible" in HTML
    assert ":focus:not(:focus-visible)" in HTML


def test_how_to_label_uses_the_pill_rule():
    assert ".whats-new-label,\n    .how-to-label {" in HTML


def test_how_to_labels_do_not_shrink():
    assert ".how-to-list li strong { flex: none; white-space: nowrap; }" in HTML


def test_stats_omit_the_slogan():
    assert "Möglichkeiten" not in HTML
    assert ">2</div><div class=\"stat-label\">Spiele</div>" in HTML


def test_platform_cards_stack_below_768px():
    mobile = HTML.split("@media (max-width: 768px)", 1)[1].split("@media", 1)[0]
    assert ".platform-cards { grid-template-columns: 1fr; }" in mobile
    assert ".platform-cards { display: grid; grid-template-columns: 1fr 1fr;" in HTML


def test_platform_intro_is_left_aligned():
    assert "text-align: left;" in HTML.split(".platform-text {", 1)[1].split("}", 1)[0]
    assert "text-align: left;" in HTML.split(".platform-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".platform-heading {", 1)[1].split("}", 1)[0]


def test_how_to_cards_are_left_aligned():
    assert "text-align: left;" in HTML.split(".how-to-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".how-to-heading {", 1)[1].split("}", 1)[0]


def test_faq_cards_are_left_aligned():
    assert ".faq-card {" in HTML
    assert "text-align: left;" in HTML.split(".faq-card {", 1)[1].split("}", 1)[0]
    assert "text-align: center;" in HTML.split(".faq-q {", 1)[1].split("}", 1)[0]


def test_faq_grid_is_two_columns_from_700px():
    assert ".faq-grid { display: grid; grid-template-columns: 1fr;" in HTML
    assert "@media (min-width: 700px)" in HTML
    assert ".faq-grid { grid-template-columns: 1fr 1fr; }" in HTML


def test_landing_page_omits_siehe_auch_card():
    assert '<h3 class="faq-q">Siehe auch</h3>' not in HTML
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "## Siehe auch" in faq


def test_hero_offers_both_games():
    hero = HTML.split('<section class="hero">', 1)[1].split(
        '<section class="platform-intro"', 1
    )[0]
    assert hero.index('<div class="hero-actions">') < hero.index("dev-status-note")
    actions = hero.split('<div class="hero-actions">', 1)[1].split("</div>", 1)[0]
    assert 'href="https://bumblei3.github.io/schach9x9/">Schach9x9 spielen</a>' in actions
    assert 'href="https://bumblei3.github.io/trischach/">Trischach spielen</a>' in actions
    css = HTML.split(".hero-actions {", 1)[1].split("}", 1)[0]
    assert "flex-wrap: wrap" in css
    reduced = HTML.split("@media (prefers-reduced-motion: reduce)", 1)[1].split(
        "@media print", 1
    )[0]
    assert ".hero-actions" in reduced


def test_hero_says_install_is_the_browser_not_steam():
    hero = HTML.split('<section class="hero">', 1)[1].split(
        '<section class="platform-intro"', 1
    )[0]
    note = " ".join(
        hero.split('<p class="install-note">', 1)[1].split("</p>", 1)[0].split()
    )
    assert "Im Browser lassen sich beide Spiele als App installieren." in note
    assert "Eine Windows-Datei und eine Steam-Seite gibt es nicht." in note
    assert hero.index("hero-actions") < hero.index("install-note") < hero.index("dev-status-note")


def test_trischach_mentions_solo_mode():
    card = HTML.split('id="trischach"', 1)[1].split("</article>", 1)[0]
    assert "<li>Solo gegen die KI</li>" in card
    how = HTML.split('class="how-to-card trischach-card"', 1)[1].split("</article>", 1)[0]
    assert "Solo gegen die KI, oder eine Runde zu dritt." in how
    platform = HTML.split('<section class="platform-intro"', 1)[1].split("</section>", 1)[0]
    assert "Solo gegen die KI" in platform
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "Solo-Modus: eine Fraktion gegen die KI" in faq


def test_whats_new_matches_the_live_games():
    """Die Karten nennen das, was die *aktuelle* Version enthält.

    Geprüft wurde das historisch: Unter der Beschriftung „Schach9x9 · v2.1.0"
    standen die Highlights von v2.0.0, weil der lokale Sync nur die Versionsstand-
    Pillen austauscht und die Bullets handgepflegt sind.
    """
    stale = "Tipps in Kampagnen nur mit Perk"
    splitting = "Code-Splitting"
    board = "Brett wieder quadratisch"
    cross = "Kreuz-Modus im 3D"
    campaign = "Kampagne Akt IV (Kapitel 19–25)"
    report = "Problem melden"
    report_where = "unter Einstellungen"
    solo = "Solo-Modus: eine Fraktion gegen die KI"
    tempo = "Kürzere Zugzeit, ohne die Engine zu schwächen"
    for text in (HTML, (BASE3 / "FAQ.md").read_text(encoding="utf-8"), (BASE3 / "README.md").read_text(encoding="utf-8")):
        assert stale not in text
        assert splitting not in text
        for bullet in (board, cross, campaign, report, report_where, solo, tempo):
            assert bullet in text


def test_schach9x9_mentions_daily_puzzle_and_later_campaign():
    card = HTML.split('id="schach9x9"', 1)[1].split("</article>", 1)[0]
    assert "<li>Tägliches Puzzle</li>" in card
    assert "Kampagne bis Akt IV" in card
    how = HTML.split('class="how-to-card schach9x9-card"', 1)[1].split("</article>", 1)[0]
    assert "tägliches Puzzle" in how
    # Die Kampagne hat vier Akte: I (1–6), II (7–12), III (13–18), IV (19–25)
    # — js/campaign/campaignData.ts im schach9x9-Repo. Hier stand früher nur
    # „Akt II und Akt IV", also die Hälfte.
    assert "Kampagne Akt I–IV (Kapitel 1–25)" in how
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "tägliches Puzzle" in faq
    assert "Kampagne Akt I–IV (Kapitel 1–25)" in faq


def test_fairy_pieces_match_the_game():
    """Die Feenfiguren beschreiben, was im Spiel steht — nicht was jemand
    einmal davongeträumt hat.

    Ursprung: Der Engel wurde als „Defensivfigur, die schützende Züge
    ermöglicht und tief in die eigenen Linien zurückkehrt" angekündigt; er ist
    in Wahrheit Dame + Springer und die stärkste Figur. Der Nachtreiter fehlte
    in allen drei Dateien komplett.
    """
    names = ("Erzbischof", "Kanzler", "Nachtreiter", "Engel")
    combos = ("Läufer+Springer", "Turm+Springer", "Dame+Springer", "gleitender")
    texts = {
        "index.html": HTML,
        "README.md": (BASE3 / "README.md").read_text(encoding="utf-8"),
        "FAQ.md": (BASE3 / "FAQ.md").read_text(encoding="utf-8"),
    }
    for label, text in texts.items():
        flat = re.sub(r"\s+", "", text)
        for name in names:
            assert name in flat, f"{label}: {name} fehlt"
        for combo in combos:
            assert combo in flat, f"{label}: {combo} fehlt"
        assert "Defensiv" not in flat, (
            f"{label}: der Engel wird immer noch als Defensivfigur beschrieben"
        )


def test_docs_agree_that_the_whats_new_bullets_are_handwritten():
    """README und FAQ durften behaupten, die Bullets kämen vom Script.

    Die Auto-Extraktion lieferte „Code-Splitting", die Bullets wurden von Hand
    korrigiert und werden von einem Test festgehalten — die Doku sagte aber
    noch das Gegenteil.
    """
    for name in ("README.md", "FAQ.md"):
        text = (BASE3 / name).read_text(encoding="utf-8")
        assert "handgepflegt" in text, f"{name} sage nicht, dass die Bullets handgepflegt sind"
        assert "Bullets kommen aus den Release-Notes" not in text, (
            f"{name} behauptet noch, die Bullets kämen aus den Release-Notes"
        )


def test_decorative_bullets_are_not_text_glyphs():
    """Ein content-Glyph in einem Pseudo-Element wird vom Screenreader gesagt.

    Der Stern in .features-list ist schon als SVG-Maske umgesetzt, weil ein
    Textglyph einmal pro Feature „Funkeln" vorgelesen wurde. Die Listenpunkte
    in .whats-new-list und .how-to-list standen als '·' bzw. '•' und landeten
    so im Accessibility-Tree — gemessen über Accessibility.getFullAXTree.
    """
    bodies = re.findall(r"::(?:before|after)\s*\{([^}]*)\}", HTML)
    assert bodies, "keine Pseudo-Elemente gefunden — der Test prüft nichts"
    glyphs = []
    for body in bodies:
        for match in re.finditer(r"content:\s*([^;]+);", body):
            value = match.group(1).strip()
            # Der Druckfall schreibt Link-Ziele mit (attr(href)) — kein Deko-
            # Glyph, und bewusst hörbar.
            if "attr(" in value:
                continue
            text = value.strip("'\"").strip()
            if text:
                glyphs.append(text)
    assert glyphs == [], (
        f"dekorative Pseudo-Elemente mit Textglyph: {glyphs!r} — das landet im "
        "Accessibility-Tree und wird je Zeile vorgelesen"
    )


def test_play_faq_uses_demo_names():
    assert ">Schach9x9 Live-Demo</a>" in HTML
    assert ">Trischach Live-Demo</a>" in HTML
    assert ">https://bumblei3.github.io/schach9x9/</a>" not in HTML
    assert ">https://bumblei3.github.io/trischach/</a>" not in HTML
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    assert "[Schach9x9 Live-Demo](https://bumblei3.github.io/schach9x9/)" in faq
    assert "[Trischach Live-Demo](https://bumblei3.github.io/trischach/)" in faq


def test_navigation_has_aria_label():
    assert 'aria-label="Hauptnavigation"' in HTML


def test_images_have_alt_text():
    import re

    imgs = re.findall(r"<img [^>]*>", HTML)
    assert imgs, "keine Bilder gefunden"
    for img in imgs:
        assert "alt=" in img, f"img ohne alt: {img}"


def test_language_attribute_set():
    assert '<html lang="de">' in HTML


def test_every_article_has_a_heading():
    """Offline-Spiegel der Nu-Warnung „Article lacks heading".

    Eine <article> ohne h2-h6 ist für Screenreader kein Sprungziel und wird vom
    W3C-Validator beanstandet (scripts/validate-html.py --strict prüft dasselbe
    online). Die Karten-Labels (platform/whats-new/how-to) sind deshalb <h3>.
    """
    import re

    articles = re.findall(r"<article[^>]*>(.*?)</article>", HTML, re.S)
    assert articles, "keine <article> gefunden"
    without = [
        card.strip()[:60]
        for card in articles
        if not re.search(r"<h[2-6][^>]*>", card)
    ]
    assert not without, f"<article> ohne Überschrift: {without}"


def test_mobile_nav_works_without_javascript():
    """Ohne JS muss die Navigation benutzbar bleiben.

    Im Mobile-Block war .nav-links per Media-Query versteckt und nur über
    '.open' (vom ☰-Button per JS gesetzt) sichtbar — ohne JavaScript war die
    Navigation damit auf dem Handy nicht erreichbar. Das Einklappen hängt
    deshalb an der .js-Class, die ein früher Inline-Script im <head> setzt.
    """
    import re

    head = HTML.split("</head>")[0]
    assert "document.documentElement.classList.add('js')" in head, (
        "die .js-Class muss vor dem ersten Rendern gesetzt werden"
    )
    assert ".js .nav-links {" in HTML, "das Einklappen muss auf .js beschränkt sein"
    assert ".js .nav-toggle {" in HTML
    # Nichts versteckt die Links ohne .js
    assert not re.search(r"(?<!\.js )\.nav-links\s*\{\s*display:\s*none", HTML)
    # Der Button bleibt ohne JS unsichtbar (sonst ein Bedienelement ohne Funktion)
    assert re.search(r"\.nav-toggle\s*\{\s*display:\s*none", HTML)
    # Fallback im Mobile-Block: sichtbar und umbrechend
    assert "flex-wrap: wrap; justify-content: flex-end;" in HTML


def test_decorative_emoji_are_hidden_from_screen_readers():
    """Emoji neben dem sie beschreibenden Wort sind dekorativ. Ohne
    aria-hidden liest der Screenreader beides vor („Haus Start“,
    „Feuer Feuer“) — das Doppelte ist reines Rauschen."""
    import re

    for icon, label in (("🏠", "Start"), ("♟️", "Schach9x9"), ("⬡", "Trischach")):
        match = re.search(
            r'<span class="icon"([^>]*)>' + re.escape(icon) + r"</span><span>" + label,
            HTML,
        )
        assert match, f"Icon {icon} mit Label {label} nicht gefunden"
        assert 'aria-hidden="true"' in match.group(1), f"{icon} ist nicht aria-hidden"

    assert '<span class="logo" aria-hidden="true">♟</span>' in HTML, (
        "das Logo-Symbol ist dekorativ (das Wort Base3 folgt direkt)"
    )
    # Inline-Emoji, die ihr eigenes Wort wiederholen: jede Stelle im sichtbaren
    # Text muss in einem aria-hidden-Span stehen. Das JSON-LD liegt in einem
    # <script> und wird deshalb ausgenommen. Welche Emoji auftauchen, hängt vom
    # Inhalt der Release-Notes ab — geprüft wird das Wrapping, nicht die
    # Präsenz.
    import re as _re

    body = _re.sub(r"<script.*?</script>", "", HTML.split("</style>", 1)[1], flags=_re.S)
    for emoji in ("🔥", "🌿", "🌊", "💬", "♟", "⬡", "🏠", "🐙"):
        start = 0
        while True:
            i = body.find(emoji, start)
            if i < 0:
                break
            tag_start = body.rfind("<span", 0, i)
            tag = body[tag_start : body.find(">", tag_start)]
            assert 'aria-hidden="true"' in tag, (
                f"{emoji} steht ungeschützt im Text: <{tag}>"
            )
            start = i + 1


def test_features_star_is_not_a_text_glyph():
    """content: '✦' landet im Accessibility-Tree und wird pro Feature als
    „Funkeln“ vorgelesen. Als SVG-Maske mit content:'' entsteht der Knoten
    nicht — das Bild bleibt identisch."""
    import re

    rule = re.search(r"\.features-list li::before\s*\{([^}]*)\}", HTML)
    assert rule, "Regel für .features-list li::before fehlt"
    body = rule.group(1)
    assert "content: ''" in body, "Stern muss mit content:'' gerendert werden"
    assert "mask" in body, "Stern muss als SVG-Maske gerendert werden"
    assert "✦" not in body, "✦ als Textglyph würde vorgelesen"


def test_fließtext_liegt_über_der_lesbarkeits_schwelle():
    """Die dichten Abschnitte hatten 0.82–0.9rem Fließtext.

    WCAG verlangt kein Minimum, aber bei diesen Textmengen (FAQ, Regeln,
    News, Footer) ist 13 px im Browser eine Augenbelastung. Fließtext liegt
    jetzt bei 1rem, Listen bei 0.95rem — der Test hält die Schwelle fest,
    damit sie nicht still wieder nach unten optimiert wird.

    Gilt für jede ausgelieferte Seite, nicht nur die Startseite: auf 404.html
    stand `.hint` bei 0.82rem (13,1 px) und die Karten bei 0.92rem — die
    Fehlerseite war die einzige Seite unter dem Sockel.
    """
    import re

    regeln = {
        "index.html": {
            ".platform-card p": 16,
            ".faq-a": 16,
            ".how-to-list": 16,
            ".footer": 16,
            ".features-list": 15.2,
            ".whats-new-list": 15.2,
            ".faq-links": 15.2,
        },
        "404.html": {
            "a.card": 15.2,
            ".hint": 15.2,
        },
    }
    for seite, regeln_pro_seite in regeln.items():
        quelle = (BASE3 / seite).read_text(encoding="utf-8")
        for selektor, minimum in regeln_pro_seite.items():
            treffer = re.search(rf"{re.escape(selektor)}\s*\{{([^}}]*)\}}", quelle)
            assert treffer, f"{seite}: {selektor} nicht im CSS gefunden"
            größe = re.search(r"font-size:\s*([0-9.]+)\s*rem", treffer.group(1))
            assert größe, f"{seite}: {selektor} hat keine rem-Schriftgröße"
            assert float(größe.group(1)) * 16 >= minimum - 0.01, (
                f"{seite}: {selektor}: {float(größe.group(1)) * 16:.1f}px liegt unter {minimum}px"
            )


def test_was_ist_neu_bullets_sind_einspaltig():
    """Die Bullets sind ganze Sätze, die Karten schmal (max ~345 px).

    Bei `1fr 1fr` kamen auf 1280 px 142 px Spalten zusammen und ein Bullet
    brach in 6–7 Zeilen — gemessen. Die sibling-Regel `.features-list`
    kürzt unter 768 px ebenfalls auf eine Spalte, dort sind die Einträge
    aber kurze Phrasen.
    """
    treffer = re.search(r"\.whats-new-list\s*\{([^}]*)\}", HTML)
    assert treffer, ".whats-new-list nicht im CSS gefunden"
    assert "grid-template-columns: 1fr;" in treffer.group(1), (
        ".whats-new-list ist wieder zweispaltig — die Sätze brechen in "
        "schmalen Spalten in 6–7 Zeilen"
    )
