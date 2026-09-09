from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / "sources"
BACKGROUNDS = ROOT / "backgrounds"
FINAL = ROOT / "final"
PREVIEW = ROOT / "preview"

PROJECT = ROOT.parents[2]
DISPLAY_REGULAR = PROJECT / "node_modules" / "@expo-google-fonts" / "playfair-display" / "500Medium" / "PlayfairDisplay_500Medium.ttf"
DISPLAY_BOLD = PROJECT / "node_modules" / "@expo-google-fonts" / "playfair-display" / "700Bold" / "PlayfairDisplay_700Bold.ttf"
BODY_REGULAR = PROJECT / "node_modules" / "@expo-google-fonts" / "inter" / "400Regular" / "Inter_400Regular.ttf"
BODY_MEDIUM = PROJECT / "node_modules" / "@expo-google-fonts" / "inter" / "600SemiBold" / "Inter_600SemiBold.ttf"
LOCKUP = PROJECT / "assets" / "brand" / "marks" / "lockups" / "folio-lockup-horizontal-plum.png"

W, H = 1290, 2796
IVORY = "#F7F2EA"
PLUM = "#65436F"
SAGE = "#A8B89A"
PEACH = "#FFB185"
INK = "#2B2B2B"
MUTED = "#6D6670"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


FOLIO_SMALL = font(BODY_MEDIUM, 25)
HEADLINE = font(DISPLAY_BOLD, 98)
SUBHEAD = font(BODY_REGULAR, 34)
LABEL = font(BODY_MEDIUM, 24)


def fit_contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(box, Image.Resampling.LANCZOS)
    return copy


def background(index: int) -> Image.Image:
    source = Image.open(BACKGROUNDS / "folio-editorial-paper-v1.png").convert("RGB")
    if index % 2 == 0:
        source = ImageOps.mirror(source)
    plate = ImageOps.fit(source, (W, H), method=Image.Resampling.LANCZOS)
    wash = Image.new("RGBA", (W, H), IVORY + "B8")
    plate = Image.alpha_composite(plate.convert("RGBA"), wash)

    draw = ImageDraw.Draw(plate, "RGBA")
    accents = [PLUM, SAGE, PEACH, PLUM, SAGE, PEACH, PLUM]
    accent = accents[index - 1]
    draw.rounded_rectangle((28, 192, 40, 858), radius=6, fill=accent)
    draw.ellipse((1035, 2380, 1435, 2780), fill=accent + "16")
    return plate


def add_brand_header(canvas: Image.Image, index: int) -> None:
    draw = ImageDraw.Draw(canvas)
    lockup = Image.open(LOCKUP).convert("RGBA")
    lockup = fit_contain(lockup, (190, 64))
    canvas.alpha_composite(lockup, (88, 66))
    count = f"{index:02d} / 07"
    right = W - 88 - int(draw.textlength(count, font=FOLIO_SMALL))
    draw.text((right, 78), count, font=FOLIO_SMALL, fill=PLUM)


def add_copy(canvas: Image.Image, headline: str, subhead: str) -> int:
    draw = ImageDraw.Draw(canvas)
    x, y = 88, 188
    draw.multiline_text((x, y), headline, font=HEADLINE, fill=INK, spacing=0)
    bbox = draw.multiline_textbbox((x, y), headline, font=HEADLINE, spacing=0)
    sub_y = bbox[3] + 22
    draw.text((x + 2, sub_y), subhead, font=SUBHEAD, fill=MUTED)
    return sub_y + 96


def rounded_image(source: Image.Image, radius: int) -> Image.Image:
    source = source.convert("RGBA")
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, source.width - 1, source.height - 1), radius=radius, fill=255)
    source.putalpha(mask)
    return source


def paste_screen(
    canvas: Image.Image,
    filename: str,
    xy: tuple[int, int],
    width: int,
    crop: tuple[int, int, int, int] | None = None,
    radius: int = 44,
    rotation: float = 0.0,
    shadow: int = 28,
) -> tuple[int, int, int, int]:
    source = Image.open(SOURCES / filename).convert("RGB")
    if crop:
        source = source.crop(crop)
    height = round(source.height * width / source.width)
    source = source.resize((width, height), Image.Resampling.LANCZOS)
    source = rounded_image(source, radius)

    if rotation:
        source = source.rotate(rotation, Image.Resampling.BICUBIC, expand=True)

    x, y = xy
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_blob = Image.new("RGBA", source.size, (0, 0, 0, 0))
    alpha = source.getchannel("A")
    shadow_blob.putalpha(alpha.point(lambda p: round(p * 0.34)))
    shadow_blob = shadow_blob.filter(ImageFilter.GaussianBlur(shadow))
    shadow_layer.alpha_composite(shadow_blob, (x, y + 18))
    canvas.alpha_composite(shadow_layer)

    border = Image.new("RGBA", (source.width + 6, source.height + 6), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        (0, 0, border.width - 1, border.height - 1),
        radius=radius + 3,
        outline=(101, 67, 111, 72),
        width=3,
    )
    canvas.alpha_composite(border, (x - 3, y - 3))
    canvas.alpha_composite(source, (x, y))
    return (x, y, x + source.width, y + source.height)


