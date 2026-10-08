const REPO='jidexingshan/Resume',BRANCH='main',API='https://api.github.com/repos/'+REPO;
let token=sessionStorage.getItem('resume-github-token')||'',data=null,contentSha='',pendingPhoto=null;
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const statusEl=$('#status'),savebar=$('.savebar');

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
  await github('/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});data.profile.photo=path;pendingPhoto=null;
}
async function save(){
  collect();const button=$('#save-button');button.disabled=true;button.textContent='正在保存…';status('正在上传并发布，请稍候…');
  try{await uploadPhoto();const body={message:'Update resume content',content:encodeBase64(JSON.stringify(data,null,2)+'\n'),sha:contentSha,branch:BRANCH};const result=await github('/contents/content.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});contentSha=result.content.sha;fillProfile();status('保存成功。公开主页将在 1–3 分钟内自动更新。','success')}
  catch(error){status(`保存失败：${error.message}。编辑内容仍保留在当前页面。`,'error')}
  finally{button.disabled=false;button.textContent='保存并发布'}
}

$('#connect-button').addEventListener('click',connect);$('#token-input').addEventListener('keydown',event=>{if(event.key==='Enter')connect()});
$('#save-button').addEventListener('click',save);$('#disconnect-button').addEventListener('click',()=>{sessionStorage.removeItem('resume-github-token');location.reload()});
$$('[data-add]').forEach(button=>button.addEventListener('click',()=>addCard(button.dataset.add,{})));
$('#photo-input').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(file.size>3*1024*1024){status('照片请控制在 3 MB 以内。','error');event.target.value='';return}pendingPhoto=file;$('#photo-name').textContent=`待上传：${file.name}`});
if(token){$('#token-input').value=token;connect()}

