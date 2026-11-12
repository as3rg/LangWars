"""Render the HTML deck to PNG, PDF and PPTX.

Usage:
    python -m venv .venv
    .venv/Scripts/pip install playwright pillow python-pptx img2pdf pypdf
    .venv/Scripts/python export_deck.py

On Linux/macOS use .venv/bin/python and change the Edge channel if needed.
The PDF is a 16:9 raster deck (240 DPI); the PPTX uses one full-bleed image
per slide and carries the speaker notes from the HTML.
"""

from pathlib import Path

import img2pdf
from PIL import Image
from playwright.sync_api import sync_playwright
from pptx import Presentation
from pptx.util import Inches
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "export"
OUT.mkdir(exist_ok=True)

VIEWPORT = {"width": 1600, "height": 900}
SCALE = 2
PAGE_W_IN = 13.3333
PAGE_H_IN = 7.5

EXPORT_CSS = """
#progress, #hint, #controls, #notes, #overview, #help { display: none !important; }
.slide { transition: none !important; }
.slide.active .anim { animation: none !important; opacity: 1 !important; }
.slide .notes { display: none !important; }
* { caret-color: transparent !important; }
"""


def main() -> None:
    images: list[Path] = []
    notes: list[str] = []
    titles: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=SCALE,
            reduced_motion="reduce",
        )
        page = context.new_page()
        page.goto((ROOT / "index.html").as_uri(), wait_until="load")
        page.add_style_tag(content=EXPORT_CSS)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(500)

        count = page.locator(".slide").count()
        for i in range(1, count + 1):
            page.evaluate(f"location.hash = '{i}'")
            page.wait_for_timeout(350)
            path = OUT / f"slide-{i:02d}.png"
            page.screenshot(path=str(path))
            images.append(path)
            notes.append(
                page.locator(".slide.active .notes").inner_text().strip()
                if page.locator(".slide.active .notes").count()
                else ""
            )
            titles.append(
                page.locator(".slide.active").get_attribute("data-title") or f"Slide {i}"
            )
            print(f"rendered {path.name}")

        browser.close()

    # PDF: one lossless page per screenshot. 3200x1800 / 240 DPI = 13.33x7.5 in.
    pdf_path = ROOT / "LangWars.pdf"
    layout = img2pdf.get_fixed_dpi_layout_fun((240, 240))
    raw_pdf = OUT / "LangWars.raw.pdf"
    raw_pdf.write_bytes(
        img2pdf.convert(
            [str(p) for p in images],
            layout_fun=layout,
            title="LangWars — платформа с общим пространством имён",
            author="Команда LangWars",
            subject="Презентация проекта",
            creator="HTML-презентация LangWars",
        )
    )

    reader = PdfReader(str(raw_pdf))
    writer = PdfWriter()
    for pdf_page in reader.pages:
        writer.add_page(pdf_page)
    for i, title in enumerate(titles, start=1):
        writer.add_outline_item(f"{i:02d}  {title}", i - 1)
    writer.add_metadata(
        {
            "/Title": "LangWars — платформа с общим пространством имён",
            "/Author": "Команда LangWars",
            "/Subject": "Презентация проекта",
        }
    )
    with pdf_path.open("wb") as handle:
        writer.write(handle)
    raw_pdf.unlink(missing_ok=True)
    print(f"wrote {pdf_path.name} ({pdf_path.stat().st_size / 1_000_000:.1f} MB)")

    # PPTX: full-bleed screenshots + speaker notes.
    prs = Presentation()
    prs.slide_width = Inches(PAGE_W_IN)
    prs.slide_height = Inches(PAGE_H_IN)
    blank = prs.slide_layouts[6]
    for image, note in zip(images, notes):
        slide = prs.slides.add_slide(blank)
        slide.shapes.add_picture(
            str(image), 0, 0, width=prs.slide_width, height=prs.slide_height
        )
        if note:
            slide.notes_slide.notes_text_frame.text = note
    prs.core_properties.title = "LangWars — платформа с общим пространством имён"
    prs.core_properties.author = "Команда LangWars"
    prs.core_properties.subject = "Презентация проекта"
    pptx_path = ROOT / "LangWars.pptx"
    prs.save(pptx_path)
    print(f"wrote {pptx_path.name} ({pptx_path.stat().st_size / 1_000_000:.1f} MB)")

    # Sanity check the raster size.
    with Image.open(images[0]) as im:
        print(f"slide size: {im.width}x{im.height}px, {len(images)} pages")


if __name__ == "__main__":
    main()
