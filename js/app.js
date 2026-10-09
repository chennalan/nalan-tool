(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const sheet = $('sheetCanvas'), sctx = sheet.getContext('2d');
let photo = null, bg = '#438edb', cutoutMask = null, aiLoaded = false, sheetReady = false;
const status = msg => $('status').textContent = msg;
function getSize(){
  if ($('size').value === 'custom') {
    return [Math.max(50,Math.min(4000,Number($('customW').value)||295)),Math.max(50,Math.min(4000,Number($('customH').value)||413))];
  }
  return $('size').value.split(',').map(Number);
}
function draw(){
  if(!photo) return;
  const [w,h]=getSize(); canvas.width=w; canvas.height=h;
  ctx.clearRect(0,0,w,h); ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  const scale=Math.max(w/photo.width,h/photo.height)*Number($('zoom').value)/100;
  const dw=photo.width*scale, dh=photo.height*scale;
  const dx=(w-dw)/2 + Number($('offsetX').value)/100*w;
  const dy=(h-dh)/2 + Number($('offsetY').value)/100*h;
  const source = cutoutMask;
  if(source){
    const tmp=document.createElement('canvas'); tmp.width=w; tmp.height=h;
    const t=tmp.getContext('2d');
    t.drawImage(photo,dx,dy,dw,dh);
    t.globalCompositeOperation='destination-in';
    // segmentation mask is kept in source-image coordinates, so map it to the same crop.
    t.drawImage(source,dx,dy,dw,dh);
    t.globalCompositeOperation='source-over';
    ctx.filter=`brightness(${$('brightness').value}%) contrast(${$('contrast').value}%)`;
    ctx.drawImage(tmp,0,0); ctx.filter='none';
  } else {
    ctx.filter=`brightness(${$('brightness').value}%) contrast(${$('contrast').value}%)`;
    ctx.drawImage(photo,dx,dy,dw,dh); ctx.filter='none';
  }
  $('dimensions').textContent=`${w} × ${h} px`;
  $('zoomVal').textContent=$('zoom').value+'%';
  $('brightVal').textContent=$('brightness').value+'%';
  $('contrastVal').textContent=$('contrast').value+'%';
  const beauty = Number($('beautyStrength').value || 0);
  $('beautyVal').textContent = beauty + '%';
  if (beauty > 0) {
    // A restrained local soft-focus overlay. This is a cosmetic filter, not face-aware AI retouching.
    const overlay = document.createElement('canvas');
    overlay.width = w; overlay.height = h;
    const octx = overlay.getContext('2d');
    octx.filter = `blur(${(beauty / 40 * 1.4).toFixed(2)}px)`;
    octx.drawImage(canvas, 0, 0);
    ctx.save();
    ctx.globalAlpha = beauty / 40 * 0.22;
    ctx.drawImage(overlay, 0, 0);
    ctx.restore();
  }
  sheetReady=false; $('sheetPlaceholder').hidden=false; sheet.style.display='none';
}
function loadPhoto(file){
  if(!file || !file.type.startsWith('image/')){status('请选择有效的图片文件。');return;}
  const url=URL.createObjectURL(file), im=new Image();
  im.onload=()=>{photo=im;cutoutMask=null;draw();status(`照片已载入：${im.naturalWidth} × ${im.naturalHeight}。可以选择背景、调整构图并导出。`);URL.revokeObjectURL(url);};
  im.onabort=()=>{status('图片加载被中断，请重新选择图片。');URL.revokeObjectURL(url);};
  im.onerror=()=>{status('图片读取失败，请换一张图片重试。');URL.revokeObjectURL(url);}; im.src=url;
}
function downloadCanvas(c,name,type='image/png'){
  c.toBlob(blob=>{if(!blob){status('导出失败，请重试。');return;}const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},type,type==='image/jpeg'?0.95:undefined);
}
$('upload').addEventListener('change',e=>loadPhoto(e.target.files[0]));
['size','customW','customH','zoom','offsetX','offsetY','brightness','contrast','beautyStrength'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='size')$('customFields').hidden=$('size').value!=='custom';draw();}));
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{bg=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('customColor').value=bg;draw();}));
$('customColor').addEventListener('input',e=>{bg=e.target.value;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed','false'));draw();});
$('processBtn').addEventListener('click',()=>{draw();status('证件照已重新生成。请检查头顶、肩部和人脸位置是否符合目标机构要求。');});
$('resetBtn').addEventListener('click',()=>{$('zoom').value=100;$('offsetX').value=0;$('offsetY').value=0;$('brightness').value=100;$('contrast').value=100;$('beautyStrength').value=12;cutoutMask=null;draw();status('已重置构图与画面增强参数。');});
$('downloadPng').addEventListener('click',()=>{if(!photo)return status('请先上传照片。');draw();downloadCanvas(canvas,'证件照.png');});
$('downloadJpg').addEventListener('click',()=>{if(!photo)return status('请先上传照片。');draw();downloadCanvas(canvas,'证件照.jpg','image/jpeg');});
$('cutoutBtn').addEventListener('click',async()=>{
  if(!photo){status('请先上传照片。');return;}
  if(!window.SelfieSegmentation){
    status('正在尝试加载 AI 抠图脚本……首次使用需要联网。');
    try{
      await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';s.onload=resolve;s.onerror=()=>reject(new Error('脚本加载失败'));document.head.appendChild(s);});
    }catch(e){status('AI 模型脚本加载失败。请检查网络，或使用普通背景与裁剪功能。');return;}
  }
  try{
    status('正在初始化人物分割模型，请稍候……');
    if(!window._idSeg){
      window._idSeg=new SelfieSegmentation({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`});
      window._idSeg.setOptions({modelSelection:1});
      window._idSeg.onResults(r=>{
        if(!r.segmentationMask){status('模型未返回分割遮罩，请换一张正面人物照重试。');return;}
        const m=document.createElement('canvas');m.width=photo.naturalWidth;m.height=photo.naturalHeight;
        const mc=m.getContext('2d');mc.drawImage(r.segmentationMask,0,0,m.width,m.height);
        // Convert the mask into alpha using destination-in, retaining the person's region.
        const person=document.createElement('canvas');person.width=m.width;person.height=m.height;
        const pc=person.getContext('2d');pc.drawImage(photo,0,0);pc.globalCompositeOperation='destination-in';pc.drawImage(m,0,0);pc.globalCompositeOperation='source-over';
        cutoutMask=person;draw();status('AI 人像分割已完成。请检查头发和肩部边缘；结果会受照片质量影响。');
      });
    }
    await window._idSeg.send({image:photo});
  }catch(e){status('AI 抠图运行失败：'+(e.message||e)+'。普通编辑功能仍可用。');}
});
$('makeSheet').addEventListener('click',()=>{
  if(!photo){status('请先上传并生成证件照，再制作排版。');return;}
  draw();
  const dpi=300, mm= dpi/25.4, pageW=Math.round(210*mm),pageH=Math.round(297*mm);
  sheet.width=pageW;sheet.height=pageH;sctx.fillStyle='#fff';sctx.fillRect(0,0,pageW,pageH);
  const [w,h]=getSize(), copies=Number($('copies').value), gap=Math.round(3*mm), margin=Math.round(8*mm);
  const pw=Math.max(1,Math.round(w/96*dpi)),ph=Math.max(1,Math.round(h/96*dpi));
  const cols=Math.max(1,Math.floor((pageW-2*margin+gap)/(pw+gap)));
  const rows=Math.ceil(copies/cols);
  if(rows*ph+(rows-1)*gap>pageH-2*margin){status('当前尺寸和张数无法放入一张 A4，请减少张数或选择较小规格。');return;}
  const totalW=cols*pw+(cols-1)*gap, startX=Math.round((pageW-totalW)/2);
  for(let i=0;i<copies;i++){const x=startX+(i%cols)*(pw+gap),y=margin+Math.floor(i/cols)*(ph+gap);sctx.drawImage(canvas,x,y,pw,ph);sctx.strokeStyle='#d7dce5';sctx.lineWidth=2;sctx.strokeRect(x,y,pw,ph);}
  sheetReady=true;sheet.style.display='block';$('sheetPlaceholder').hidden=true;status(`已生成 A4 排版预览：${copies} 张，页面为 300 DPI 尺寸。打印对话框中请关闭“适合页面”缩放以减少尺寸误差。`);
});
$('downloadSheet').addEventListener('click',()=>{if(!sheetReady)return status('请先生成 A4 排版。');downloadCanvas(sheet,'证件照_A4排版.png');});
$('printSheet').addEventListener('click',()=>{
  if(!sheetReady)return status('请先生成 A4 排版。');
  const data=sheet.toDataURL('image/png'),w=window.open('','_blank');
  if(!w){status('浏览器拦截了打印窗口，请允许弹出窗口后重试。');return;}
  w.document.write(`<!doctype html><html><head><title>证件照 A4 打印</title><style>@page{size:A4;margin:0}html,body{margin:0;width:210mm;height:297mm}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${data}" onload="setTimeout(()=>window.print(),250)"></body></html>`);w.document.close();
});
$('themeBtn').addEventListener('click',()=>{document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');document.body.style.background=dark?'#111827':'';document.body.style.color=dark?'#e5e7eb':'';document.querySelectorAll('.panel,header').forEach(e=>{e.style.background=dark?'#1f2937':'';e.style.color=dark?'#e5e7eb':'';});});
})();
