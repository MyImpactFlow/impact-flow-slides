#!/usr/bin/env python3
"""
Impact Flow Präsentation Generator
=====================================
Generiert eine vollständige reveal.js Präsentation aus einer JSON-Konfiguration.

Verwendung:
    python3 erstelle-praesentation.py config.json
    python3 erstelle-praesentation.py config.json --output meine-praesi.html
    python3 erstelle-praesentation.py config.json --serve

JSON-Format: Siehe EXAMPLE_CONFIG unten.

Autor: Impact Flow / Claude Code
"""

import json
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================
# SLIDE TEMPLATES
# ============================================

SLIDE_TEMPLATES = {
    "title": """
    <section class="slide-title" data-no-logo="true">
      <img src="assets/IF-logo-white.png" alt="Impact Flow" class="logo fragment bounce-in">
      <h1 class="fragment fade-up">{title}</h1>
      <div class="subtitle-line fragment fade-up"></div>
      <h2 class="fragment fade-up">{subtitle}</h2>
      {author_html}
    </section>""",

    "section": """
    <section class="slide-section">
      <div class="section-number fragment bounce-in">{number}</div>
      <h2 class="fragment fade-up">{title}</h2>
      <p class="fragment fade-up">{subtitle}</p>
    </section>""",

    "content": """
    <section class="slide-content">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      {content_html}
    </section>""",

    "quote": """
    <section class="slide-quote">
      <div class="quote-mark fragment scale-in">&ldquo;</div>
      <blockquote class="fragment fade-up">
        {quote}
      </blockquote>
      <div class="quote-author fragment fade-up">
        &mdash; <span>{author}</span> {role}
      </div>
    </section>""",

    "three_cards": """
    <section class="slide-three-col {bg_class}">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <div class="cards" data-stagger="200">
        {cards_html}
      </div>
    </section>""",

    "icon_list": """
    <section class="slide-content slide-icon-list">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <div class="icon-items" data-stagger="150">
        {items_html}
      </div>
    </section>""",

    "stats": """
    <section class="slide-stats">
      <h2 class="fragment fade-up">{title}</h2>
      <div class="stats-grid">
        {stats_html}
      </div>
    </section>""",

    "two_columns": """
    <section class="slide-two-col slide-content">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <div class="columns">
        <div class="col fragment slide-left">
          {left_html}
        </div>
        <div class="col fragment slide-right">
          {right_html}
        </div>
      </div>
    </section>""",

    "timeline": """
    <section class="slide-content slide-timeline">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <div class="timeline" data-stagger="250">
        {steps_html}
      </div>
    </section>""",

    "table": """
    <section class="slide-content">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <table class="fragment fade-up">
        {table_html}
      </table>
    </section>""",

    "cta": """
    <section class="slide-cta" data-no-logo="true">
      <h2 class="fragment fade-up">{title}</h2>
      <p class="fragment fade-up">{text}</p>
      <a href="{url}" target="_blank" class="cta-button fragment bounce-in">
        {button_text}
      </a>
      <img src="assets/IF-logo-white.png" alt="Impact Flow" class="logo fragment fade-up">
    </section>""",

    "text_only": """
    <section class="slide-content {bg_class}">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      {paragraphs_html}
    </section>""",

    "bullet_list": """
    <section class="slide-content {bg_class}">
      {label_html}
      <h2>{title}</h2>
      <div class="divider"></div>
      <ul data-stagger="150">
        {list_html}
      </ul>
    </section>""",
}


# ============================================
# HELPER FUNCTIONS
# ============================================

def make_label(label, style="pink"):
    """Erzeugt ein Top-Label."""
    if not label:
        return ""
    badge = "badge-pink" if style == "pink" else "badge-mint"
    return f'<span class="top-label badge {badge}">{label}</span>'


