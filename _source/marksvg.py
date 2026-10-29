import cv2, numpy as np, os
from PIL import Image
OUT=os.path.join(os.path.dirname(__file__),'..','assets','img')
a=np.asarray(Image.open(f'{OUT}/logo-mark.png').convert('RGBA')).astype(np.int16)
rgb=a[:,:,:3]; al=a[:,:,3]; lum=rgb.mean(2); sat=rgb.max(2)-rgb.min(2)
dark=((lum<110)&(sat<45)&(al>128)).astype(np.uint8)*255
dark=cv2.morphologyEx(dark,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
cs,_=cv2.findContours(dark,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE)
paths=[]
for c in cs:
    if cv2.contourArea(c)<60: continue
    c=cv2.approxPolyDP(c,0.8,True).reshape(-1,2)
    d='M'+' L'.join(f'{x},{y}' for x,y in c)+'Z'
    paths.append(d)
print(len(paths), sum(len(p) for p in paths))
h,w=dark.shape
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'+''.join(f'<path d="{p}"/>' for p in paths)+'</svg>'
open(os.path.join(os.path.dirname(__file__),'mark-outline.svg'),'w').write(svg)
cv2.imwrite('/tmp/claude-0/-home-claude/d35ca0c8-a543-57a2-ad9d-f60e1ce2d76d/scratchpad/dark.png',dark)
