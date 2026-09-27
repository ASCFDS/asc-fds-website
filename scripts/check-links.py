from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
r=Path(__file__).resolve().parents[1]
class Scan(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=[];self.h1=0
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id' in d:self.ids.append(d['id'])
  if t=='h1':self.h1+=1
  for k in ['href','src']:
   if k in d:self.links.append(d[k])
files=list(r.glob('*.html'))+[r/'spende/index.html'];errors=[]
for p in files:
 parser=Scan();parser.feed(p.read_text())
 if parser.h1!=1:errors.append((str(p),'h1 count',parser.h1))
 if len(parser.ids)!=len(set(parser.ids)):errors.append((str(p),'duplicate IDs'))
 for href in parser.links:
  u=urlsplit(href)
  if u.scheme or u.netloc:continue
  path=unquote(u.path)
  target=(r/path.lstrip('/')) if path.startswith('/') else p.parent/path if path else p
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append((str(p),'missing',href));continue
  if u.fragment and target.suffix=='.html':
   dest=Scan();dest.feed(target.read_text())
   if u.fragment not in dest.ids:errors.append((str(p),'missing anchor',href))
print('Checked',len(files),'HTML documents:',errors or 'all local references and IDs valid')
raise SystemExit(bool(errors))