def build_slide(slide_data):
    """Baut eine einzelne Slide aus den Daten."""
    slide_type = slide_data.get("type", "content")
    template = SLIDE_TEMPLATES.get(slide_type)

    if not template:
        print(f"  ⚠️  Unbekannter Slide-Typ: {slide_type}")
        return ""

    # Gemeinsame Variablen
    label_html = make_label(
        slide_data.get("label", ""),
        slide_data.get("label_style", "pink")
    )
    bg_class = slide_data.get("background", "")

    if slide_type == "title":
        author = slide_data.get("author", "")
        author_html = ""
        if author:
            author_html = f'<p class="fragment fade-up" style="margin-top: 2em; font-size: 0.7em;">Eine Präsentation von <strong style="color: var(--if-pink);">{author}</strong></p>'
        return template.format(
            title=slide_data.get("title", ""),
            subtitle=slide_data.get("subtitle", ""),
            author_html=author_html
        )

    elif slide_type == "section":
        return template.format(
            number=slide_data.get("number", "01"),
            title=slide_data.get("title", ""),
            subtitle=slide_data.get("subtitle", "")
        )

    elif slide_type == "content":
        content = slide_data.get("content", "")
        if isinstance(content, list):
            content_html = "\n".join(f'<p class="fragment fade-up">{p}</p>' for p in content)
        else:
            content_html = f'<p class="fragment fade-up">{content}</p>'
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            content_html=content_html
        )

    elif slide_type == "quote":
        return template.format(
            quote=slide_data.get("quote", ""),
            author=slide_data.get("author", ""),
            role=slide_data.get("role", "")
        )

    elif slide_type == "three_cards":
        cards = slide_data.get("cards", [])
        cards_html = ""
        for card in cards:
            cards_html += f"""
        <div class="card fragment fade-up">
          <div class="card-icon">{card.get('icon', '📌')}</div>
          <h3>{card.get('title', '')}</h3>
          <p>{card.get('text', '')}</p>
        </div>"""
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            cards_html=cards_html,
            bg_class=bg_class
        )

    elif slide_type == "icon_list":
        items = slide_data.get("items", [])
        items_html = ""
        for i, item in enumerate(items):
            color_class = "pink" if i % 2 == 0 else "mint"
            items_html += f"""
        <div class="icon-item fragment fade-up">
          <div class="icon {color_class}">{item.get('icon', '✓')}</div>
          <div>
            <h4>{item.get('title', '')}</h4>
            <p>{item.get('text', '')}</p>
          </div>
        </div>"""
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            items_html=items_html
        )

    elif slide_type == "stats":
        stats = slide_data.get("stats", [])
        stats_html = ""
        for stat in stats:
            count_to = stat.get("number", 0)
            suffix = stat.get("suffix", "")
            prefix = stat.get("prefix", "")
            stats_html += f"""
        <div class="stat fragment scale-in">
          <div class="stat-number" data-count-to="{count_to}" data-count-suffix="{suffix}" data-count-prefix="{prefix}">{prefix}0{suffix}</div>
          <div class="stat-label">{stat.get('label', '')}</div>
        </div>"""
        return template.format(
            title=slide_data.get("title", ""),
            stats_html=stats_html
        )

    elif slide_type == "two_columns":
        left = slide_data.get("left", [])
        right = slide_data.get("right", [])

        def render_boxes(boxes):
            html = ""
            for box in boxes:
                box_class = "pink" if box.get("style") == "pink" else ""
                html += f"""
          <div class="highlight-box {box_class}">
            <h4>{box.get('icon', '')} {box.get('title', '')}</h4>
            <p>{box.get('text', '')}</p>
          </div>"""
            return html

        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            left_html=render_boxes(left),
            right_html=render_boxes(right)
        )

    elif slide_type == "timeline":
        steps = slide_data.get("steps", [])
        steps_html = ""
        for i, step in enumerate(steps):
            steps_html += f"""
        <div class="timeline-item fragment fade-up">
          <h4>Schritt {i+1} — {step.get('title', '')}</h4>
          <p>{step.get('text', '')}</p>
        </div>"""
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            steps_html=steps_html
        )

    elif slide_type == "table":
        headers = slide_data.get("headers", [])
        rows = slide_data.get("rows", [])
        table_html = "<thead><tr>"
        for h in headers:
            table_html += f"<th>{h}</th>"
        table_html += "</tr></thead><tbody>"
        for row in rows:
            table_html += "<tr>"
            for cell in row:
                table_html += f"<td>{cell}</td>"
            table_html += "</tr>"
        table_html += "</tbody>"
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            table_html=table_html
        )

    elif slide_type == "cta":
        return template.format(
            title=slide_data.get("title", "Bereit?"),
            text=slide_data.get("text", ""),
            url=slide_data.get("url", "https://myimpactflow.ch/eTermin"),
            button_text=slide_data.get("button", "Erstgespräch buchen")
        )

    elif slide_type == "text_only":
        paragraphs = slide_data.get("paragraphs", [])
        paragraphs_html = "\n".join(
            f'<p class="fragment fade-up">{p}</p>' for p in paragraphs
        )
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            paragraphs_html=paragraphs_html,
            bg_class=bg_class
        )

    elif slide_type == "bullet_list":
        items = slide_data.get("items", [])
        list_html = "\n".join(
            f'<li class="fragment fade-up">{item}</li>' for item in items
        )
        return template.format(
            label_html=label_html,
            title=slide_data.get("title", ""),
            list_html=list_html,
            bg_class=bg_class
        )

    return ""


# ============================================
# HTML DOCUMENT TEMPLATE
# ============================================

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Impact Flow</title>

  <!-- Reveal.js Core CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">

  <!-- Impact Flow Custom Theme -->
  <link rel="stylesheet" href="css/impact-flow.css">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="assets/IF-logo-color.png">
</head>
<body>

<div class="reveal">
  <div class="slides">
{slides_html}
  </div>
</div>

<!-- Reveal.js Core -->
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/notes/notes.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/markdown/markdown.js"></script>

<!-- Impact Flow Custom JS -->
<script src="js/impact-flow.js"></script>

