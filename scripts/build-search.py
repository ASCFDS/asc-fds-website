"""Generate the public search index from rendered page content, without dependencies."""
from html.parser import HTMLParser
from pathlib import Path
import json
class Page(HTMLParser):
 def __init__(self):
  super().__init__(); self.main=False; self.skip=0; self.heading=False; self.title=[]; self.text=[]
 def handle_starttag(self,tag,attrs):
  if tag=='main': self.main=True
  if tag in ('script','style'): self.skip+=1
  if tag=='h1': self.heading=True
 def handle_endtag(self,tag):
  if tag=='main': self.main=False
  if tag in ('script','style'): self.skip=max(0,self.skip-1)
  if tag=='h1': self.heading=False
 def handle_data(self,data):
  if self.main and not self.skip:
   self.text.append(data)
   if self.heading: self.title.append(data)
rows=[]
for name in ['index.html','ueber-uns.html','mitglied-werden.html','events_sportbetrieb.html','kontakt.html','spende/index.html','impressum.html','datenschutz.html']:
 p=Page(); p.feed(Path(name).read_text()); rows.append({'url':'/'+name,'title':' '.join(' '.join(p.title).split()),'text':' '.join(' '.join(p.text).split())})
Path('assets/data/search-index.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Search index: {len(rows)} pages')
