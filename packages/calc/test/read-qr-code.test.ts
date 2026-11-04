import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NameTable, evaluateText, type CalcContext, type Value } from '../src/index.ts';
import { decodeImage, decodePng, decodeGif, decodeJpeg } from '../src/image-decode.ts';
import { imageInfo } from '../src/image-info.ts';
import { ResourceLimitError } from '../src/work-budget.ts';
import { Env } from '../src/evaluate.ts';
import { encodeQr, picture, png, pngWithIhdrs, jpeg, type Level, type Mode } from './qr-encode.ts';

function read(bytes:Uint8Array):string {
  const field:Value={type:'container',value:'scan.png',data:bytes};
  const ctx:CalcContext={names:new NameTable({fields:['Scan']}),field:()=>field};
  return evaluateText('ReadQRCode ( Scan )',ctx);
}
function generated(text:string,version:number,level:Level,mask:number,mode:Mode='byte',eci=false):Uint8Array {
  return png(picture(encodeQr(text,version,level,mask,mode,eci),version*4+17));
}
test('ReadQRCode reads synthetic PNGs across versions, levels, masks and modes',()=>{
  const cases:[string,number,Mode,boolean][]=[['1234567890123',1,'numeric',false],['HELLO QR 123',2,'alphanumeric',false],['QR version seven',7,'byte',false],['Unicode: 東京 café',10,'byte',true]];
  for(const [value,version,mode,eci] of cases) for(const level of [0,1,2,3] as Level[]) for(let mask=0;mask<8;mask++) {
    assert.equal(read(generated(value,version,level,mask,mode,eci)),value,`version ${version}, level ${level}, mask ${mask}`);
  }
});
test('ReadQRCode answers empty for absent and non-image data',()=>{
  assert.equal(read(new Uint8Array()),'');
  assert.equal(read(new TextEncoder().encode('not an image')),'');
  const ctx:CalcContext={names:new NameTable({fields:[]})};
  assert.equal(evaluateText('ReadQRCode ( "text" )',ctx),'');
  const white=picture(new Uint8Array(21*21),21);
  assert.equal(read(png(white)),'');
});
test('full-resolution PNG decode retains QR module edges',()=>{
  const bytes=generated('CLEAR',1,0,0);
  const pic=decodeImage(bytes,true);
  assert.ok(pic);
  assert.equal(pic.width,116);
  assert.equal(read(bytes),'CLEAR');
});

test('ReadQRCode reads a full-resolution baseline JPEG in 4:4:4, 4:2:2 and 4:2:0',()=>{
  const matrix=encodeQr('JPEG QR 42',2,0,3,'alphanumeric');
  const pic=picture(matrix,25,8);
  for(const sampling of ['444','422','420'] as const){
    assert.equal(read(jpeg(pic,sampling)),'JPEG QR 42',sampling);
    assert.equal(read(jpeg(pic,sampling,16)),'JPEG QR 42',`${sampling} with restart markers`);
  }
});

test('rotations, mirror, grey background and noise preserve a readable code',()=>{
  const grid=encodeQr('ROTATED 123',2,1,5,'alphanumeric');
  const base=picture(grid,25,4,4,220);
  for(let i=0;i<base.rgba.length;i+=4){
    const variation=((i*1103515245+12345)>>>16)%23-11;
    for(let c=0;c<3;c++)base.rgba[i+c]=Math.max(0,Math.min(255,base.rgba[i+c]+variation));
  }
  for(const orientation of [1,2,3,6,8]){
    assert.equal(read(png(rotatePicture(base,orientation))),'ROTATED 123',`orientation ${orientation}`);
  }
});
function rotatePicture(_pic:ReturnType<typeof picture>,orientation:number){
  const {width:w,height:h,rgba}= _pic,swap=orientation===6||orientation===8;
  const out=new Uint8Array(rgba.length),nw=swap?h:w,nh=swap?w:h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const nx=orientation===2?w-1-x:orientation===3?w-1-x:orientation===6?h-1-y:orientation===8?y:x;
    const ny=orientation===3?h-1-y:orientation===6?x:orientation===8?w-1-x:y;
    out.set(rgba.subarray((y*w+x)*4,(y*w+x)*4+4),(ny*nw+nx)*4);
  }
  return {width:nw,height:nh,rgba:out};
}

test('Reed-Solomon repairs a few damaged codewords and rejects damage beyond capacity',()=>{
  const cells:[number,number][]=[],size=25;
  const original=encodeQr('REPAIR THIS CODE',2,3,0,'alphanumeric',false,cells);
  const damaged=original.slice(),broken=original.slice();
  for(const word of [3,7,11,15]){
    const [x,y]=cells[word*8];damaged[y*size+x]^=1;
  }
  for(let word=0;word<24;word++){
    const [x,y]=cells[word*8];broken[y*size+x]^=1;
  }
  assert.equal(read(png(picture(damaged,size))),'REPAIR THIS CODE');
  assert.equal(read(png(picture(broken,size))),'');
});

