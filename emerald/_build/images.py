"""Convert the original venue photos into optimized WebP pairs (1600w + 800w)."""
import os, sys
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "img")

MAP = {
    "hero-couple": "f.jpg",
    "facade-night": "597324264_1338663274972705_4409573405722895685_n.jpg",
    "facade-sign": "10.jpg",
    "facade-render": "c5ee6a20-f3e9-4e08-8b65-84cdbf32d4fb.png",
    "sapphire": "ChatGPT-Image-Jan-8-2026-09_32_03-PM.png",
    "sapphire-2": "33bc2523-1033-4189-80c5-a88c18ca99a2.png",
    "sapphire-3": "9508f7dc-a3f1-4560-91f2-85fa68f26819.png",
    "sapphire-4": "645abcdc-4df8-4c25-9154-80dab4fa3a02.png",
    "sapphire-5": "18190e69-cf77-4c0f-b7ab-9a951ed6b275.png",
    "sapphire-6": "4.jpg",
    "sapphire-7": "548661444_1263854985786868_8798689125478358078_n-1.jpg",
    "gold": "080c1475-ccde-4a7e-9e23-a5339f695951.png",
    "gold-2": "7-1.jpg", "gold-3": "8-1.jpg", "gold-4": "9-1.jpg",
    "gold-5": "10-1.jpg", "gold-6": "11-1.jpg", "gold-7": "12-1.jpg",
    "diamond": "e2994d56-53a4-45d8-9b5d-c426eb2a651a.png",
    "diamond-2": "1-1.jpg", "diamond-3": "2-1.jpg", "diamond-4": "3-1.jpg",
    "diamond-5": "4-1.jpg", "diamond-6": "5-1.jpg", "diamond-7": "6-1.jpg",
    "gourmet": "3602f2e0-2a1c-4ec3-8353-8daa7c6c6836.png",
    "gourmet-2": "1f589f01-9957-4be3-86e8-ea4112c1bfe7.png",
    "terasa": "69f530d3-8bb5-43a1-bf1b-8ebb872cc98f.png",
    "terasa-2": "509806193_1189170043255363_1457331562900839834_n.jpg",
    "terasa-3": "510481950_1189170026588698_4926693805177096529_n.jpg",
    "terasa-4": "510969753_1189170033255364_202861577901109370_n.jpg",
    "terasa-5": "511154279_1189170059922028_1773589951807110163_n-1.jpg",
    "terasa-6": "511158327_1189170039922030_4629564045329007815_n.jpg",
    "terasa-7": "511270022_1189170049922029_5170018578214039340_n.jpg",
    "terasa-8": "510483460_1189169969922037_5911196220760076997_n.jpg",
    "gradina": "2eb01b4e-e92a-4908-a51e-1f6782c25353.png",
    "gradina-2": "1-2.jpg", "gradina-3": "2-2.jpg", "gradina-4": "5-2.jpg",
    "gradina-5": "6-2.jpg", "gradina-6": "7-2.jpg", "gradina-7": "4-2.jpg",
    "gradina-8": "509429892_1189170069922027_3563054928546636062_n.jpg",
    "gradina-9": "510762793_1189170056588695_9027173177072621978_n.jpg",
    "gradina-10": "511153482_1189170063255361_3685419940966987774_n.jpg",
    "hotel": "d08871cb-f750-42fa-a5fd-cf2d6c654e8b.png",
    "hotel-2": "12.jpg", "hotel-3": "383592692.jpg", "hotel-4": "383592697.jpg",
    "hotel-5": "382791826.jpg", "hotel-6": "382789640.jpg", "hotel-7": "383592691.jpg",
    "food-1": "1-3.jpg", "food-2": "2-3.jpg", "table": "8.jpg",
    "dance-1": "1.jpg", "dance-2": "2.jpg", "dance-3": "7.jpg", "dance-4": "9.jpg",
    "cake-1": "3.jpg", "cake-2": "5.jpg", "dance-5": "6.jpg",
    "corporate": "4b1b933a-be13-4e38-a890-dc86ceb50a39.png",
    "family": "494746109_2478779282472563_6902384164366256587_n.jpg",
    "team": "Untitled-design-4.jpg",
    "g01": "592520756_1333182295520803_797317658771546_n-1.jpg",
    "g02": "593468089_1333179845521048_1581769112401158522_n-1.jpg",
    "g03": "593635215_1333180265521006_3952200367449581455_n.jpg",
    "g04": "596809663_1338661944972838_7018467952430488422_n.jpg",
    "g05": "597173957_1338661631639536_523438999725917917_n-1.jpg",
    "g06": "597626608_1338661998306166_899324331779376316_n.jpg",
    "g07": "597858236_1338661674972865_7216611824974696444_n.jpg",
    "g08": "549162827_1263856719120028_344364089696734899_n.jpg",
    "g09": "554915329_1272176641621369_6906816358406368036_n.jpg",
    "g10": "557636548_1283656843806682_559959916743986977_n.jpg",
    "g11": "557926396_1283654830473550_8782463620463167623_n.jpg",
    "g12": "558935065_1283659253806441_2651807832380758646_n.jpg",
    "g13": "559020052_1283654877140212_3059331416457279862_n.jpg",
    "g14": "560923778_1291016443070722_4094684976083321215_n.jpg",
    "g15": "561750761_1291014046404295_7689209879105729080_n.jpg",
    "g16": "564084328_1291013199737713_8012058331871063525_n.jpg",
    "g17": "564162213_1291014069737626_9128506396542381131_n.jpg",
    "g18": "564623740_1291013209737712_288843041278372725_n.jpg",
    "g19": "574564849_1309333357905697_8464688714174146541_n-1.jpg",
    "g20": "574565577_1309336874572012_7157605529241178934_n.jpg",
    "g21": "574573629_1309336837905349_7820297353627418050_n-1.jpg",
    "g22": "574581816_1309333391239027_3316372561853044296_n.jpg",
    "g23": "577049045_1309333361239030_2108330793059082579_n-1.jpg",
}

sizes = {}
for name, src in MAP.items():
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    for w, suffix in ((1600, ""), (800, "-sm")):
        c = im.copy()
        if c.width > w:
            c = c.resize((w, round(c.height * w / c.width)), Image.LANCZOS)
        c.save(os.path.join(OUT, f"{name}{suffix}.webp"), "WEBP", quality=78, method=6)
        if not suffix:
            sizes[name] = c.size
print(repr(sizes))

# Gold logo on transparent background (black keyed out by luminance)
logo = Image.open(os.path.join(SRC, "cropped-pliant-emerald-2000-x-2000-px-1.png")).convert("RGB")
r, g, b = logo.split()
alpha = logo.convert("L").point(lambda v: min(255, max(0, (v - 18) * 2)))
logo.putalpha(alpha)
logo = logo.crop(logo.getbbox())
logo.thumbnail((700, 700), Image.LANCZOS)
logo.save(os.path.join(OUT, "logo.png"), optimize=True)
logo.save(os.path.join(OUT, "logo.webp"), "WEBP", quality=90)
# Emblem only (top diamond) for favicon
emb = logo.crop((0, 0, logo.width, int(logo.height * 0.42)))
emb = emb.crop(emb.getbbox())
sq = max(emb.size)
ico = Image.new("RGBA", (sq + 40, sq + 40), (6, 40, 30, 255))
ico.paste(emb, ((sq + 40 - emb.width) // 2, (sq + 40 - emb.height) // 2), emb)
for s in (512, 192, 180, 32):
    ico.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f"icon-{s}.png"), optimize=True)
