// QR Model 2 image reader. Tables below are the error-correction block parameters of ISO/IEC 18004.
import type { Picture } from './image-decode.ts';

const ECC = [
  [0,7,10,15,20,26,18,20,24,30,18,20,26,30,22,24,28,30,28,28,28,30,30,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [0,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,30,28,28,28,28,28,28,28,28,28,30,30,30,30,30,30,30],
  [0,13,22,18,26,18,24,18,22,20,24,18,26,30,22,20,24,28,28,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [0,17,28,22,16,22,28,26,26,24,28,24,28,22,24,30,24,30,28,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
];
const BLOCKS = [
  [0,1,1,1,1,1,1,2,2,2,2,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
  [0,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
  [0,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
  [0,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
];
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 128 ? 0x11d : 0); }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
const div = (a: number, b: number) => a ? EXP[(LOG[a] - LOG[b] + 255) % 255] : 0;

/** Correct a QR block in place; false when errors exceed its capacity. */
export function correctBlock(a: Uint8Array, ecc: number): boolean {
  const syndrome = new Uint8Array(ecc);
  for (let j = 0; j < ecc; j++) for (const byte of a) syndrome[j] = mul(syndrome[j], EXP[j]) ^ byte;
  if (syndrome.every((v) => v === 0)) return true;
  let c = new Uint8Array(ecc + 1), b = new Uint8Array(ecc + 1);
  c[0] = b[0] = 1;
  let len = 0, shift = 1, last = 1;
  for (let n = 0; n < ecc; n++) {
    let delta = syndrome[n];
    for (let i = 1; i <= len; i++) delta ^= mul(c[i], syndrome[n - i]);
    if (!delta) { shift++; continue; }
    const old = c.slice(), scale = div(delta, last);
    for (let i = 0; i + shift < c.length; i++) c[i + shift] ^= mul(scale, b[i]);
    if (2 * len <= n) { len = n + 1 - len; b = old; last = delta; shift = 1; }
    else shift++;
  }
  if (!len || len * 2 > ecc) return false;
  const positions: number[] = [];
  for (let i = 0; i < a.length; i++) {
    const x = EXP[(255 - ((a.length - 1 - i) % 255)) % 255];
    let y = 0;
    for (let k = len; k >= 0; k--) y = mul(y, x) ^ c[k];
    if (!y) positions.push(i);
  }
  if (positions.length !== len) return false;
  const matrix = Array.from({ length: len }, (_, row) => {
    const entries = positions.map((i) => EXP[(row * (a.length - 1 - i)) % 255]);
    return [...entries, syndrome[row]];
  });
  for (let col = 0; col < len; col++) {
    let pivot = col;
    while (pivot < len && !matrix[pivot][col]) pivot++;
    if (pivot === len) return false;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const inv = div(1, matrix[col][col]);
    for (let k = col; k <= len; k++) matrix[col][k] = mul(matrix[col][k], inv);
    for (let row = 0; row < len; row++) if (row !== col) {
      const factor = matrix[row][col];
      for (let k = col; k <= len; k++) matrix[row][k] ^= mul(factor, matrix[col][k]);
    }
  }
  for (let k = 0; k < len; k++) a[positions[k]] ^= matrix[k][len];
  for (let j = 0; j < ecc; j++) {
    let s = 0;
    for (const byte of a) s = mul(s, EXP[j]) ^ byte;
    if (s) return false;
  }
  return true;
}

function rawModules(v: number): number {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) { const a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; }
  if (v >= 7) n -= 36;
  return n;
}
const formatCoords = (size: number): [[number, number][], [number, number][]] => {
  const a: [number, number][] = [], b: [number, number][] = [];
  for (let i = 0; i <= 5; i++) a.push([8, i]);
  a.push([8,7],[8,8],[7,8]);
  for (let i = 9; i < 15; i++) a.push([14 - i,8]);
  for (let i = 0; i < 8; i++) b.push([size - 1 - i,8]);
  for (let i = 8; i < 15; i++) b.push([8,size - 15 + i]);
  return [a,b];
};
function hamming(a: number, b: number): number { let n = a ^ b, k = 0; while (n) { k++; n &= n - 1; } return k; }
function formatWord(level: number, mask: number): number {
  const code = (([1,0,3,2][level] << 3) | mask);
  let rem = code;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((code << 10) | rem) ^ 0x5412;
}
function versionWord(v: number): number {
  let rem = v;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (v << 12) | rem;
}
function functionMask(v: number): Uint8Array {
  const s = 4 * v + 17, m = new Uint8Array(s * s);
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0,y0); y <= Math.min(s-1,y1); y++) for (let x = Math.max(0,x0); x <= Math.min(s-1,x1); x++) m[y*s+x] = 1;
  };
  rect(0,0,8,8); rect(s-8,0,s-1,8); rect(0,s-8,8,s-1);
  rect(6,9,6,s-9); rect(9,6,s-9,6);
  if (v >= 2) {
    const count = Math.floor(v/7)+2;
    const step = v === 32 ? 26 : Math.ceil((s-13)/(count-1)/2)*2;
    const at = [6]; for (let i = count-2; i >= 0; i--) at.splice(1,0,s-7-i*step);
    for (const y of at) for (const x of at) if (!((x===6 && y===6)||(x===6 && y===s-7)||(x===s-7 && y===6))) rect(x-2,y-2,x+2,y+2);
  }
  if (v >= 7) { rect(s-11,0,s-9,5); rect(0,s-11,5,s-9); }
  return m;
}
function masked(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x+y)%2===0; case 1: return y%2===0; case 2: return x%3===0;
    case 3: return (x+y)%3===0; case 4: return (Math.floor(y/2)+Math.floor(x/3))%2===0;
    case 5: return ((x*y)%2+(x*y)%3)===0; case 6: return ((x*y)%2+(x*y)%3)%2===0;
    default: return ((x+y)%2+(x*y)%3)%2===0;
  }
}
function decodeGrid(grid: Uint8Array, v: number): string | undefined {
  const s = 4*v+17, at = (x: number,y: number) => grid[y*s+x];
  const [ca,cb] = formatCoords(s);
  const readBits = (coords: [number,number][]) => coords.reduce((n,[x,y],i) => n | (at(x,y)<<i),0);
  const fa = readBits(ca), fb = readBits(cb);
  let level=-1, mask=-1, best=4;
  for (let l=0;l<4;l++) for (let m=0;m<8;m++) {
    const f=formatWord(l,m), d=Math.min(hamming(f,fa),hamming(f,fb));
    if (d<best) {best=d;level=l;mask=m;}
  }
  if (level<0) return undefined;
  if (v>=7) {
    let va=0,vb=0;
    for (let i=0;i<18;i++) { va|=at(s-11+i%3,Math.floor(i/3))<<i; vb|=at(Math.floor(i/3),s-11+i%3)<<i; }
    if (Math.min(hamming(va,versionWord(v)),hamming(vb,versionWord(v)))>3) return undefined;
  }
  const total=Math.floor(rawModules(v)/8), bytes=new Uint8Array(total), fn=functionMask(v);
  let bit=0;
  for (let right=s-1;right>=1;right-=2) {
    if (right===6) right=5;
    for (let vert=0;vert<s;vert++) for (let j=0;j<2;j++) {
      const x=right-j,y=(((right+1)&2)===0)?s-1-vert:vert;
      if (!fn[y*s+x] && bit<total*8) {
        bytes[bit>>>3]|=(at(x,y)^(masked(mask,x,y)?1:0))<<(7-(bit&7)); bit++;
      }
    }
  }
  if (bit!==total*8) return undefined;
  const nb=BLOCKS[level][v], ec=ECC[level][v], shortLen=Math.floor(total/nb), shortCount=nb-total%nb;
  const blocks=Array.from({length:nb},(_,i)=>new Uint8Array(shortLen+(i>=shortCount?1:0)));
  let src=0;
  for (let col=0;col<shortLen-ec+1;col++) for (let i=0;i<nb;i++) if (col<blocks[i].length-ec) blocks[i][col]=bytes[src++];
  for (let col=0;col<ec;col++) for (let i=0;i<nb;i++) blocks[i][blocks[i].length-ec+col]=bytes[src++];
  if (src!==total) return undefined;
  const data: number[]=[];
  for (const block of blocks) {
    if (!correctBlock(block,ec)) return undefined;
    data.push(...block.subarray(0,block.length-ec));
  }
  return parsePayload(new Uint8Array(data),v);
}
const ALPHA='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
function parsePayload(data: Uint8Array, version: number): string | undefined {
  let at=0,eci=0,output='';
  const read=(n:number):number|undefined=>{
    if (at+n>data.length*8) return undefined;
    let value=0; for (let i=0;i<n;i++,at++) value=(value<<1)|((data[at>>>3]>>>(7-(at&7)))&1);
    return value;
  };
  while (at+4<=data.length*8) {
    const mode=read(4); if (mode===0) return output;
    if (mode===7) {
      const first=read(8); if (first===undefined) return undefined;
      eci=first<128?first:first<192?((first&63)<<8)|(read(8)??0):((first&31)<<16)|(read(16)??0);
      if (eci!==26 && eci!==3) return undefined;
      continue;
    }
    if (mode===3 || ![1,2,4,8].includes(mode!)) return undefined; // Structured append and Micro QR are unsupported.
    const tier=version<10?0:version<27?1:2;
    const width=mode===1?[10,12,14][tier]:mode===2?[9,11,13][tier]:mode===4?[8,16,16][tier]:[8,10,12][tier];
    let count=read(width); if (count===undefined) return undefined;
    if (mode===1) {
      while (count>=3) {const n=read(10);if(n===undefined||n>=1000)return undefined;output+=String(n).padStart(3,'0');count-=3;}
      if (count) {const n=read(count===2?7:4);if(n===undefined||n>=10**count)return undefined;output+=String(n).padStart(count,'0');}
    } else if (mode===2) {
      while (count>=2) {const n=read(11);if(n===undefined||n>=45*45)return undefined;output+=ALPHA[Math.floor(n/45)]+ALPHA[n%45];count-=2;}
      if (count) {const n=read(6);if(n===undefined||n>=45)return undefined;output+=ALPHA[n];}
    } else if (mode===4) {
      const bytes=new Uint8Array(count);
      for(let i=0;i<count;i++){const n=read(8);if(n===undefined)return undefined;bytes[i]=n;}
      try { output+=new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
      catch { if(eci===26)return undefined;output+=Buffer.from(bytes).toString('latin1'); }
      // With no ECI, use UTF-8 when valid and ISO-8859-1 otherwise, as common readers do.
    } else {
      const bytes=new Uint8Array(count*2);
      for(let i=0;i<count;i++) {
        const n=read(13);if(n===undefined)return undefined;
        const c=(Math.floor(n/0xc0)<<8)|(n%0xc0),sjis=c+(c<0x1f00?0x8140:0xc140);
        bytes[i*2]=sjis>>>8;bytes[i*2+1]=sjis&255;
      }
      try { output+=new TextDecoder('shift_jis',{fatal:true}).decode(bytes); }
      catch { return undefined; }
    }
  }
  return output;
}

interface Point { x:number; y:number; module:number; count:number }
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function runMatch(r:number[]):boolean {
  const total=r.reduce((a,b)=>a+b,0), unit=total/7;
  return unit>=0.7 && r.every((n,i)=>Math.abs(n-unit*(i===2?3:1)) <= unit*(i===2?1.3:0.8));
}
function finders(bin:Uint8Array,w:number,h:number,check:()=>void):Point[] {
  const points:Point[]=[];
  const color=(x:number,y:number)=>x>=0&&y>=0&&x<w&&y<h?bin[y*w+x]:0;
  for(let y=0;y<h;y++) {
    if((y&63)===0)check();
    const runs:number[]=[],starts:number[]=[],colors:number[]=[];
    for(let x=0;x<=w;x++) {
      const c=x<w?color(x,y):0;
      if(x===0||c!==colors[colors.length-1]){runs.push(1);starts.push(x);colors.push(c);}else runs[runs.length-1]++;
      if(runs.length>=5&&colors[colors.length-1]===1) {
        const r=runs.slice(-5),start=starts[starts.length-5];
        if(!runMatch(r))continue;
        const cx=start+r[0]+r[1]+r[2]/2,ix=Math.round(cx);
        if(ix<0||ix>=w)continue;
        const vr=[0,0,0,0,0];
        let up=0,down=0;
        for(let yy=y;yy>=0&&color(ix,yy)===1;yy--)up++;
        for(let yy=y+1;yy<h&&color(ix,yy)===1;yy++)down++;
        vr[2]=up+down;
        let yy=y-up;
        while(yy>=0&&color(ix,yy)===0){vr[1]++;yy--;}
        while(yy>=0&&color(ix,yy)===1){vr[0]++;yy--;}
        yy=y+down+1;
        while(yy<h&&color(ix,yy)===0){vr[3]++;yy++;}
        while(yy<h&&color(ix,yy)===1){vr[4]++;yy++;}
        if(!runMatch(vr))continue;
        const cy=y+(down-up+1)/2;
        const module=(r.reduce((a,b)=>a+b,0)+vr.reduce((a,b)=>a+b,0))/14;
        let finderScore=0;
        for(let fy=-3;fy<=3;fy++)for(let fx=-3;fx<=3;fx++){
          const dark=Math.max(Math.abs(fx),Math.abs(fy))!==2;
          const sx=Math.round(cx+fx*module),sy=Math.round(cy+fy*module);
          if(color(sx,sy)===(dark?1:0))finderScore++;
        }
        if(finderScore<40)continue;
        const existing=points.find(p=>Math.hypot(p.x-cx,p.y-cy)<Math.max(p.module,module)*2);
        if(existing){const n=existing.count++;existing.x=(existing.x*n+cx)/(n+1);existing.y=(existing.y*n+cy)/(n+1);existing.module=(existing.module*n+module)/(n+1);}
        else if(points.length<5000)points.push({x:cx,y:cy,module,count:1});
      }
    }
  }
  return points.filter(p=>p.count>=2).sort((a,b)=>b.count-a.count).slice(0,150).sort((a,b)=>a.y-b.y||a.x-b.x);
}
function homography(src:[number,number][],dst:[number,number][]):number[]|undefined {
  const m:number[][]=[];
  for(let i=0;i<4;i++) {
    const [x,y]=src[i],[u,v]=dst[i];
    m.push([x,y,1,0,0,0,-x*u,-y*u,u],[0,0,0,x,y,1,-x*v,-y*v,v]);
  }
  for(let col=0;col<8;col++) {
    let pivot=col;for(let row=col+1;row<8;row++)if(Math.abs(m[row][col])>Math.abs(m[pivot][col]))pivot=row;
    if(Math.abs(m[pivot][col])<1e-8)return undefined;
    [m[col],m[pivot]]=[m[pivot],m[col]];
    const scale=m[col][col];for(let k=col;k<=8;k++)m[col][k]/=scale;
    for(let row=0;row<8;row++)if(row!==col){const f=m[row][col];for(let k=col;k<=8;k++)m[row][k]-=f*m[col][k];}
  }
  return m.map(row=>row[8]);
}
function threshold(pic:Picture,check:()=>void):Uint8Array {
  const {width:w,height:h,rgba}=pic,gray=new Uint8Array(w*h),sum=new Float64Array((w+1)*(h+1));
  for(let y=0;y<h;y++) {
    if((y&127)===0)check();
    let row=0;
    for(let x=0;x<w;x++) {
      const i=y*w+x,o=i*4;
      const alpha=rgba[o+3]/255;
      const g=Math.round(((rgba[o]*299+rgba[o+1]*587+rgba[o+2]*114)/1000)*alpha+255*(1-alpha));
      gray[i]=g;row+=g;sum[(y+1)*(w+1)+x+1]=sum[y*(w+1)+x+1]+row;
    }
  }
  const out=new Uint8Array(w*h),r=Math.max(8,Math.min(64,Math.floor(Math.min(w,h)/20)));
  for(let y=0;y<h;y++) {
    if((y&127)===0)check();
    const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);
    for(let x=0;x<w;x++) {
      const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1);
      const mean=(sum[y1*(w+1)+x1]-sum[y0*(w+1)+x1]-sum[y1*(w+1)+x0]+sum[y0*(w+1)+x0])/((x1-x0)*(y1-y0));
      out[y*w+x]=gray[y*w+x]<mean-8?1:0;
    }
  }
  return out;
}
function sample(bin:Uint8Array,w:number,h:number,tl:Point,tr:Point,bl:Point,v:number,align=true,check?:()=>void):Uint8Array|undefined {
  const s=4*v+17,br={x:tr.x+bl.x-tl.x,y:tr.y+bl.y-tl.y};
  const src:[[number,number],[number,number],[number,number],[number,number]]=[[3.5,3.5],[s-3.5,3.5],[3.5,s-3.5],[s-3.5,s-3.5]];
  const dst:[[number,number],[number,number],[number,number],[number,number]]=[[tl.x,tl.y],[tr.x,tr.y],[bl.x,bl.y],[br.x,br.y]];
  if(v>=2&&align){
    // Use the bottom-right alignment bullseye to correct projective distortion when it can be found.
    const offset=(s-10)/(s-7);
    const expected={x:tl.x+(tr.x-tl.x+bl.x-tl.x)*offset,y:tl.y+(tr.y-tl.y+bl.y-tl.y)*offset};
    const ux={x:(tr.x-tl.x)/(s-7),y:(tr.y-tl.y)/(s-7)};
    const uy={x:(bl.x-tl.x)/(s-7),y:(bl.y-tl.y)/(s-7)};
    const radius=Math.max(3,Math.round((tl.module+tr.module+bl.module)*1.6));
    let best=-1,found:{x:number;y:number}|undefined;
    const stride=Math.max(1,Math.floor(radius/32));
    for(let yy=Math.round(expected.y)-radius;yy<=Math.round(expected.y)+radius;yy+=stride){
      if((yy&31)===0)check?.();
      for(let xx=Math.round(expected.x)-radius;xx<=Math.round(expected.x)+radius;xx+=stride){
        if(xx<0||yy<0||xx>=w||yy>=h||!bin[yy*w+xx])continue;
        let score=0;
        for(let my=-2;my<=2;my++)for(let mx=-2;mx<=2;mx++){
          const px=Math.round(xx+mx*ux.x+my*uy.x),py=Math.round(yy+mx*ux.y+my*uy.y);
          if(px<0||py<0||px>=w||py>=h)continue;
          const expectedDark=Math.max(Math.abs(mx),Math.abs(my))!==1;
          score+=bin[py*w+px]===(expectedDark?1:0)?1:0;
        }
        const weighted=score-Math.hypot(xx-expected.x,yy-expected.y)*0.1;
        if(weighted>best){best=weighted;found={x:xx,y:yy};}
      }
    }
    if(best>=22&&found){src[3]=[s-6.5,s-6.5];dst[3]=[found.x,found.y];}
  }
  const transform=homography(src,dst);if(!transform)return undefined;
  const grid=new Uint8Array(s*s);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++) {
    const xx=x+0.5,yy=y+0.5,den=transform[6]*xx+transform[7]*yy+1;
    const px=Math.round((transform[0]*xx+transform[1]*yy+transform[2])/den);
    const py=Math.round((transform[3]*xx+transform[4]*yy+transform[5])/den);
    if(px<0||py<0||px>=w||py>=h)return undefined;
    grid[y*s+x]=bin[py*w+px];
  }
  return grid;
}
function scanQr(bin:Uint8Array,w:number,h:number,check:()=>void):string|undefined {
  const points=finders(bin,w,h,check);
  for(const corner of points) {
    check();
    const nearby=points.filter(p=>p!==corner&&distance(p,corner)>corner.module*10)
      .sort((a,b)=>Math.abs(a.module-corner.module)-Math.abs(b.module-corner.module)||b.count-a.count).slice(0,48);
    for(let i=0;i<nearby.length;i++)for(let j=i+1;j<nearby.length;j++) {
      if((j&7)===0)check();
      const a=nearby[i],b=nearby[j],da=distance(corner,a),db=distance(corner,b);
      if(Math.abs(da-db)>Math.max(da,db)*0.45)continue;
      const dot=((a.x-corner.x)*(b.x-corner.x)+(a.y-corner.y)*(b.y-corner.y))/(da*db);
      if(Math.abs(dot)>0.35)continue;
      for(const [tr,bl] of [[a,b],[b,a]]) {
        const estimate=(da+db)/(2*corner.module);
        const guess=Math.round((estimate-10)/4);
        for(let v=Math.max(1,guess-2);v<=Math.min(40,guess+2);v++) {
          check();
          for(const alignment of v>=2?[true,false]:[false]) {
            const grid=sample(bin,w,h,corner,tr,bl,v,alignment,check);
            if(grid){const result=decodeGrid(grid,v);if(result!==undefined)return result;}
          }
        }
      }
    }
  }
  return undefined;
}

function turn(bin:Uint8Array,w:number,h:number,orientation:1|2|3|4):{bin:Uint8Array;w:number;h:number}{
  const swap=orientation===1||orientation===3,nw=swap?h:w,nh=swap?w:h;
  const out=new Uint8Array(bin.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const nx=orientation===1?h-1-y:orientation===2||orientation===4?w-1-x:y;
    const ny=orientation===1?x:orientation===2?h-1-y:orientation===3?w-1-x:y;
    out[ny*nw+nx]=bin[y*w+x];
  }
  return{bin:out,w:nw,h:nh};
}

/** First successfully decoded Model 2 code from the image's top left; selection among codes is unverified. */
export function readQrCode(pic:Picture,check:()=>void):string {
  const {width:w,height:h}=pic;
  if(!w||!h||w*h>60_000_000)return '';
  const bin=threshold(pic,check);
  const first=scanQr(bin,w,h,check);
  if(first!==undefined)return first;
  for(const orientation of [1,2,3,4] as const){
    check();
    const rotated=turn(bin,w,h,orientation);
    const result=scanQr(rotated.bin,rotated.w,rotated.h,check);
    if(result!==undefined)return result;
  }
  return '';
}
