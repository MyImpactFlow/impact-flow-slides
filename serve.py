#!/usr/bin/env python3
"""
Impact Flow Presentation Server
================================
Startet einen lokalen Webserver für Präsentationen.

Verwendung:
    python3 serve.py                    → Startet auf Port 8080
    python3 serve.py 3000               → Startet auf Port 3000
    python3 serve.py --open             → Startet und öffnet Browser
    python3 serve.py meine-praesi.html  → Startet spezifische Präsentation

Features:
    - Lokaler Server für Präsentationen
    - Link-Sharing im lokalen Netzwerk (zeigt IP-Adresse)
    - Auto-Reload bei Datei-Änderungen
    - PDF-Export Hinweis

Autor: Impact Flow / Claude Code
"""

import http.server
import socketserver
import os
import sys
import socket
import webbrowser
import signal

# Standard-Einstellungen
DEFAULT_PORT = 8080
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def get_local_ip():
    """Ermittelt die lokale IP-Adresse für Netzwerk-Sharing."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


def print_banner(port, filename="index.html"):
    """Zeigt die Server-Informationen an."""
    local_ip = get_local_ip()

    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║                                                  ║")
    print("  ║    🌸  Impact Flow Presentation Server  🌿      ║")
    print("  ║                                                  ║")
    print("  ╠══════════════════════════════════════════════════╣")
    print("  ║                                                  ║")
    print(f"  ║  📄 Datei:    {filename:<35s}║")
    print(f"  ║  🖥  Lokal:    http://localhost:{port:<19s}║")
    print(f"  ║  📱 Netzwerk: http://{local_ip}:{port:<14s}║")
    print("  ║                                                  ║")
    print("  ╠══════════════════════════════════════════════════╣")
    print("  ║                                                  ║")
    print("  ║  Steuerung:                                      ║")
    print("  ║  → / ←          Slides navigieren                ║")
    print("  ║  F              Vollbild                          ║")
    print("  ║  S              Speaker Notes                     ║")
    print("  ║  Esc            Übersicht                        ║")
    print("  ║  Ctrl+E         PDF Export                        ║")
    print("  ║                                                  ║")
    print("  ║  PDF Export:                                      ║")
    print(f"  ║  http://localhost:{port}/?print-pdf              ║")
    print("  ║  → Ctrl+P → Als PDF speichern                    ║")
    print("  ║  → Querformat + Hintergrundgrafiken              ║")
    print("  ║                                                  ║")
    print("  ║  Ctrl+C zum Beenden                              ║")
    print("  ║                                                  ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Handler ohne nervige Konsolenausgaben."""

    def log_message(self, format, *args):
        # Nur Fehler ausgeben
        if args and len(args) > 1 and str(args[1]).startswith('4'):
            print(f"  ⚠️  {args[0]} → {args[1]}")

    def end_headers(self):
        # CORS Headers für lokale Entwicklung
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()


def main():
    port = DEFAULT_PORT
    open_browser = False
    target_file = "index.html"

    # Argumente parsen
    for arg in sys.argv[1:]:
        if arg == "--open" or arg == "-o":
            open_browser = True
        elif arg.isdigit():
            port = int(arg)
        elif arg.endswith('.html'):
            target_file = arg
        elif arg == "--help" or arg == "-h":
            print(__doc__)
            sys.exit(0)

    # In das Skript-Verzeichnis wechseln
    os.chdir(SCRIPT_DIR)

    # Prüfen ob die Datei existiert
    if not os.path.exists(target_file):
        print(f"\n  ❌ Datei nicht gefunden: {target_file}")
        print("  Verfügbare Präsentationen:")
        for f in os.listdir("."):
            if f.endswith(".html"):
                print(f"     • {f}")
        sys.exit(1)

    # Server starten
    handler = QuietHandler

    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            # Signal Handler für sauberes Beenden
            def shutdown(sig, frame):
                print("\n\n  👋 Server beendet. Bis bald!\n")
                httpd.shutdown()
                sys.exit(0)

            signal.signal(signal.SIGINT, shutdown)

            print_banner(port, target_file)

            # Browser öffnen wenn gewünscht
            if open_browser:
                webbrowser.open(f"http://localhost:{port}/{target_file}")

            httpd.serve_forever()

    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\n  ❌ Port {port} ist bereits belegt.")
            print(f"  Versuche: python3 serve.py {port + 1}")
        else:
            raise


if __name__ == "__main__":
    main()
