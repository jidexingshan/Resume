const REPO='jidexingshan/Resume',BRANCH='main',API='https://api.github.com/repos/'+REPO;
let token=sessionStorage.getItem('resume-github-token')||'',data=null,contentSha='',pendingPhoto=null;
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const statusEl=$('#status'),savebar=$('.savebar');
const cropDialog=$('#crop-dialog'),cropCanvas=$('#crop-canvas');
let cropImage=null,cropFile=null,cropX=0,cropY=0,cropZoom=1,dragPoint=null;

function status(message,type=''){
  statusEl.textContent=message;savebar.classList.remove('error','success');if(type)savebar.classList.add(type);
}
function decodeBase64(value){const bytes=Uint8Array.from(atob(value.replace(/\n/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function encodeBase64(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
async function github(path,options={}){
  const response=await fetch(API+path,{...options,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}});
  if(!response.ok){let detail='';try{detail=(await response.json()).message}catch{}throw new Error(detail||`GitHub 请求失败（${response.status}）`)}
  return response.status===204?null:response.json();
}
async function verifyPublicContent(expectedSha){
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(API+'/contents/content.json?ref='+BRANCH+'&t='+Date.now(),{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
      if(response.ok&&(await response.json()).sha===expectedSha)return true;
    }catch{}
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,1200));
  }
  return false;
}
async function connect(){
  token=$('#token-input').value.trim()||token;if(!token){$('#login-panel p:last-child').textContent='请先输入 GitHub Token。';return}
  const button=$('#connect-button');button.disabled=true;button.textContent='正在连接…';
  try{const file=await github('/contents/content.json?ref='+BRANCH);contentSha=file.sha;data=JSON.parse(decodeBase64(file.content));sessionStorage.setItem('resume-github-token',token);renderForm();$('#login-panel').hidden=true;$('#editor').hidden=false;status('内容已加载，可以开始编辑。')}
  catch(error){$('#login-panel p:last-child').textContent=`连接失败：${error.message}。请确认令牌仅授权给 Resume 仓库且 Contents 为 Read and write。`}
  finally{button.disabled=false;button.textContent='连接并加载内容'}
}
function fillProfile(){$$('[data-profile]').forEach(input=>input.value=data.profile?.[input.dataset.profile]??'');$('#photo-name').textContent=data.profile?.photo||'尚未上传'}
function addCard(kind,item={}){
  const singular={experiences:'experience',research:'research',interests:'interest'}[kind];
  const fragment=$(`#${singular}-template`).content.cloneNode(true),card=fragment.querySelector('.repeat-card');
  card.dataset.kind=kind;card.querySelectorAll('[data-key]').forEach(input=>{const key=input.dataset.key;let value=item[key]??'';if(Array.isArray(value))value=value.join(key==='tags'?'，':'\n');input.value=value});
  card.querySelector('.remove').addEventListener('click',()=>card.remove());$(`#${kind}-editor`).appendChild(fragment);
}
function renderForm(){fillProfile();['experiences','research','interests'].forEach(kind=>{const container=$(`#${kind}-editor`);container.innerHTML='';(data[kind]||[]).forEach(item=>addCard(kind,item))})}
function collectCards(kind){return $$(`#${kind}-editor .repeat-card`).map(card=>{const item={};card.querySelectorAll('[data-key]').forEach(input=>{const key=input.dataset.key;let value=input.value.trim();if(key==='highlights')value=value.split(/\n/).map(v=>v.trim()).filter(Boolean);if(key==='tags')value=value.split(/[，,]/).map(v=>v.trim()).filter(Boolean);item[key]=value});return item})}
function collect(){data.profile=data.profile||{};$$('[data-profile]').forEach(input=>data.profile[input.dataset.profile]=input.value.trim());data.experiences=collectCards('experiences');data.research=collectCards('research');data.interests=collectCards('interests')}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)})}
async function uploadPhoto(){
  if(!pendingPhoto)return;
  const ext=(pendingPhoto.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`assets/profile.${ext}`;
  let sha;try{sha=(await github('/contents/'+path+'?ref='+BRANCH)).sha}catch(error){if(!/Not Found/i.test(error.message))throw error}
  const body={message:'Update profile photo',content:await fileToBase64(pendingPhoto),branch:BRANCH};if(sha)body.sha=sha;
  await github('/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});data.profile.photo=path;data.profile.photoVersion=Date.now();pendingPhoto=null;
}
async function save(){
  collect();const button=$('#save-button');button.disabled=true;button.textContent='正在保存…';status('正在上传并发布，请稍候…');
  try{await uploadPhoto();const body={message:'Update resume content',content:encodeBase64(JSON.stringify(data,null,2)+'\n'),sha:contentSha,branch:BRANCH};const result=await github('/contents/content.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});contentSha=result.content.sha;fillProfile();status('已保存到 GitHub，正在确认访客可读取最新内容…');const verified=await verifyPublicContent(contentSha);status(verified?'保存成功，访客可读取最新内容；刷新公开主页即可查看。':'已保存到 GitHub；暂时无法自动核对公开读取状态，请打开公开主页确认。',verified?'success':'')}
  catch(error){status(`保存失败：${error.message}。编辑内容仍保留在当前页面。`,'error')}
  finally{button.disabled=false;button.textContent='保存并发布'}
}

$('#connect-button').addEventListener('click',connect);$('#token-input').addEventListener('keydown',event=>{if(event.key==='Enter')connect()});
$('#save-button').addEventListener('click',save);$('#disconnect-button').addEventListener('click',()=>{sessionStorage.removeItem('resume-github-token');location.reload()});
$$('[data-add]').forEach(button=>button.addEventListener('click',()=>addCard(button.dataset.add,{})));
function cropRatio(){const value=$('#crop-ratio').value;if(value==='original')return cropImage.naturalWidth/cropImage.naturalHeight;const [width,height]=value.split(':').map(Number);return width/height}
function cropGeometry(){const ratio=cropRatio();let width=640,height=Math.round(width/ratio);if(height>520){height=520;width=Math.round(height*ratio)}return {width,height}}
function paintCrop(canvas,scale=1){
  if(!cropImage)return;
  const {width,height}=cropGeometry(),ctx=canvas.getContext('2d');
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle='#020813';ctx.fillRect(0,0,width,height);
  const base=Math.max(width/cropImage.naturalWidth,height/cropImage.naturalHeight)*cropZoom;
  const imageWidth=cropImage.naturalWidth*base,imageHeight=cropImage.naturalHeight*base;
  cropX=Math.max((width-imageWidth)/2,Math.min((imageWidth-width)/2,cropX));
  cropY=Math.max((height-imageHeight)/2,Math.min((imageHeight-height)/2,cropY));
  ctx.drawImage(cropImage,(width-imageWidth)/2+cropX,(height-imageHeight)/2+cropY,imageWidth,imageHeight);
}
async function openCrop(file){
  const objectUrl=URL.createObjectURL(file),image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=objectUrl});cropImage=image;cropFile=file;cropX=0;cropY=0;cropZoom=1;$('#crop-zoom').value='1';$('#crop-ratio').value='original';paintCrop(cropCanvas);cropDialog.showModal()}
  catch{status('无法读取这张照片，请尝试 JPG、PNG 或 WebP 文件。','error')}
  finally{URL.revokeObjectURL(objectUrl)}
}
function closeCrop(){cropDialog.close();cropImage=null;cropFile=null;$('#photo-input').value=''}
$('#photo-input').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(file.size>=10*1024*1024){status('请选择小于 10 MB 的照片。','error');event.target.value='';return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status('请选择 JPG、PNG 或 WebP 照片。','error');event.target.value='';return}openCrop(file)});
$('#crop-ratio').addEventListener('change',()=>{cropX=0;cropY=0;paintCrop(cropCanvas)});
$('#crop-zoom').addEventListener('input',event=>{cropZoom=Number(event.target.value);paintCrop(cropCanvas)});
cropCanvas.addEventListener('pointerdown',event=>{dragPoint={x:event.clientX,y:event.clientY};cropCanvas.setPointerCapture(event.pointerId)});
cropCanvas.addEventListener('pointermove',event=>{if(!dragPoint)return;const rect=cropCanvas.getBoundingClientRect();cropX+=(event.clientX-dragPoint.x)*cropCanvas.width/rect.width;cropY+=(event.clientY-dragPoint.y)*cropCanvas.height/rect.height;dragPoint={x:event.clientX,y:event.clientY};paintCrop(cropCanvas)});
cropCanvas.addEventListener('pointerup',()=>dragPoint=null);cropCanvas.addEventListener('pointercancel',()=>dragPoint=null);
$('#crop-cancel').addEventListener('click',closeCrop);$('#crop-cancel-top').addEventListener('click',closeCrop);
cropDialog.addEventListener('close',()=>{$('#photo-input').value=''});
$('#crop-apply').addEventListener('click',async()=>{
  if(!cropImage)return;
  const {width,height}=cropGeometry(),output=document.createElement('canvas');paintCrop(output,Math.min(1600/Math.max(width,height),3));
  const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.9));
  if(!blob||blob.size>=10*1024*1024){status('裁剪后的照片无法控制在 10 MB 以下，请缩小或换一张照片。','error');return}
  pendingPhoto=new File([blob],'profile.jpg',{type:'image/jpeg'});
  $('#photo-name').textContent=`已裁剪：${cropFile.name} · ${(pendingPhoto.size/1024/1024).toFixed(2)} MB，保存后上传`;
  status('照片已裁剪；点击“保存并发布”后上传。');closeCrop();
});
if(token){$('#token-input').value=token;connect()}
