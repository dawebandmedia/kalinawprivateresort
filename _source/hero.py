"""Hero day/night pair: align night to day, crop common area, build water mask; logo cutout."""
import cv2, numpy as np, glob, os
from PIL import Image, ImageFilter
RAW='/root/assets_raw'; OUT=os.path.join(os.path.dirname(__file__),'..','assets','img')
fs=sorted(glob.glob(RAW+'/feat/feat-*.jpg'))
A=cv2.imread(fs[0]); B=cv2.imread(fs[33])
W=np.array([[9.0580243e-01,-1.7737016e-01,1.4437596e+02],[4.4886377e-03,8.6615288e-01,6.7875450e+01],[-1.0321036e-05,-1.1025316e-04,1.0]],np.float32)
N=cv2.warpPerspective(B,W,(A.shape[1],A.shape[0]),flags=cv2.INTER_CUBIC+cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
x0,x1,y0,y1=84,1988,0,1238
A=A[y0:y1,x0:x1]; N=N[y0:y1,x0:x1]
# water mask from day image: blue/cyan hue, in lower part
hsv=cv2.cvtColor(A,cv2.COLOR_BGR2HSV)
h,s,v=cv2.split(hsv)
m=((h>85)&(h<125)&(s>45)&(v>90)).astype(np.uint8)*255
m[:int(A.shape[0]*0.55)]=0
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
# keep largest component
n,lab,st,_=cv2.connectedComponentsWithStats(m)
if n>1:
    k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=np.where(lab==k,255,0).astype(np.uint8)
# fill holes
inv=255-m; ff=inv.copy(); hh,ww=m.shape; msk=np.zeros((hh+2,ww+2),np.uint8); cv2.floodFill(ff,msk,(0,0),0); m=m|ff
m=cv2.GaussianBlur(m,(0,0),6)
for name,img in (('hero-day',A),('hero-night',N)):
    for w in (1280,1904):
        r=cv2.resize(img,(w,round(img.shape[0]*w/img.shape[1])),interpolation=cv2.INTER_AREA)
        rgb=Image.fromarray(cv2.cvtColor(r,cv2.COLOR_BGR2RGB))
        rgb.save(f'{OUT}/{name}-{w}.webp','WEBP',quality=82,method=5)
        rgb.save(f'{OUT}/{name}-{w}.jpg','JPEG',quality=82,optimize=True,progressive=True)
mm=cv2.resize(m,(952,619),interpolation=cv2.INTER_AREA)
Image.fromarray(mm).save(f'{OUT}/hero-water-mask.png',optimize=True)
cv2.imwrite('/tmp/claude-0/-home-claude/d35ca0c8-a543-57a2-ad9d-f60e1ce2d76d/scratchpad/mask_check.jpg',cv2.resize(np.hstack([A,cv2.cvtColor(m,cv2.COLOR_GRAY2BGR)]),(1600,520)))
# logo: cut out the off-white background
L=Image.open(RAW+'/logo.jpg').convert('RGB'); a=np.asarray(L).astype(np.int16)
bg=np.array([247,247,242]); d=np.abs(a-bg).sum(2)
alpha=np.clip((d-14)*9,0,255).astype(np.uint8)
rgba=np.dstack([np.asarray(L),alpha]); im=Image.fromarray(rgba,'RGBA')
bbox=im.getbbox(); im=im.crop(bbox)
im.save(f'{OUT}/logo-full.png',optimize=True)
im.resize((im.width//2,im.height//2),Image.LANCZOS).save(f'{OUT}/logo-full-480.png',optimize=True)
# mark only (above wordmark): find gap
arr=np.asarray(im)[:,:,3]; rows=arr.max(1)
print('logo size',im.size)
# icons
sq=Image.new('RGBA',(1000,1000),(247,247,242,255)); sq.paste(Image.open(RAW+'/logo.jpg'),(0,0))
for s,n in ((512,'icon-512.png'),(192,'icon-192.png'),(180,'apple-touch-icon.png'),(48,'favicon-48.png'),(32,'favicon-32.png')):
    Image.open(RAW+'/logo.jpg').convert('RGB').resize((s,s),Image.LANCZOS).save(os.path.join(OUT,'..','..',n) if n.startswith(('apple','favicon','icon')) else n)
print('rows nonempty', np.where(rows>20)[0][[0,-1]])
