from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import zipfile
ROOT=Path('/Users/jackserver/Locker-App')
out=ROOT/'app-store'/'appstore-upload'
out.mkdir(parents=True, exist_ok=True)
W,H=1290,2796
BG=(246,248,252); DARK=(8,10,14); BLUE=(0,113,227); INK=(20,24,30); MUTED=(93,105,125)
def font(size):
    for f in ['/System/Library/Fonts/SFNS.ttf','/System/Library/Fonts/Supplemental/Arial.ttf']:
        if Path(f).exists(): return ImageFont.truetype(f,size)
    return ImageFont.load_default()
F={s:font(s) for s in [26,30,34,38,44,58,64,72,82]}
def rounded(draw, box, r, fill, outline=None, width=1): draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)
def wrap(draw, text, maxw, f):
    words=text.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if draw.textbbox((0,0),t,font=f)[2] <= maxw: cur=t
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    return lines
def header(draw, title, accent, sub):
    y=155
    draw.text((92,y),title,font=F[82],fill=INK)
    draw.text((92,y+100),accent,font=F[82],fill=BLUE)
    yy=y+230
    for line in wrap(draw,sub,470,F[34]):
        draw.text((96,yy),line,font=F[34],fill=MUTED); yy+=48
def draw_phone(draw, x,y,w,h, screen_func):
    rounded(draw,(x,y,x+w,y+h),70,(12,14,18))
    rounded(draw,(x+18,y+18,x+w-18,y+h-18),54,(0,0,0))
    rounded(draw,(x+w//2-130,y+36,x+w//2+130,y+88),28,(6,7,10))
    sx,sy,sw,sh=x+40,y+125,w-80,h-180
    rounded(draw,(sx,sy,sx+sw,sy+sh),36,DARK)
    screen_func(draw,sx,sy,sw,sh)
def screen_home(draw,x,y,w,h):
    draw.text((x+34,y+36),'Locker',font=F[34],fill=(255,255,255))
    rounded(draw,(x+34,y+112,x+w-34,y+360),42,(17,20,27),outline=(44,52,65),width=2)
    draw.text((x+64,y+148),'SCHOOL STUDY ARCHIVE',font=F[26],fill=BLUE)
    draw.text((x+64,y+196),'Old tests.\nNew edge.',font=F[64],fill=(255,255,255),spacing=0)
    for i,t in enumerate(['1,284\nPAGES','OCR\nSEARCH','24/7\nREPORTS']):
        bx=x+64+i*155; by=y+405
        rounded(draw,(bx,by,bx+130,by+110),24,(17,20,27),outline=(44,52,65))
        draw.multiline_text((bx+22,by+22),t,font=F[26],fill=(230,235,245),spacing=4)
    rounded(draw,(x+34,y+560,x+w-34,y+815),42,(245,245,247))
    draw.text((x+64,y+600),'ARCHIVE GROWING',font=F[26],fill=(70,75,85))
    draw.text((x+64,y+655),'1,284',font=F[72],fill=(0,0,0))
    draw.text((x+64,y+740),'Every scan adds searchable pages.',font=F[30],fill=(90,92,96))
def screen_search(draw,x,y,w,h):
    draw.text((x+34,y+34),'Halifax West',font=F[30],fill=BLUE)
    draw.text((x+34,y+88),'Find what the\nclass learned.',font=F[58],fill=(255,255,255),spacing=-4)
    rounded(draw,(x+34,y+250,x+w-34,y+318),30,(20,22,28),outline=(50,58,70))
    draw.text((x+72,y+268),'Try “bonding quiz”',font=F[30],fill=(150,160,175))
    cards=[('Quiz + Answers · 7p','Chemistry 12 Bonding Quiz','Ms. Clarke · Bonding · 2022','58'),('Assignment + Answers · 3p','Biology 11 Cell Unit Assignment','Mr. Bennett · Cells · 2021','41')]
    yy=y+365
    for meta,title,tags,vote in cards:
        rounded(draw,(x+34,yy,x+w-34,yy+255),34,(17,18,22),outline=(45,50,60))
        draw.text((x+64,yy+28),meta,font=F[26],fill=(130,190,255))
        draw.text((x+64,yy+78),title,font=F[34],fill=(255,255,255))
        draw.text((x+64,yy+135),tags,font=F[26],fill=(145,155,170))
        rounded(draw,(x+w-130,yy+178,x+w-64,yy+225),22,(30,34,40))
        draw.text((x+w-105,yy+188),vote,font=F[26],fill=(220,225,235))
        yy+=285
def screen_scan(draw,x,y,w,h):
    draw.text((x+34,y+34),'Add material',font=F[38],fill=(255,255,255))
    rounded(draw,(x+34,y+105,x+w-34,y+430),42,(18,22,28),outline=(50,60,75))
    draw.text((x+78,y+160),'Scan or choose\nphotos',font=F[44],fill=(255,255,255),spacing=2)
    draw.text((x+78,y+285),'Camera, photo library, or packet.',font=F[30],fill=(155,165,180))
    rounded(draw,(x+78,y+340,x+w-78,y+406),32,(255,255,255))
    draw.text((x+185,y+357),'Choose pages',font=F[30],fill=(0,0,0))
    rounded(draw,(x+34,y+485,x+w-34,y+705),34,(245,245,247))
    draw.text((x+70,y+530),'OCR ready',font=F[44],fill=(0,0,0))
    draw.text((x+70,y+590),'Text is extracted before review.',font=F[30],fill=(90,92,96))
def screen_policy(draw,x,y,w,h):
    draw.text((x+34,y+34),'Moderation',font=F[38],fill=(255,255,255))
    items=[('Report content','Flag current tests, keys, or personal info.'),('Block source','Hide a source from your school feed.'),('Reviewed archive','Approved material stays searchable.')]
    yy=y+125
    for title,body in items:
        rounded(draw,(x+34,yy,x+w-34,yy+180),32,(18,22,28),outline=(50,60,75))
        draw.text((x+70,yy+40),title,font=F[38],fill=(255,255,255))
        draw.text((x+70,yy+98),body,font=F[26],fill=(155,165,180))
        yy+=215
    rounded(draw,(x+34,yy+20,x+w-34,yy+145),32,(255,255,255))
    draw.text((x+72,yy+58),'Current tests are blocked.',font=F[34],fill=(0,0,0))
def make(idx,title,accent,sub,screen):
    img=Image.new('RGB',(W,H),BG); draw=ImageDraw.Draw(img)
    rounded(draw,(820,-210,1500,420),320,(229,240,255))
    rounded(draw,(-240,2260,380,2910),300,(235,242,252))
    header(draw,title,accent,sub)
    draw_phone(draw,550,350,660,1960,screen)
    rounded(draw,(92,2480,310,2545),32,(232,240,252))
    draw.text((118,2496),'Locker',font=F[34],fill=INK)
    img.save(out/f'{idx:02d}.png',quality=95)
make(1,'Your school','test bank','Search old assignments, quizzes, worksheets, and past exams from your own school.',screen_home)
make(2,'Find real','past material','Filter by class, teacher, unit, year, or words OCR found on the page.',screen_search)
make(3,'Scan pages','in seconds','Add a single photo or full packet. Locker turns scans into searchable text.',screen_scan)
make(4,'OCR makes','it searchable','Text extraction helps every school build a searchable archive, page by page.',screen_search)
make(5,'Report and','block safely','Built-in reporting, source blocking, and moderation keep current tests out.',screen_policy)
meta='''# Locker App Store Upload Packet

Bundle ID: com.jswenterprises.locker
Version: 1.0
Category: Education
Age rating recommendation: 12+
Support URL: https://jack108510.github.io/locker-app/
Privacy URL: https://jack108510.github.io/locker-app/privacy
Terms URL: https://jack108510.github.io/locker-app/terms

Subtitle: Your school test bank

Promotional text:
Find old assignments, quizzes, exams, and answer-filled copies from your school. Scan past material, search by class or teacher, and prep with real examples.

Description:
Locker helps students prepare for tests using real past school material from their own school.

Scan old assignments, quizzes, exams, worksheets, or answer-filled copies. Locker extracts text from the page, adds class and teacher labels, and makes approved material searchable for students in the same school feed.

What Locker does:
- Search your school’s old assignments, quizzes, exams, and answers
- Scan pages with the camera or choose a photo
- Extract searchable text with OCR
- Filter by material type, class, and teacher
- Report content that should not be public
- Block a source you do not want to see

Locker is for test prep with past material. Current tests, teacher-only keys, personal student information, grades, rosters, and abusive content are not allowed and may be removed.

Keywords:
school,test prep,past exams,old quizzes,assignments,answers,study,OCR,scanner,education

Review notes:
Locker is a user-generated-content education app. Users choose an alias and school, then see only approved material for that school. The app includes in-app reporting, source blocking, moderation records, privacy and terms pages, and camera/photo permission strings. Current tests, teacher-only keys, student personal information, and abuse are prohibited.
'''
(out/'metadata.md').write_text(meta)
zip_path=ROOT/'app-store'/'locker-appstore-upload-package.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.iterdir()): z.write(p,p.relative_to(ROOT/'app-store'))
print(zip_path)
for p in sorted(out.iterdir()): print(p)
