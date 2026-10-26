"""Rasterize the geometric TJ monogram using only Python's standard library."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / 'public'
T = [(14,16),(50,16),(50,24),(35,24),(35,48),(27,48),(27,24),(14,24)]
def curve(a,b,c,d):
    return [tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0,1)) for t in [i/32 for i in range(33)]]
J = [(42,30),(50,30),(50,42)] + curve((50,42),(50,51),(45,56),(36,56)) + [(36,48)] + curve((36,48),(40,48),(42,46),(42,42))
def inside(x,y,polygon):
    result=False
    for a,b in zip(polygon,polygon[1:]+polygon[:1]):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            result=not result
    return result

def png(size):
    rows=bytearray()
    for row in range(size):
        rows.append(0)
        for col in range(size):
            samples=[]
            for dy in (.25,.75):
                for dx in (.25,.75):
                    x,y=(col+dx)*64/size,(row+dy)*64/size
                    samples.append(255 if inside(x,y,T) or inside(x,y,J) else 17)
            value=round(sum(samples)/4)
            rows.extend((value,value,value))
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(rows),9))+chunk(b'IEND',b'')
(ROOT/'apple-touch-icon.png').write_bytes(png(180))
(ROOT/'favicon-32.png').write_bytes(png(32))
icon=png(32)
(ROOT/'favicon.ico').write_bytes(struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',32,32,0,0,1,32,len(icon),22)+icon)
print('Generated Apple touch icon, PNG favicon, and ICO favicon.')
