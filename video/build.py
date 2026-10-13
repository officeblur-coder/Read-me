import base64,pathlib
d=pathlib.Path(__file__).parent
b=base64.b64encode((d/'wrap.jpg').read_bytes()).decode()
(d/'film.html').write_text((d/'film.src.html').read_text().replace('__IMG__','data:image/jpeg;base64,'+b))
