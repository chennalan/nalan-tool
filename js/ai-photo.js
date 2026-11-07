(()=>{'use strict';
const $=id=>document.getElementById(id);
const MODEL_ID='studioludens/birefnet-lite-512';
const MAX_FILE=25*1024*1024,MAX_EDGE=6000,MAX_PIXELS=12000000;
let model=null,processor=null,RawImage=null,source=null,sourceName='product',maskCanvas=null,busy=false,device='wasm';
const setStatus=s=>{$('aiStatus').textContent=s};
function setBusy(v){busy=v;$('aiLoad').disabled=v||!!model;$('aiRun').disabled=v||!model||!source;$('aiPng').disabled=v||!maskCanvas;$('aiJpg').disabled=v||!maskCanvas;$('aiFile').disabled=v}
function setEmpty(show){$('aiEmpty').style.display=show?'block':'none';$('aiCanvas').style.display=show?'none':'block'}
function fileStem(n){return (n||'product').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'_').slice(0,80)||'product'}
function drawPreview(background){
 if(!maskCanvas||!source)return;
 const feather=Number($('aiFeather').value)||0;
 const w=source.width,h=source.height,mask=document.createElement('canvas');mask.width=w;mask.height=h;
 const mc=mask.getContext('2d');mc.filter=feather>0?'blur('+feather+'px)':'none';mc.drawImage(maskCanvas,0,0,w,h);mc.filter='none';
 const fg=document.createElement('canvas');fg.width=w;fg.height=h;const fx=fg.getContext('2d');fx.drawImage(source,0,0);fx.globalCompositeOperation='destination-in';fx.drawImage(mask,0,0);fx.globalCompositeOperation='source-over';
 const out=$('aiCanvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.clearRect(0,0,w,h);
 const colors={white:'#ffffff',cream:'#f7f2e9',gray:'#e5e7eb'};
 if(background!=='transparent'){ctx.fillStyle=colors[background]||'#ffffff';ctx.fillRect(0,0,w,h)}
 ctx.drawImage(fg,0,0);setEmpty(false);
}
function preview(){drawPreview($('aiBg').value)}
function decodeFile(file){
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('图片解码失败'))};img.src=url});
}
$('aiFile').addEventListener('change',async e=>{
 const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)){setStatus('请选择 JPG、PNG 或 WebP 图片。');return}
 if(file.size>MAX_FILE){setStatus('图片超过 25MB，请先压缩后再试。');return}
 try{const img=await decodeFile(file);if(img.naturalWidth>MAX_EDGE||img.naturalHeight>MAX_EDGE||img.naturalWidth*img.naturalHeight>MAX_PIXELS){setStatus('图片尺寸过大，请先将最长边缩小到 6000px 以内且总像素不超过 3600 万。');return}
 source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;source.getContext('2d').drawImage(img,0,0);sourceName=fileStem(file.name);maskCanvas=null;
 const out=$('aiCanvas');out.width=source.width;out.height=source.height;out.getContext('2d').clearRect(0,0,out.width,out.height);const c=out.getContext('2d');c.drawImage(source,0,0);setEmpty(false);
 $('aiMeta').textContent=file.name+' · '+source.width+' × '+source.height+' px';$('aiRun').disabled=!model||busy;$('aiPng').disabled=true;$('aiJpg').disabled=true;
 setStatus(model?'图片已载入，可以开始抠图。':'图片已载入，请先加载 AI 模型。');
 }catch(err){setStatus('读取图片失败：'+err.message)}
});
$('aiLoad').addEventListener('click',async()=>{
 if(model||busy)return;setBusy(true);setStatus('正在加载推理运行库…首次使用需要联网。');
 try{
  const lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
  RawImage=lib.RawImage;
  processor=await lib.AutoProcessor.from_pretrained(MODEL_ID);
  let lastError=null;
  if(navigator.gpu){try{setStatus('正在加载约 94MB 的 FP16 模型（WebGPU）…');model=await lib.AutoModel.from_pretrained(MODEL_ID,{dtype:'fp16',device:'webgpu'});device='webgpu'}catch(err){lastError=err;model=null}}
  if(!model){setStatus('WebGPU 不可用或初始化失败，改用 WASM CPU…');try{model=await lib.AutoModel.from_pretrained(MODEL_ID,{dtype:'fp16',device:'wasm'});device='wasm'}catch(err){throw new Error('模型加载失败：'+err.message+(lastError?'；WebGPU：'+lastError.message:''))}}
  $('aiLoad').textContent='模型已就绪 · '+(device==='webgpu'?'GPU':'CPU');$('aiLoad').disabled=true;
  setStatus('模型加载完成（'+(device==='webgpu'?'WebGPU GPU':'WASM CPU')+'）。'+(source?'可以开始抠图。':'请选择一张商品图片。'));
 }catch(err){model=null;processor=null;setStatus('加载失败：'+err.message+'。请检查网络后重试。');$('aiLoad').disabled=false}
 finally{setBusy(false)}
});
$('aiRun').addEventListener('click',async()=>{
 if(!model||!source||busy)return;setBusy(true);setStatus('正在分析商品主体…图片不会离开浏览器。');
 try{
  const image=RawImage.fromCanvas(source).rgb();
  const {pixel_values}=await processor(image);
  const result=await model({input_image:pixel_values});
  const logits=result.logits||result.output_image;
  if(!logits)throw new Error('模型没有返回预期的分割结果');
  const maskRaw=RawImage.fromTensor(logits[0].sigmoid().mul(255).to('uint8'));
  await maskRaw.resize(source.width,source.height);
  maskCanvas=document.createElement('canvas');maskCanvas.width=source.width;maskCanvas.height=source.height;
  const mctx=maskCanvas.getContext('2d'),pixels=mctx.createImageData(source.width,source.height),data=maskRaw.data;
  for(let i=0,j=0;i<data.length;i++,j+=4){const v=data[i];pixels.data[j]=v;pixels.data[j+1]=v;pixels.data[j+2]=v;pixels.data[j+3]=255}
  mctx.putImageData(pixels,0,0);preview();
  $('aiPng').disabled=false;$('aiJpg').disabled=false;
  setStatus('抠图完成。请检查蕾丝、细肩带和半透明边缘；512×512 模型可能丢失极细节，必要时调整柔化。');
 }catch(err){maskCanvas=null;setStatus('抠图失败：'+err.message)}
 finally{setBusy(false)}
});
$('aiBg').addEventListener('change',preview);
$('aiFeather').addEventListener('input',()=>{$('aiFeatherVal').textContent=Number($('aiFeather').value).toFixed(1)+' px';preview()});
function exportBlob(type,background){
 return new Promise((resolve,reject)=>{const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');const feather=Number($('aiFeather').value)||0,mask=document.createElement('canvas');mask.width=c.width;mask.height=c.height;const m=mask.getContext('2d');m.filter=feather>0?'blur('+feather+'px)':'none';m.drawImage(maskCanvas,0,0);m.filter='none';
 const fg=document.createElement('canvas');fg.width=c.width;fg.height=c.height;const f=fg.getContext('2d');f.drawImage(source,0,0);f.globalCompositeOperation='destination-in';f.drawImage(mask,0,0);
 if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height)}ctx.drawImage(fg,0,0);
 c.toBlob(b=>b?resolve(b):reject(new Error('生成文件失败')),type,type==='image/jpeg'?.94:undefined)
 });
}
function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('aiPng').addEventListener('click',async()=>{if(!maskCanvas||busy)return;try{setBusy(true);const b=await exportBlob('image/png',null);save(b,sourceName+'-cutout.png');setStatus('透明 PNG 已导出。')}catch(e){setStatus(e.message)}finally{setBusy(false)}});
$('aiJpg').addEventListener('click',async()=>{if(!maskCanvas||busy)return;const colors={transparent:'#ffffff',white:'#ffffff',cream:'#f7f2e9',gray:'#e5e7eb'};try{setBusy(true);const b=await exportBlob('image/jpeg',colors[$('aiBg').value]||'#ffffff');save(b,sourceName+'-background.jpg');setStatus('背景 JPG 已导出。')}catch(e){setStatus(e.message)}finally{setBusy(false)}});
$('aiReset').addEventListener('click',()=>{source=null;maskCanvas=null;sourceName='product';const c=$('aiCanvas');c.width=1;c.height=1;c.getContext('2d').clearRect(0,0,1,1);setEmpty(true);$('aiMeta').textContent='支持 JPG / PNG / WebP；建议单张不超过 25MB、最长边不超过 6000px。';$('aiRun').disabled=true;$('aiPng').disabled=true;$('aiJpg').disabled=true;setStatus(model?'模型已就绪，请选择图片。':'模型尚未加载。')});
setEmpty(true);
})();