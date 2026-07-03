#!/usr/bin/env python3
"""
Regenerate embed.html from index.html so the PartnerAwesome site (which loads
embed.html via embed.js) stays in sync with the standalone dashboard.

Called by the daily AI Model Tracker cron after index.html is updated, before
deploy_website + git push. Idempotent — safe to run any number of times.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
INDEX = ROOT / "index.html"
EMBED = ROOT / "embed.html"


def build_embed(html: str) -> str:
    # 1. Extract <style>...</style>
    m_style = re.search(r"<style[^>]*>(.*?)</style>", html, re.DOTALL)
    css = m_style.group(1) if m_style else ""

    # 2. Extract body innerHTML
    m_body = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL)
    body_inner = m_body.group(1) if m_body else ""

    # 3. Pull out the last <script> in body — that's the tab-switching JS
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", body_inner, re.DOTALL)
    tab_js = scripts[-1] if scripts else ""

    # 4. Strip all script tags from body_inner; we'll re-inject at the end
    body_no_scripts = re.sub(
        r"<script[^>]*>.*?</script>", "", body_inner, flags=re.DOTALL
    )

    # 5. Scope root-affecting CSS to the embed container so it doesn't leak
    #    into the host page (partnerawesome.com uses different fonts, colors)
    css_scoped = css
    css_scoped = re.sub(r":root\s*\{", ".pa-ai-tracker-embed {", css_scoped)
    css_scoped = re.sub(
        r"(?<![.\w-])body\s*\{", ".pa-ai-tracker-embed {", css_scoped
    )
    css_scoped = re.sub(
        r"(?<![.\w-])html\s*\{", ".pa-ai-tracker-embed {", css_scoped
    )
    css_scoped = re.sub(
        r"\bhtml\s*,\s*body\s*\{", ".pa-ai-tracker-embed {", css_scoped
    )
    css_scoped = re.sub(
        r"\bbody\s*,\s*html\s*\{", ".pa-ai-tracker-embed {", css_scoped
    )

    return (
        f'<style data-pa-ai-tracker="1">\n{css_scoped}\n</style>\n'
        f'<div class="pa-ai-tracker-embed">\n{body_no_scripts}\n</div>\n'
        f'<script data-pa-ai-tracker="1">\n{tab_js}\n</script>\n'
    )


def main() -> int:
    if not INDEX.exists():
        print(f"ERROR: {INDEX} not found", file=sys.stderr)
        return 1
    html = INDEX.read_text(encoding="utf-8")
    embed = build_embed(html)
    old = EMBED.read_text(encoding="utf-8") if EMBED.exists() else ""
    if embed == old:
        print("embed.html unchanged")
        return 0
    EMBED.write_text(embed, encoding="utf-8")
    print(f"embed.html regenerated ({len(embed):,} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