def add_connector(canvas: Image.Image, center: tuple[int, int]) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    cx, cy = center
    draw.ellipse((cx - 38, cy - 38, cx + 38, cy + 38), fill=PEACH, outline=PLUM, width=3)
    draw.line((cx, cy - 15, cx, cy + 14), fill=INK, width=5)
    draw.line((cx - 12, cy + 3, cx, cy + 15, cx + 12, cy + 3), fill=INK, width=5, joint="curve")


def save_slide(canvas: Image.Image, index: int, slug: str) -> Path:
    out = FINAL / f"{index:02d}-{slug}-1290x2796.png"
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    return out


def render() -> list[Path]:
    FINAL.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []

    canvas = background(1)
    add_brand_header(canvas, 1)
    add_copy(canvas, "Recipes become\ncookbooks", "Turn the recipes you keep into books you love.")
    paste_screen(canvas, "IMG_5753.PNG", (186, 665), 918, radius=50, rotation=-0.7)
    outputs.append(save_slide(canvas, 1, "recipes-become-cookbooks"))

    canvas = background(2)
    add_brand_header(canvas, 2)
    add_copy(canvas, "From link to\nfinished page", "Save the source. Folio shapes the page.")
    paste_screen(canvas, "IMG_5755.PNG", (112, 660), 1066, crop=(0, 170, 1290, 1410), radius=46, rotation=-0.6)
    add_connector(canvas, (645, 1708))
    paste_screen(canvas, "IMG_5748.PNG", (170, 1760), 950, crop=(0, 620, 1290, 1950), radius=46, rotation=0.7)
    outputs.append(save_slide(canvas, 2, "from-link-to-finished-page"))

    canvas = background(3)
    add_brand_header(canvas, 3)
    add_copy(canvas, "Every page feels\nmade for you", "A real recipe, finished with editorial care.")
    paste_screen(canvas, "IMG_5748.PNG", (169, 645), 952, crop=(0, 0, 1290, 2660), radius=48, rotation=-0.4)
    outputs.append(save_slide(canvas, 3, "every-page-feels-made-for-you"))

    canvas = background(4)
    add_brand_header(canvas, 4)
    add_copy(canvas, "Ask Folio as\nyou cook", "Recipe-aware help is always one tap away.")
    paste_screen(canvas, "IMG_5748.PNG", (105, 720), 1080, crop=(0, 120, 1290, 2240), radius=48, rotation=0.35)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((202, 2550, 1088, 2660), radius=55, fill=PLUM)
    note = "One tap from the recipe in front of you"
    tw = draw.textlength(note, font=LABEL)
    draw.text(((W - tw) / 2, 2591), note, font=LABEL, fill=IVORY)
    outputs.append(save_slide(canvas, 4, "ask-folio-as-you-cook"))

    canvas = background(5)
    add_brand_header(canvas, 5)
    add_copy(canvas, "A style for\nevery book", "Choose the cover, page, color, and character.")
    paste_screen(canvas, "IMG_5750.PNG", (72, 700), 760, crop=(0, 300, 1290, 2620), radius=44, rotation=-1.1)
    paste_screen(canvas, "IMG_5751.PNG", (522, 1095), 710, crop=(0, 370, 1290, 2625), radius=44, rotation=1.2)
    outputs.append(save_slide(canvas, 5, "a-style-for-every-book"))

    canvas = background(6)
    add_brand_header(canvas, 6)
    add_copy(canvas, "Set the scene\nyour way", "Give every cookbook its own place and mood.")
    paste_screen(canvas, "IMG_5752.PNG", (178, 655), 934, crop=(0, 150, 1290, 2730), radius=48, rotation=-0.35)
    outputs.append(save_slide(canvas, 6, "set-the-scene-your-way"))

    canvas = background(7)
    add_brand_header(canvas, 7)
    add_copy(canvas, "Your recipes.\nYour cookbooks.", "A collection built around the way you cook.")
    paste_screen(canvas, "IMG_5754.PNG", (172, 675), 946, crop=(0, 135, 1290, 2670), radius=48, rotation=0.45)
    outputs.append(save_slide(canvas, 7, "your-recipes-your-cookbooks"))

    make_contact_sheet(outputs)
    return outputs


def make_contact_sheet(paths: Iterable[Path]) -> Path:
    paths = list(paths)
    thumb_w = 250
    thumb_h = round(thumb_w * H / W)
    gap = 28
    cols = 4
    rows = 2
    sheet = Image.new("RGB", (gap + cols * (thumb_w + gap), 78 + rows * (thumb_h + 70)), IVORY)
    draw = ImageDraw.Draw(sheet)
    title_font = font(DISPLAY_BOLD, 38)
    mini_font = font(BODY_MEDIUM, 18)
    draw.text((gap, 18), "Folio App Store campaign", font=title_font, fill=INK)
    for i, path in enumerate(paths):
        x = gap + (i % cols) * (thumb_w + gap)
        y = 78 + (i // cols) * (thumb_h + 70)
        thumb = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb_h + 12), f"{i + 1:02d}", font=mini_font, fill=PLUM)
    out = PREVIEW / "folio-app-store-contact-sheet.png"
    sheet.save(out, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    for result in render():
        print(result)
