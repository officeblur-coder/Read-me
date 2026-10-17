import pathlib
d = pathlib.Path(__file__).parent
fonts = (d / 'assets' / 'fonts-embed.css').read_text()
(d / 'film.html').write_text((d / 'film.src.html').read_text().replace('/*FONTS*/', fonts))