<script>
  Reveal.initialize({{
    width: 1280,
    height: 720,
    margin: 0,
    minScale: 0.2,
    maxScale: 2.0,
    hash: true,
    history: true,
    keyboard: true,
    touch: true,
    transition: '{transition}',
    transitionSpeed: 'default',
    backgroundTransition: 'fade',
    progress: true,
    slideNumber: true,
    center: false,
    controls: true,
    autoAnimateEasing: 'ease-out',
    autoAnimateDuration: 0.8,
    pdfMaxPagesPerSlide: 1,
    pdfSeparateFragments: false,
    plugins: [RevealNotes, RevealMarkdown]
  }});
</script>

</body>
</html>"""


# ============================================
# MAIN
# ============================================

def generate(config_path, output_path=None):
    """Generiert eine Präsentation aus einer JSON-Konfig."""

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    title = config.get("title", "Präsentation")
    transition = config.get("transition", "slide")
    slides = config.get("slides", [])

    if not slides:
        print("  ❌ Keine Slides in der Konfiguration gefunden.")
        sys.exit(1)

    # Slides generieren
    slides_html = ""
    for slide in slides:
        slides_html += build_slide(slide)

    # HTML zusammenbauen
    html = HTML_TEMPLATE.format(
        title=title,
        transition=transition,
        slides_html=slides_html
    )

    # Output-Pfad bestimmen
    if not output_path:
        base_name = os.path.splitext(os.path.basename(config_path))[0]
        output_path = os.path.join(SCRIPT_DIR, "praesentationen", f"{base_name}.html")

    # Ordner erstellen falls nötig
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Pfade anpassen wenn in Unterordner
    rel_dir = os.path.relpath(SCRIPT_DIR, os.path.dirname(output_path))
    if rel_dir != ".":
        html = html.replace('href="css/', f'href="{rel_dir}/css/')
        html = html.replace('src="assets/', f'src="{rel_dir}/assets/')
        html = html.replace('src="js/', f'src="{rel_dir}/js/')

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n  ✅ Präsentation erstellt: {output_path}")
    print(f"  📊 {len(slides)} Slides generiert")
    print(f"  🌸 Theme: Impact Flow")
    print(f"  🎬 Übergang: {transition}")
    print(f"\n  Starten mit: python3 serve.py --open")
    print()

    return output_path


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n  Beispiel-Konfiguration erstellen:")
        print("  python3 erstelle-praesentation.py --beispiel\n")
        sys.exit(0)

    if sys.argv[1] == "--beispiel" or sys.argv[1] == "--example":
        # Beispiel-JSON erstellen
        example = {
            "title": "Meine Präsentation",
            "transition": "slide",
            "slides": [
                {
                    "type": "title",
                    "title": "Präsentation Titel",
                    "subtitle": "Untertitel hier",
                    "author": "Jean Pierre Seemann"
                },
                {
                    "type": "section",
                    "number": "01",
                    "title": "Erster Abschnitt",
                    "subtitle": "Beschreibung des Abschnitts"
                },
                {
                    "type": "three_cards",
                    "title": "Drei Punkte",
                    "label": "Überblick",
                    "background": "bg-warm",
                    "cards": [
                        {"icon": "💡", "title": "Punkt 1", "text": "Beschreibung"},
                        {"icon": "🎯", "title": "Punkt 2", "text": "Beschreibung"},
                        {"icon": "🚀", "title": "Punkt 3", "text": "Beschreibung"}
                    ]
                },
                {
                    "type": "quote",
                    "quote": "Ein inspirierendes Zitat hier einfügen.",
                    "author": "Name",
                    "role": "Rolle"
                },
                {
                    "type": "cta",
                    "title": "Bereit für den nächsten Schritt?",
                    "text": "Lass uns sprechen.",
                    "button": "Jetzt buchen",
                    "url": "https://myimpactflow.ch/eTermin"
                }
            ]
        }

        example_path = os.path.join(SCRIPT_DIR, "beispiel-config.json")
        with open(example_path, "w", encoding="utf-8") as f:
            json.dump(example, f, indent=2, ensure_ascii=False)

        print(f"\n  ✅ Beispiel-Konfiguration erstellt: {example_path}")
        print(f"  Präsentation generieren: python3 erstelle-praesentation.py beispiel-config.json\n")
        return

    config_path = sys.argv[1]

    if not os.path.exists(config_path):
        print(f"\n  ❌ Datei nicht gefunden: {config_path}\n")
        sys.exit(1)

    output_path = None
    serve_after = False

    for arg in sys.argv[2:]:
        if arg.startswith("--output") or arg.startswith("-o"):
            output_path = sys.argv[sys.argv.index(arg) + 1]
        elif arg == "--serve":
            serve_after = True

    output = generate(config_path, output_path)

    if serve_after:
        os.system(f'python3 "{os.path.join(SCRIPT_DIR, "serve.py")}" --open')


if __name__ == "__main__":
    main()
