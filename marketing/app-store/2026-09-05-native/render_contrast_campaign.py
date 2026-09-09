from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

import render_campaign as base


ROOT = Path(__file__).resolve().parent
FINAL = ROOT / "final-contrast"
PREVIEW = ROOT / "preview" / "folio-app-store-contrast-contact-sheet.png"
BACKGROUND = ROOT / "backgrounds" / "folio-midnight-editorial-v1.png"

DEEP_INK = "#241C27"
IVORY = "#F7F2EA"
PALE_SAGE = "#C8D2BF"
PEACH = "#FFB185"
PLUM = "#8A6793"


def background(index: int) -> Image.Image:
    source = Image.open(BACKGROUND).convert("RGB")
    if index % 2 == 0:
        source = ImageOps.mirror(source)
    plate = ImageOps.fit(source, (base.W, base.H), method=Image.Resampling.LANCZOS).convert("RGBA")
    draw = ImageDraw.Draw(plate, "RGBA")
    accents = [PEACH, PALE_SAGE, PEACH, PLUM, PALE_SAGE, PEACH, PLUM]
    accent = accents[index - 1]
    draw.rounded_rectangle((28, 192, 40, 858), radius=6, fill=accent)
    draw.ellipse((1010, 2380, 1435, 2805), fill=accent + "20")
    return plate


def tinted_lockup() -> Image.Image:
    source = Image.open(base.LOCKUP).convert("RGBA")
    source = base.fit_contain(source, (190, 64))
    tint = Image.new("RGBA", source.size, IVORY)
    tint.putalpha(source.getchannel("A"))
    return tint


def add_brand_header(canvas: Image.Image, index: int) -> None:
    draw = ImageDraw.Draw(canvas)
    canvas.alpha_composite(tinted_lockup(), (88, 66))
    count = f"{index:02d} / 07"
    right = base.W - 88 - int(draw.textlength(count, font=base.FOLIO_SMALL))
    draw.text((right, 78), count, font=base.FOLIO_SMALL, fill=PEACH)


def add_copy(canvas: Image.Image, headline: str, subhead: str) -> None:
    draw = ImageDraw.Draw(canvas)
    x, y = 88, 188
    draw.multiline_text((x, y), headline, font=base.HEADLINE, fill=IVORY, spacing=0)
    bbox = draw.multiline_textbbox((x, y), headline, font=base.HEADLINE, spacing=0)
    draw.text((x + 2, bbox[3] + 22), subhead, font=base.SUBHEAD, fill=PALE_SAGE)


def save(canvas: Image.Image, index: int, slug: str) -> Path:
    FINAL.mkdir(parents=True, exist_ok=True)
    path = FINAL / f"{index:02d}-{slug}-contrast-1290x2796.png"
    canvas.convert("RGB").save(path, "PNG", optimize=True)
    return path


def render() -> list[Path]:
    outputs: list[Path] = []

    canvas = background(1)
    add_brand_header(canvas, 1)
    add_copy(canvas, "Recipes become\ncookbooks", "Turn the recipes you keep into books you love.")
    base.paste_screen(canvas, "IMG_5753.PNG", (186, 665), 918, radius=50, rotation=-0.7)
    outputs.append(save(canvas, 1, "recipes-become-cookbooks"))

    canvas = background(2)
    add_brand_header(canvas, 2)
    add_copy(canvas, "From link to\nfinished page", "Save the source. Folio shapes the page.")
    base.paste_screen(canvas, "IMG_5755.PNG", (112, 660), 1066, crop=(0, 170, 1290, 1410), radius=46, rotation=-0.6)
    base.add_connector(canvas, (645, 1708))
    base.paste_screen(canvas, "IMG_5748.PNG", (170, 1760), 950, crop=(0, 620, 1290, 1950), radius=46, rotation=0.7)
    outputs.append(save(canvas, 2, "from-link-to-finished-page"))

    canvas = background(3)
    add_brand_header(canvas, 3)
    add_copy(canvas, "Every page feels\nmade for you", "A real recipe, finished with editorial care.")
    base.paste_screen(canvas, "IMG_5748.PNG", (169, 645), 952, crop=(0, 0, 1290, 2660), radius=48, rotation=-0.4)
    outputs.append(save(canvas, 3, "every-page-feels-made-for-you"))

    canvas = background(4)
    add_brand_header(canvas, 4)
    add_copy(canvas, "Ask Folio as\nyou cook", "Recipe-aware help is always one tap away.")
    base.paste_screen(canvas, "IMG_5748.PNG", (105, 720), 1080, crop=(0, 120, 1290, 2240), radius=48, rotation=0.35)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((202, 2550, 1088, 2660), radius=55, fill=PEACH)
    note = "One tap from the recipe in front of you"
    tw = draw.textlength(note, font=base.LABEL)
    draw.text(((base.W - tw) / 2, 2591), note, font=base.LABEL, fill=DEEP_INK)
    outputs.append(save(canvas, 4, "ask-folio-as-you-cook"))

    canvas = background(5)
    add_brand_header(canvas, 5)
    add_copy(canvas, "A style for\nevery book", "Choose the cover, page, color, and character.")
    base.paste_screen(canvas, "IMG_5750.PNG", (72, 700), 760, crop=(0, 300, 1290, 2620), radius=44, rotation=-1.1)
    base.paste_screen(canvas, "IMG_5751.PNG", (522, 1095), 710, crop=(0, 370, 1290, 2625), radius=44, rotation=1.2)
    outputs.append(save(canvas, 5, "a-style-for-every-book"))

    canvas = background(6)
    add_brand_header(canvas, 6)
    add_copy(canvas, "Set the scene\nyour way", "Give every cookbook its own place and mood.")
    base.paste_screen(canvas, "IMG_5752.PNG", (178, 655), 934, crop=(0, 150, 1290, 2730), radius=48, rotation=-0.35)
    outputs.append(save(canvas, 6, "set-the-scene-your-way"))

    canvas = background(7)
    add_brand_header(canvas, 7)
    add_copy(canvas, "Your recipes.\nYour cookbooks.", "A collection built around the way you cook.")
    base.paste_screen(canvas, "IMG_5754.PNG", (172, 675), 946, crop=(0, 135, 1290, 2670), radius=48, rotation=0.45)
    outputs.append(save(canvas, 7, "your-recipes-your-cookbooks"))

    make_contact_sheet(outputs)
    return outputs


def make_contact_sheet(paths: list[Path]) -> None:
    thumb_w = 250
    thumb_h = round(thumb_w * base.H / base.W)
    gap = 28
    sheet = Image.new("RGB", (gap + 4 * (thumb_w + gap), 78 + 2 * (thumb_h + 70)), DEEP_INK)
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.truetype(str(base.DISPLAY_BOLD), 38)
    draw.text((gap, 18), "Folio — midnight editorial", font=title_font, fill=IVORY)
    for i, path in enumerate(paths):
        x = gap + (i % 4) * (thumb_w + gap)
        y = 78 + (i // 4) * (thumb_h + 70)
        thumb = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb_h + 12), f"{i + 1:02d}", font=base.FOLIO_SMALL, fill=PEACH)
    sheet.save(PREVIEW, "PNG", optimize=True)


if __name__ == "__main__":
    for result in render():
        print(result)
