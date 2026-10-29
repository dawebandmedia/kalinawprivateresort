import numpy as np, os
from PIL import Image
OUT=os.path.join(os.path.dirname(__file__),'..','assets','img')
im=Image.open(f'{OUT}/logo-full.png'); a=np.asarray(im)
al=a[:,:,3]; rows=np.where(al.max(1)>30)[0]
# find gaps
gaps=[(rows[i],rows[i+1]) for i in range(len(rows)-1) if rows[i+1]-rows[i]>8]
print('gaps',gaps, im.size)
cut=gaps[-1][0]+ (gaps[-1][1]-gaps[-1][0])//2 if gaps else int(im.height*0.72)
mark=im.crop((0,0,im.width,cut)); mark=mark.crop(mark.getbbox())
word=im.crop((0,cut,im.width,im.height)); word=word.crop(word.getbbox())
def light(img):
    b=np.asarray(img).copy().astype(np.int16)
    rgb=b[:,:,:3]; lum=rgb.mean(2); sat=rgb.max(2)-rgb.min(2)
    dark=(lum<120)&(sat<40)
    b[dark,0]=244;b[dark,1]=245;b[dark,2]=241
    return Image.fromarray(b.astype(np.uint8),'RGBA')
for name,img in (('mark',mark),('wordmark',word)):
    img.save(f'{OUT}/logo-{name}.png',optimize=True)
    light(img).save(f'{OUT}/logo-{name}-light.png',optimize=True)
    print(name,img.size)
light(im).save(f'{OUT}/logo-full-light.png',optimize=True)