test('a picture at the pixel cap is refused by the calculation work budget before decoding',()=>{
  const bytes=png(picture(new Uint8Array(21*21),21));
  const header=bytes.slice();
  const view=new DataView(header.buffer,header.byteOffset,header.byteLength);
  view.setUint32(16,7500);view.setUint32(20,8000);
  const started=performance.now();
  assert.throws(()=>read(header),/work budget/);
  assert.ok(performance.now()-started<3000,'the pixel limit must be checked before allocating the picture');
});

test('duplicate or misplaced PNG IHDR is rejected by the size gate and decoder',()=>{
  for(const bytes of [pngWithIhdrs([[1,1],[7000,8000]]),pngWithIhdrs([[1,1],[7000,8000]],true),pngWithIhdrs([[1,1]],false,true)]){
    assert.equal(imageInfo(bytes),undefined);
    assert.equal(decodePng(bytes),undefined);
    assert.equal(read(bytes),'');
  }
});

test('PNG metadata scanning obeys the work-budget callback',()=>{
  const bytes=pngWithIhdrs([[1,1]],false,false,300);
  let calls=0;
  assert.throws(()=>imageInfo(bytes,()=>{calls++;throw new ResourceLimitError('too much work');}),/Calculation resource limit: too much work/);
  assert.equal(calls,1);
});

test('a 36-megapixel PNG header exhausts the work budget before decode',()=>{
  // Its IDAT only holds one pixel, so entering the decoder would return empty instead.
  const bytes=pngWithIhdrs([[6000,6000]]);
  const original=Env.prototype.checkWorkBudget;
  const charges:number[]=[];
  Env.prototype.checkWorkBudget=function(n=1){
    charges.push(n);
    if(charges.length===2)throw new ResourceLimitError('too much work');
    return original.call(this,n);
  };
  const started=performance.now();
  try{
    assert.throws(()=>read(bytes),/Calculation resource limit: too much work/);
    assert.deepEqual(charges.length,2,'only the input-byte charge and dimension charge run');
    assert.ok(charges[1]>=5_000_000,'the dimension charge must exceed the work limit');
    assert.ok(performance.now()-started<250,'the header charge must refuse before decoding');
  }finally{Env.prototype.checkWorkBudget=original;}
  // Damaging the compressed stream makes a missing precharge cheap to test as well.
  const damaged=Buffer.from(bytes);
  damaged[damaged.indexOf('IDAT')+4]=0;
  assert.throws(()=>read(damaged),/Calculation exceeds the supported work budget/);
});

test('an unsupported image format still returns empty without a decode charge',()=>{
  const bmp=Buffer.alloc(54);
  bmp.write('BM');bmp.writeUInt32LE(40,14);bmp.writeUInt32LE(6000,18);bmp.writeUInt32LE(6000,22);bmp.writeUInt16LE(1,26);
  assert.equal(imageInfo(bmp)?.width,6000);
  assert.equal(read(bmp),'');
});

test('PNG row metering stops decoding on the first refused row',()=>{
  const bytes=png({width:64,height:80,rgba:new Uint8Array(64*80*4)});
  let rows=0,units=0;
  assert.throws(()=>decodePng(bytes,(n)=>{rows++;units+=n;if(rows===4)throw new ResourceLimitError('too much work');}),/Calculation resource limit: too much work/);
  assert.equal(rows,4);
  assert.ok(rows<80 && units>=rows);
});

test('ReadQRCode propagates a work refusal from PNG decoding',()=>{
  const bytes=png({width:64,height:80,rgba:new Uint8Array(64*80*4)});
  const original=Env.prototype.checkWorkBudget;
  let calls=0;
  Env.prototype.checkWorkBudget=function(n=1){
    calls++;
    if(calls===4)throw new ResourceLimitError('too much work');
    return original.call(this,n);
  };
  try{
    assert.throws(()=>read(bytes),/Calculation resource limit: too much work/);
    assert.equal(calls,4);
  }finally{Env.prototype.checkWorkBudget=original;}
});

test('GIF and JPEG decoding use the dimensions reported by imageInfo and meter work',()=>{
  const gif=Buffer.from('47494638396101000100800000000000ffffff2c00000000010001000002024401003b','hex');
  gif.writeUInt16LE(3,6);gif.writeUInt16LE(3,8);
  assert.deepEqual([decodeGif(gif)?.width,decodeGif(gif)?.height],[imageInfo(gif)?.width,imageInfo(gif)?.height]);
  assert.throws(()=>decodeGif(gif,()=>{throw new ResourceLimitError('too much work');}),/Calculation resource limit: too much work/);
  const bytes=jpeg(picture(encodeQr('METER',1,0,0),21));
  assert.deepEqual([decodeJpeg(bytes,true)?.width,decodeJpeg(bytes,true)?.height],[imageInfo(bytes)?.width,imageInfo(bytes)?.height]);
  assert.throws(()=>decodeJpeg(bytes,true,()=>{throw new ResourceLimitError('too much work');}),/Calculation resource limit: too much work/);
});

