import os, sys
from PIL import Image, ImageEnhance
D, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
K = 1586 / 1058
# id: (page, x0, y0, x1, y1, bottom inset)
B = {
 'spinat': (3, 70, 135, 302, 463, 0), 'omelett': (3, 555, 135, 787, 463, 0), 'english': (3, 70, 482, 302, 818, 0), 'hummus': (3, 555, 482, 787, 818, 0),
 'kalte-platte': (3, 70, 837, 302, 1174, 0), 'camembert': (3, 555, 837, 787, 1174, 0),
 'gulasch-suppe': (5, 70, 135, 505, 740, 0), 'leberknoedel': (5, 555, 135, 988, 740, 0),
 'provence': (7, 70, 137, 505, 558, 0), 'chicken-grill': (7, 555, 137, 988, 488, 34), 'wiener': (7, 70, 774, 505, 1125, 0), 'cordon': (7, 555, 682, 988, 1105, 0),
 'schnitzel-kitz': (8, 70, 135, 505, 558, 0), 'stinco': (8, 555, 135, 988, 488, 0), 'pulled-potato': (8, 70, 793, 505, 1144, 0), 'pulled-burger': (8, 555, 722, 988, 1144, 0),
 'forelle': (9, 70, 135, 505, 458, 0), 'lachs': (9, 555, 135, 988, 488, 0), 'rindsgulasch': (9, 70, 652, 505, 1075, 0), 'eleven': (9, 555, 683, 988, 1075, 0),
 'spaetzle': (11, 70, 137, 505, 558, 0), 'bolognese': (11, 555, 137, 988, 890, 0), 'carbonara': (11, 70, 774, 505, 1125, 0),
 'camembert-veg': (13, 70, 135, 505, 558, 0), 'pilzragout': (13, 555, 135, 988, 890, 0), 'veggie-burger': (13, 70, 813, 505, 1165, 0),
 'kids-chicken': (15, 70, 135, 505, 558, 0), 'dinos': (15, 555, 135, 988, 558, 0), 'kids-carbonara': (15, 70, 773, 505, 1125, 0),
 'greek': (17, 70, 137, 505, 558, 0), 'tuna': (17, 555, 137, 988, 558, 0), 'potato-salad': (17, 70, 793, 505, 1145, 0),
 'bratkartoffeln': (19, 70, 136, 505, 387, 0), 'pueree': (19, 555, 136, 988, 780, 0), 'gemuese': (19, 70, 582, 505, 833, 0),
 'kaiserschmarrn': (21, 70, 135, 505, 518, 0), 'brownie': (21, 70, 753, 505, 1135, 0), 'tiramisu': (21, 555, 135, 988, 448, 34),
 'creme-caramel': (21, 555, 463, 763, 684, 34), 'palatschinken': (21, 780, 463, 988, 684, 34), 'topfenknoedel': (21, 555, 701, 763, 921, 34), 'apfelstrudel': (21, 780, 701, 988, 921, 34),
}
CH = {'ch01': 2, 'ch02': 4, 'ch03': 6, 'ch04': 10, 'ch05': 12, 'ch06': 14, 'ch07': 16, 'ch08': 18, 'ch09': 20, 'ch10': 22}
pages = {}
def page(n):
    if n not in pages: pages[n] = Image.open(f'{D}/pg-{n-1:03d}.jpg').convert('RGB')
    return pages[n]
for k, (pg, x0, y0, x1, y1, bi) in B.items():
    small = (x1 - x0) < 260
    top = 34 if small else 50
    side = 10
    box = (round((x0 + side) * K), round((y0 + top) * K), round((x1 - side) * K), round((y1 - 10 - bi) * K))
    im = page(pg).crop(box)
    im.save(f'{OUT}/{k}.webp', 'WEBP', quality=84, method=6)
    print(k, im.size)
for k, pg in CH.items():
    im = page(pg).crop((round(300 * K), round(180 * K), round(1001 * K), round(1176 * K)))
    im.save(f'{OUT}/{k}.webp', 'WEBP', quality=82, method=6)
    im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS).save(f'{OUT}/{k}-640.webp', 'WEBP', quality=80, method=6)
    print(k, im.size)
