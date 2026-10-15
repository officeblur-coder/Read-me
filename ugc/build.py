# Injects timeline.json + voice.mp3 (base64) into mia.src.html -> mia.html (single self-contained file).
import base64, json
src = open('mia.src.html').read()
data = json.dumps(json.load(open('timeline.json')), separators=(',', ':'))
audio = 'data:audio/mpeg;base64,' + base64.b64encode(open('voice.mp3', 'rb').read()).decode()
open('mia.html', 'w').write(src.replace('/*DATA*/', data).replace('/*AUDIO*/', audio))
