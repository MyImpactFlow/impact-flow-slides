#!/usr/bin/env python3
"""
Impact Flow Slides — Thumbnail Generator
Erzeugt automatisch Vorschaubilder (640x360) für alle Präsentationen.

Voraussetzungen:
  pip install playwright
  playwright install chromium

Aufruf:
  python3 erstelle-thumbnails.py          # Nur fehlende Thumbnails
  python3 erstelle-thumbnails.py --all    # Alle neu generieren
"""

import json
import os
import sys
import asyncio
import subprocess
import http.server
import threading

# Pfade
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, 'data', 'praesentationen.json')
THUMB_DIR = os.path.join(SCRIPT_DIR, 'assets', 'thumbnails')
PORT = 8099  # Temporärer Server-Port


def start_server():
    """Startet einen temporären HTTP-Server im Hintergrund."""
    os.chdir(SCRIPT_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(('127.0.0.1', PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


async def generate_thumbnail(page, url, output_path):
    """Öffnet eine Präsentation und macht einen Screenshot der Titelfolie."""
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)
        # Warten bis reveal.js geladen ist
        await page.wait_for_timeout(2000)
        # Screenshot der gesamten Viewport (16:9)
        await page.screenshot(path=output_path, type='png')
        print(f'  ✅ {os.path.basename(output_path)}')
        return True
    except Exception as e:
        print(f'  ❌ Fehler: {e}')
        return False


async def main():
    force_all = '--all' in sys.argv

    # Prüfe ob Playwright installiert ist
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print('❌ Playwright nicht installiert.')
        print('   Installiere mit: pip install playwright && playwright install chromium')
        sys.exit(1)

    # JSON laden
    if not os.path.exists(JSON_PATH):
        print(f'❌ {JSON_PATH} nicht gefunden.')
        sys.exit(1)

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    praesentationen = data.get('praesentationen', [])
    if not praesentationen:
        print('Keine Präsentationen in der Registry.')
        return

    # Thumbnails-Verzeichnis erstellen
    os.makedirs(THUMB_DIR, exist_ok=True)

    # Prüfe welche Thumbnails fehlen
    to_generate = []
    for p in praesentationen:
        thumb_path = os.path.join(SCRIPT_DIR, 'assets', 'thumbnails', f'{p["id"]}.png')
        if force_all or not os.path.exists(thumb_path):
            to_generate.append(p)

    if not to_generate:
        print('✅ Alle Thumbnails sind aktuell. Nutze --all zum Erneuern.')
        return

    print(f'📸 Generiere {len(to_generate)} Thumbnail(s)...\n')

    # Server starten
    httpd = start_server()
    print(f'🌐 Server läuft auf http://127.0.0.1:{PORT}\n')

    # Browser starten
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        # Viewport 16:9 (640x360)
        context = await browser.new_context(
            viewport={'width': 640, 'height': 360},
            device_scale_factor=2  # Retina-Qualität
        )
        page = await context.new_page()

        for p in to_generate:
            url = f'http://127.0.0.1:{PORT}/{p["datei"]}'
            output = os.path.join(THUMB_DIR, f'{p["id"]}.png')
            print(f'  📷 {p["titel"]}')
            await generate_thumbnail(page, url, output)

        await browser.close()

    # Server stoppen
    httpd.shutdown()
    print(f'\n✅ Fertig! Thumbnails in: {THUMB_DIR}')


if __name__ == '__main__':
    asyncio.run(main())
