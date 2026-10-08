from pathlib import Path
from PIL import Image, ImageDraw

p = Path(r"deliverables\srs_16phase_render_v3")
files = sorted(p.glob("page-*.png"))
out = p / "contact_sheets"
out.mkdir(exist_ok=True)

for group_start in range(0, len(files), 4):
    cards = []
    for index, file in enumerate(files[group_start:group_start + 4]):
        image = Image.open(file).convert("RGB")
        image.thumbnail((950, 1200))
        card = Image.new("RGB", (980, 1260), "white")
        card.paste(image, ((980 - image.width) // 2, 35))
        ImageDraw.Draw(card).text((20, 10), file.stem, fill="black")
        cards.append(card)
    sheet = Image.new("RGB", (1960, 2520), "#CCCCCC")
    for index, card in enumerate(cards):
        sheet.paste(card, ((index % 2) * 980, (index // 2) * 1260))
    sheet.save(out / f"sheet-{group_start // 4 + 1:02}.jpg", quality=90)

print(f"pages={len(files)} sheets={len(list(out.glob('*.jpg')))}")
