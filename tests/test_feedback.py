"""Feedback-Kanal: Issue-Formular, Kontakt-Links, Footer und FAQ."""

from pathlib import Path

BASE3 = Path(__file__).resolve().parent.parent
FORM = "https://github.com/bumblei3/base3/issues/new?template=feedback.yml"
PLAYTEST = "https://github.com/bumblei3/schach9x9/issues/new?template=playtest.yml"
TRISCHACH = "https://github.com/bumblei3/trischach/issues/new?template=feedback.md"


def test_issue_form_asks_for_page_problem_and_browser():
    text = (BASE3 / ".github" / "ISSUE_TEMPLATE" / "feedback.yml").read_text(encoding="utf-8")
    assert 'labels: ["feedback"]' in text
    assert "Startseite" in text
    assert "Schach9x9-Karte" in text
    assert "Trischach-Karte" in text
    assert "Feedback zu base3 ist ausdrücklich erwünscht" in text
    assert "label: Dein Feedback" in text
    assert "label: Browser" in text


def test_blank_issues_stay_open_and_games_have_their_own_forms():
    text = (BASE3 / ".github" / "ISSUE_TEMPLATE" / "config.yml").read_text(encoding="utf-8")
    assert "blank_issues_enabled: true" in text
    assert PLAYTEST in text
    assert TRISCHACH in text


def test_footer_and_faq_open_the_form():
    html = (BASE3 / "index.html").read_text(encoding="utf-8")
    faq = (BASE3 / "FAQ.md").read_text(encoding="utf-8")
    footer = html.split("<footer", 1)[1]
    assert f'href="{FORM}"' in footer
    assert ">Feedback</a>" in footer
    assert "flex-wrap: wrap" in html.split(".footer-links", 1)[1].split("}", 1)[0]
    assert "Feedback zu base3 ist ausdrücklich erwünscht" in html
    assert "Feedback-Formular" in html
    assert PLAYTEST in html
    assert TRISCHACH in html
    assert "Feedback zu base3 ist ausdrücklich erwünscht" in faq
    assert FORM in faq
    assert PLAYTEST in faq
    assert TRISCHACH in faq
    assert "benötigt keine Beiträge" not in html
    assert "benötigt keine Beiträge" not in faq