test('random numeric, alphanumeric and byte payloads round-trip through PNG and baseline JPEG',()=>{
  let state=0x12345678;
  const random=(alphabet:string,length:number)=>Array.from({length},()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return alphabet[(state>>>0)%alphabet.length];
  }).join('');
  const sizes={numeric:[10,20,70,110],alphanumeric:[6,12,45,75],byte:[3,7,30,50]};
  const alphabets={numeric:'0123456789',alphanumeric:'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:',byte:'abcdefghjkmnpqrstuvwxyz0123456789'};
  for(const mode of ['numeric','alphanumeric','byte'] as Exclude<Mode,'kanji'>[])
    for(const [i,version] of [1,2,7,10].entries()){
      const value=random(alphabets[mode],sizes[mode][i]);
      for(const level of [0,1,2,3] as Level[])for(let mask=0;mask<8;mask++){
        const grid=encodeQr(value,version,level,mask,mode),pic=picture(grid,version*4+17,4);
        assert.equal(read(png(pic)),value,`${mode} v${version} L${level} M${mask} PNG`);
        assert.equal(read(jpeg(pic)),value,`${mode} v${version} L${level} M${mask} JPEG`);
      }
    }
});

test('progressive JPEG answers empty (unverified reference behavior)',()=>{
  const bytes=jpeg(picture(encodeQr('BASELINE',1,0,0),21));
  const progressive=bytes.slice();
  for(let i=0;i<progressive.length-1;i++)if(progressive[i]===255&&progressive[i+1]===0xc0){progressive[i+1]=0xc2;break;}
  assert.equal(read(progressive),'');
});

test('the upper-left of two QR codes is returned first (unverified reference ordering)',()=>{
  const left=picture(encodeQr('FIRST',1,0,0),21),right=picture(encodeQr('SECOND',1,0,1),21);
  const width=left.width+right.width+24,height=Math.max(left.height,right.height);
  const rgba=new Uint8Array(width*height*4);rgba.fill(255);
  for(let y=0;y<left.height;y++)for(let x=0;x<left.width;x++){
    rgba.set(left.rgba.subarray((y*left.width+x)*4,(y*left.width+x)*4+4),(y*width+x)*4);
    rgba.set(right.rgba.subarray((y*right.width+x)*4,(y*right.width+x)*4+4),(y*width+left.width+24+x)*4);
  }
  assert.equal(read(png({width,height,rgba})),'FIRST');
});

test('alignment pattern guides sampling under projective distortion',()=>{
  const version=7,base=picture(encodeQr('PERSPECTIVE',version,2,6),version*4+17,6);
  const {width:w,height:h}=base,out=new Uint8Array(base.rgba.length);out.fill(255);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const den=1-0.0004*y;
    const sx=Math.round((0.92*x-0.04*y+12)/den);
    const sy=Math.round((0.95*y+3)/den);
    if(sx>=0&&sy>=0&&sx<w&&sy<h)out.set(base.rgba.subarray((sy*w+sx)*4,(sy*w+sx)*4+4),(y*w+x)*4);
  }
  assert.equal(read(png({width:w,height:h,rgba:out})),'PERSPECTIVE');
});

test('kanji mode and default byte fallback read their encoded text',()=>{
  assert.equal(read(png(picture(encodeQr('漢',1,1,0,'kanji'),21))),'漢');
  const invalidUtf8=Uint8Array.from([0x80,0x41]);
  const latin1=encodeQr('\u0080A',1,0,0,'byte',false,undefined,invalidUtf8);
  assert.equal(read(png(picture(latin1,21))),'\u0080A');
  const declaredUtf8=encodeQr('\u0080A',1,0,0,'byte',true,undefined,invalidUtf8);
  assert.equal(read(png(picture(declaredUtf8,21))),'');
});

test('imageInfo reads the size of a file given only its first bytes (a container head), as before', () => {
  const whole = png(picture(new Uint8Array(21 * 21), 21, 8));
  const head = whole.subarray(0, 60);
  assert.ok(head.length < whole.length);
  const info = imageInfo(head);
  assert.ok(info, 'a PNG prefix with a complete header has a size');
  assert.equal(imageInfo(whole)?.width, info.width);
  assert.equal(imageInfo(whole)?.height, info.height);
});
