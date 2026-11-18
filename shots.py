"""Take the 4 Costa Verde screenshots with headless Chromium (Playwright).

Loads each ?shot= scene from the local server, waits for window.__shotReady,
captures console errors and failed requests, and saves a JPEG <= 256 KiB at
1280x800. Usage: python shots.py <base-url> <shots-json> <out-dir>
"""
import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
SHOTS_JSON = Path(sys.argv[2])
OUT = Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)

shots = json.loads(SHOTS_JSON.read_text())

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    for shot in shots:
        errors = []
        failed = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("requestfailed", lambda r: failed.append(r.url))
        page.on("response", lambda r: failed.append(r.url) if r.status >= 400 else None)
        url = BASE + shot["query"]
        page.goto(url, wait_until="load")
        try:
            page.wait_for_function("window.__shotReady === true", timeout=30000)
            ready = True
        except Exception as e:
            ready = False
            print(f"{shot['name']}: __shotReady TIMEOUT ({e})")
        raw = OUT / (shot["name"] + ".png")
        page.screenshot(path=str(raw))
        # Compress to JPEG <= 256 KiB with PIL.
        from PIL import Image

        img = Image.open(raw).convert("RGB")
        out_path = OUT / shot["name"]
        q = 88
        while True:
            img.save(out_path, "JPEG", quality=q, optimize=True)
            if out_path.stat().st_size <= 250 * 1024 or q <= 40:
                break
            q -= 8
        raw.unlink()
        print(
            f"{shot['name']}: ready={ready} console_errors={len(errors)} failed_requests={len(failed)} "
            f"size={out_path.stat().st_size} bytes quality={q}"
        )
        for e in errors[:5]:
            print("  console error:", e[:300])
        for f in failed[:5]:
            print("  failed request:", f[:200])
    browser.close()
print("done")
