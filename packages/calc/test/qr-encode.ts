// Synthetic QR Model 2 pictures for decoder tests. No external image fixtures.
import { deflateSync } from 'node:zlib';

export type Level = 0|1|2|3;
export type Mode = 'numeric'|'alphanumeric'|'byte'|'kanji';
const ECC = [
  [0,7,10,15,20,26,18,20,24,30,18],
  [0,10,16,26,18,24,16,18,22,22,26],
  [0,13,22,18,26,18,24,18,22,20,24],
  [0,17,28,22,16,22,28,26,26,24,28],
];
const BLOCKS = [
  [0,1,1,1,1,1,1,2,2,2,2],
  [0,1,1,1,2,2,4,4,4,5,5],
  [0,1,1,2,2,4,4,6,6,8,8],
  [0,1,1,2,4,4,4,5,6,8,8],
];
const ALPHA='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
for(let i=0,x=1;i<255;i++){EXP[i]=x;LOG[x]=i;x=(x<<1)^(x&128?0x11d:0);}
for(let i=255;i<512;i++)EXP[i]=EXP[i-255];
const mul=(a:number,b:number)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
function rawModules(v:number):number{
  let n=(16*v+128)*v+64;
  if(v>=2){const a=Math.floor(v/7)+2;n-=(25*a-10)*a-55;}
  if(v>=7)n-=36;
  return n;
}
function rs(data:Uint8Array,ecc:number):Uint8Array{
  let poly=[1];
  for(let i=0;i<ecc;i++){
    const next=new Array(poly.length+1).fill(0);
    for(let j=0;j<poly.length;j++){next[j]^=poly[j];next[j+1]^=mul(poly[j],EXP[i]);}
    poly=next;
  }
  const rem=new Uint8Array(data.length+ecc);rem.set(data);
  for(let i=0;i<data.length;i++){
    const f=rem[i];for(let j=0;j<poly.length;j++)rem[i+j]^=mul(poly[j],f);
  }
  return rem.subarray(data.length);
}
function maskBit(mask:number,x:number,y:number):boolean{
  switch(mask){case 0:return(x+y)%2===0;case 1:return y%2===0;case 2:return x%3===0;case 3:return(x+y)%3===0;
    case 4:return(Math.floor(y/2)+Math.floor(x/3))%2===0;case 5:return(x*y)%2+(x*y)%3===0;
    case 6:return((x*y)%2+(x*y)%3)%2===0;default:return((x+y)%2+(x*y)%3)%2===0;}
}
function format(level:Level,mask:number):number{
  const data=([1,0,3,2][level]<<3)|mask;let rem=data;
  for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);
  return((data<<10)|rem)^0x5412;
}
function versionBits(version:number):number{
  let rem=version;for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1f25);
  return(version<<12)|rem;
}
export function encodeQr(input:string,version:number,level:Level,mask:number,mode:Mode='byte',eci=false,cells?:[number,number][],rawBytes?:Uint8Array):Uint8Array{
  const size=version*4+17,grid=new Uint8Array(size*size),reserved=new Uint8Array(size*size);
  const set=(x:number,y:number,value:number)=>{if(x>=0&&y>=0&&x<size&&y<size){grid[y*size+x]=value;reserved[y*size+x]=1;}};
  const finder=(cx:number,cy:number)=>{
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
      const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d===3||d<=1?1:0);
    }
  };
  finder(3,3);finder(size-4,3);finder(3,size-4);
  for(let i=8;i<size-8;i++){set(i,6,i%2?0:1);set(6,i,i%2?0:1);}
  if(version>=2){
    const count=Math.floor(version/7)+2,step=version===32?26:Math.ceil((size-13)/(count-1)/2)*2;
    const positions=[6];for(let i=count-2;i>=0;i--)positions.push(size-7-i*step);
    for(const y of positions)for(const x of positions){
      if((x===6&&y===6)||(x===6&&y===size-7)||(x===size-7&&y===6))continue;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(x+dx,y+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1?1:0);
    }
  }
  for(let i=0;i<=5;i++)set(8,i,0);
  set(8,7,0);set(8,8,0);set(7,8,0);
  for(let i=9;i<15;i++)set(14-i,8,0);
  for(let i=0;i<8;i++)set(size-1-i,8,0);
  for(let i=8;i<15;i++)set(8,size-15+i,0);
  set(8,size-8,1);
  if(version>=7)for(let i=0;i<18;i++){set(size-11+i%3,Math.floor(i/3),0);set(Math.floor(i/3),size-11+i%3,0);}
  const ecc=ECC[level][version],nb=BLOCKS[level][version],total=Math.floor(rawModules(version)/8);
  const capacity=total-nb*ecc,bits:number[]=[];
  const push=(n:number,width:number)=>{for(let i=width-1;i>=0;i--)bits.push((n>>>i)&1);};
  if(eci){push(7,4);push(26,8);}
  push(mode==='numeric'?1:mode==='alphanumeric'?2:mode==='kanji'?8:4,4);
  const payload=rawBytes??new TextEncoder().encode(input);
  const count=mode==='byte'?payload.length:input.length;
  push(count,mode==='numeric'?(version<10?10:12):mode==='alphanumeric'?(version<10?9:11):mode==='kanji'?(version<10?8:10):(version<10?8:16));
  if(mode==='numeric'){
    for(let i=0;i<input.length;i+=3){const part=input.slice(i,i+3);push(Number(part),part.length===3?10:part.length===2?7:4);}
  }else if(mode==='alphanumeric'){
    for(let i=0;i<input.length;i+=2){const a=ALPHA.indexOf(input[i]),b=ALPHA.indexOf(input[i+1]);
      if(a<0||(i+1<input.length&&b<0))throw new Error('invalid alphanumeric');
      push(i+1<input.length?a*45+b:a,i+1<input.length?11:6);
    }
  }else if(mode==='kanji'){
    for(const char of input){
      if(char!=='漢')throw new Error('test encoder only maps one kanji character');
      const shifted=0x8abf-0x8140;push((shifted>>>8)*0xc0+(shifted&255),13);
    }
  }else for(const byte of payload)push(byte,8);
  if(bits.length>capacity*8)throw new Error('QR payload too long');
  for(let i=0;i<4&&bits.length<capacity*8;i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const data=new Uint8Array(capacity);
  for(let i=0;i<bits.length;i++)data[i>>>3]|=bits[i]<<(7-(i&7));
  for(let i=Math.ceil(bits.length/8);i<data.length;i++)data[i]=i%2?0x11:0xec;
  const shortLen=Math.floor(total/nb),shortCount=nb-total%nb,blocks:Uint8Array[]=[];
  let start=0;
  for(let i=0;i<nb;i++){
    const len=shortLen-ecc+(i>=shortCount?1:0),part=data.subarray(start,start+len);
    const block=new Uint8Array(len+ecc);block.set(part);block.set(rs(part,ecc),len);blocks.push(block);start+=len;
  }
  const codewords:number[]=[];
  for(let col=0;col<shortLen-ecc+1;col++)for(const block of blocks)if(col<block.length-ecc)codewords.push(block[col]);
  for(let col=0;col<ecc;col++)for(const block of blocks)codewords.push(block[block.length-ecc+col]);
  let bit=0;
  for(let right=size-1;right>=1;right-=2){
    if(right===6)right=5;
    for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){
      const x=right-j,y=((right+1)&2)===0?size-1-vert:vert;
      if(!reserved[y*size+x]){cells?.push([x,y]);grid[y*size+x]=(bit<codewords.length*8?((codewords[bit>>>3]>>>(7-(bit&7)))&1):0)^(maskBit(mask,x,y)?1:0);bit++;}
    }
  }
  const f=format(level,mask);
  for(let i=0;i<=5;i++)set(8,i,(f>>>i)&1);
  set(8,7,(f>>>6)&1);set(8,8,(f>>>7)&1);set(7,8,(f>>>8)&1);
  for(let i=9;i<15;i++)set(14-i,8,(f>>>i)&1);
  for(let i=0;i<8;i++)set(size-1-i,8,(f>>>i)&1);
  for(let i=8;i<15;i++)set(8,size-15+i,(f>>>i)&1);
  if(version>=7){const b=versionBits(version);for(let i=0;i<18;i++){set(size-11+i%3,Math.floor(i/3),(b>>>i)&1);set(Math.floor(i/3),size-11+i%3,(b>>>i)&1);}}
  return grid;
}
const CRC=(()=>{const a=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;a[i]=c>>>0;}return a;})();
function crc(parts:Uint8Array[]):number{let c=0xffffffff;for(const p of parts)for(const b of p)c=CRC[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function picture(grid:Uint8Array,size:number,scale=4,quiet=4,grey=255):{width:number;height:number;rgba:Uint8Array}{
  const width=(size+quiet*2)*scale,height=width,rgba=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const gx=Math.floor(x/scale)-quiet,gy=Math.floor(y/scale)-quiet;
    const dark=gx>=0&&gy>=0&&gx<size&&gy<size&&grid[gy*size+gx];
    const v=dark?0:grey,o=(y*width+x)*4;rgba[o]=rgba[o+1]=rgba[o+2]=v;rgba[o+3]=255;
  }
  return{width,height,rgba};
}
export function png(pic:{width:number;height:number;rgba:Uint8Array}):Uint8Array{
  const {width:w,height:h,rgba}=pic,raw=Buffer.alloc(h*(w*3+1));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)raw.set(rgba.subarray((y*w+x)*4,(y*w+x)*4+3),y*(w*3+1)+1+x*3);
  const chunk=(kind:string,body:Uint8Array)=>{const head=Buffer.alloc(8),tail=Buffer.alloc(4);head.writeUInt32BE(body.length,0);head.write(kind,4,'ascii');tail.writeUInt32BE(crc([head.subarray(4),body]),0);return Buffer.concat([head,body,tail]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

const ZZ=[0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63];
/** Minimal baseline JPEG writer: a shared quantiser and canonical DC/AC tables. */
export function jpeg(pic:{width:number;height:number;rgba:Uint8Array},sampling:'444'|'422'|'420'='444',restart=0):Uint8Array{
  const {width:w,height:h,rgba}=pic,parts:number[]=[255,216];
  const segment=(marker:number,body:number[])=>parts.push(255,marker,(body.length+2)>>>8,(body.length+2)&255,...body);
  segment(0xdb,[0,...Array(64).fill(8)]);
  const ySampling=sampling==='420'?0x22:sampling==='422'?0x21:0x11;
  const components=[[1,ySampling,0],[2,0x11,0],[3,0x11,0]];
  segment(0xc0,[8,h>>>8,h&255,w>>>8,w&255,3,...components.flat()]);
  const dcCounts=Array(16).fill(0);dcCounts[3]=12;
  const acSymbols=[0,0xf0];for(let run=0;run<16;run++)for(let size=1;size<=10;size++)acSymbols.push((run<<4)|size);
  const acCounts=Array(16).fill(0);acCounts[7]=acSymbols.length;
  segment(0xc4,[0,...dcCounts,...Array.from({length:12},(_,i)=>i),0x10,...acCounts,...acSymbols]);
  if(restart)segment(0xdd,[restart>>>8,restart&255]);
  segment(0xda,[3,1,0,2,0,3,0,0,63,0]);
  let acc=0,nBits=0;
  const put=(value:number,length:number)=>{for(let i=length-1;i>=0;i--){acc=(acc<<1)|((value>>>i)&1);if(++nBits===8){parts.push(acc);if(acc===255)parts.push(0);acc=0;nBits=0;}}};
  const dcCode=new Map<number,[number,number]>(),acCode=new Map<number,[number,number]>();
  for(let i=0;i<12;i++)dcCode.set(i,[i,4]);
  for(let i=0;i<acSymbols.length;i++)acCode.set(acSymbols[i],[i,8]);
  const category=(n:number)=>n===0?0:Math.floor(Math.log2(Math.abs(n)))+1;
  const signed=(n:number,size:number)=>n>=0?n:(1<<size)-1+n;
  const cos=Array.from({length:8},(_,k)=>Array.from({length:8},(_,x)=>(k?1:Math.SQRT1_2)*Math.cos((2*x+1)*k*Math.PI/16)));
  const dc=[0,0,0];
  const encode=(component:number,bx:number,by:number)=>{
    const values=new Float64Array(64);
    if(component===0){
      for(let y=0;y<8;y++)for(let x=0;x<8;x++){
        const px=Math.min(w-1,bx*8+x),py=Math.min(h-1,by*8+y);
        values[y*8+x]=rgba[(py*w+px)*4]-128;
      }
    }
    const coeff=new Int16Array(64);
    for(let u=0;u<8;u++)for(let v=0;v<8;v++){
      let sum=0;for(let y=0;y<8;y++)for(let x=0;x<8;x++)sum+=values[y*8+x]*cos[u][y]*cos[v][x];
      coeff[u*8+v]=Math.round(sum/32);
    }
    const delta=coeff[0]-dc[component];dc[component]=coeff[0];
    const dsize=category(delta),dh=dcCode.get(dsize);if(!dh)throw new Error('DC category');
    put(dh[0],dh[1]);if(dsize)put(signed(delta,dsize),dsize);
    let run=0;
    for(let k=1;k<64;k++){
      const n=coeff[ZZ[k]];
      if(!n){run++;continue;}
      while(run>=16){const h=acCode.get(0xf0)!;put(h[0],h[1]);run-=16;}
      const size=category(n),h=acCode.get((run<<4)|size);
      if(!h)throw new Error('AC category');
      put(h[0],h[1]);put(signed(n,size),size);run=0;
    }
    if(run){const h=acCode.get(0)!;put(h[0],h[1]);}
  };
  const hm=sampling==='444'?1:2,vm=sampling==='420'?2:1;
  let mcu=0;
  for(let my=0;my<Math.ceil(h/(8*vm));my++)for(let mx=0;mx<Math.ceil(w/(8*hm));mx++){
    if(restart&&mcu&&mcu%restart===0){
      if(nBits)put((1<<(8-nBits))-1,8-nBits);
      parts.push(255,0xd0+((mcu/restart-1)&7));dc.fill(0);
    }
    for(let y=0;y<vm;y++)for(let x=0;x<hm;x++)encode(0,mx*hm+x,my*vm+y);
    encode(1,mx,my);encode(2,mx,my);mcu++;
  }
  if(nBits)put((1<<(8-nBits))-1,8-nBits);
  parts.push(255,217);
  return Uint8Array.from(parts);
}
