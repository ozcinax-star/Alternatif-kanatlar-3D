import json,sys
from PIL import Image, ImageDraw
P=json.load(open(sys.argv[1]))
def faces(p):
    # p: 8 corners in order x(0/1) y(0/1) z(0/1) => index = x*4+y*2+z
    idx=[(0,1,3,2),(4,5,7,6),(0,1,5,4),(2,3,7,6),(0,2,6,4),(1,3,7,5)]
    return [[p[i] for i in f] for f in idx]
def render(cubes, view, scale, size, extra=None):
    img=Image.new('RGB',size,(238,238,242)); d=ImageDraw.Draw(img)
    W,H=size
    def proj(q):
        x,y,z=q
        if view=='back':   # kameradan +z tarafından bakış: sağ=-x (sağ kanat solda görünür)
            return (W/2-(x)*scale, H-24-y*scale), z
        if view=='side':   # +x tarafından bakış
            return (W/2-(z-4)*scale, H-24-y*scale), x
        if view=='top':
            return (W/2-(x)*scale, H/2+(z-4)*scale), y
    if extra: extra(d,proj,scale)
    polys=[]
    for c in cubes:
        for f in faces(c['p']):
            pts=[proj(q) for q in f]; depth=sum(t for _,t in pts)/4
            polys.append((depth,[a for a,_ in pts],c))
    polys.sort(key=lambda t:t[0] if view!='back' else t[0])
    for depth,pts,c in polys:
        col={'pri':(40,44,70),'sec':(52,56,86),'ter':(62,66,98),'cov':(78,82,118),'arm':(30,30,44),'alula':(70,74,110)}.get(c['k'],(60,60,60))
        d.polygon(pts,fill=col,outline=(150,155,190))
    return img
def player(d,proj,s):
    # bedeni çiz (x,y,z kutuları)
    def box(x0,x1,y0,y1,z0,z1,col):
        pts=[(x,y,z) for x in (x0,x1) for y in (y0,y1) for z in (z0,z1)]
        for f in faces(pts):
            d.polygon([proj(q)[0] for q in f],fill=col,outline=(120,120,120))
    box(-4,4,12,24,-2,2,(110,170,210)); box(-4,4,24,32,-4,4,(230,190,150)); box(-4,0,0,12,-2,2,(70,70,130)); box(0,4,0,12,-2,2,(70,70,130))
    box(-8,-4,12,24,-2,2,(110,170,210)); box(4,8,12,24,-2,2,(110,170,210))
    # göz çizgisi
    a=proj((-40,28,0))[0]; b=proj((40,28,0))[0]; d.line([a,b],fill=(255,0,0),width=1)
name=sys.argv[2]; out=sys.argv[3]
for v in ('back','side','top'):
    render(P[name],v,5.2,(520,520),player).save(f"{out}_{name}_{v}.png")
