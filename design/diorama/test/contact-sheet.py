# Contact sheet (python3 design/diorama/test/contact-sheet.py design/diorama out.jpg), from shots that
# collide.js saved into design/diorama/test/sheet/ (5th argument). Contact sheet: every state's 1440x900 shot as a labelled thumbnail, in the order of states.json, grouped by screen.
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
states = json.load(open(os.path.join(here, 'states.json')))
names = {'#still': 'Menu', '#still,view=puzzles': 'Menu · Puzzles hovered', '#still,view=rules': 'Menu · How to play hovered', '#still,view=ranks,pin': 'Rankings',
  '#still,view=units,pin,tier=4,unit=0': 'Units · sheet with skin', '#still,hover=keepYou': 'Menu · your keep pointed at', '#still,music': 'Playlist', '#still,music,plh=2': 'Playlist · song pointed at',
  '#still,play': 'Play', '#still,play,multi': 'Play · Multiplayer', '#still,rooms=standard': 'Rooms · Standard', '#still,rooms=ranked,filter': 'Rooms · Ranked, filter open',
  '#still,rooms=standard,create': 'New room', '#still,rooms=ranked,create,private': 'New room · Ranked, private', '#still,play,bf=snow': 'Play · Snow battlefield',
  '#still,welcome': 'Welcome', '#still,welcome,invited': 'Welcome · from an invite', '#still,signup,tag=Wren': 'Sign up', '#still,signup,tag=W,err': 'Sign up · bad username', '#still,login': 'Log in',
  '#still,profile': 'Profile', '#still,profile,acct=dev': 'Profile · developer', '#still,profile,acct=guest,out': 'Profile · guest, log out tapped', '#still,profile,acct=none': 'Profile · no account',
  '#still,profile,sure': 'Profile · delete tapped', '#still,profile,units,acct=dev,tier=2,unit=0': 'Profile · Units, Brute skins', '#still,profile,units,acct=guest,tier=4,unit=0': 'Profile · Units, golem locked',
  '#still,history,rounds=0': 'Match history', '#still,history,all': 'Match history · All online',
  '#still,friends': 'Friends · with an invite', '#still,friends,noinvite,frinvite=0': 'Friends · Invite to', '#still,friends,frmore=3': 'Friends · ⋯ open', '#still,friends=requests': 'Friends · Requests',
  '#still,friends=chat': 'Friends · a thread', '#still,friends,acct=guest': 'Friends · guest', '#still,settings,acct=dev': 'Settings · developer'}
cols, tw, th, lab = 6, 400, 250, 34
rows = (len(states) + cols - 1) // cols
img = Image.new('RGB', (cols * tw + (cols + 1) * 12, rows * (th + lab) + (rows + 1) * 12 + 40), '#17140F')
d = ImageDraw.Draw(img)
try: font = ImageFont.truetype(os.path.join(sys.argv[1], 'fonts', 'ChakraPetch-Bold.ttf'), 20); big = ImageFont.truetype(os.path.join(sys.argv[1], 'fonts', 'ChakraPetch-Bold.ttf'), 26)
except Exception: font = big = ImageFont.load_default()
d.text((12, 12), 'DIORAMA · EVERY SCREEN · 1440×900', fill='#F2B23A', font=big)
for i, st in enumerate(states):
  f = os.path.join(here, 'sheet', re.sub(r'^_+', '', re.sub(r'[^a-z0-9=]+', '_', st, flags=re.I)) + '.png')
  x, y = 12 + (i % cols) * (tw + 12), 52 + (i // cols) * (th + lab + 12)
  if os.path.exists(f): img.paste(Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
  d.text((x, y + th + 6), names.get(st, st), fill='#F4ECD8', font=font)
img.save(sys.argv[2], quality=86); print('wrote', sys.argv[2], img.size)
