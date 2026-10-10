const root=document.body;
const themeButton=document.querySelector('.theme-button');
if(localStorage.getItem('resume-theme')==='light')root.classList.add('light');
themeButton.addEventListener('click',()=>{root.classList.toggle('light');localStorage.setItem('resume-theme',root.classList.contains('light')?'light':'dark')});
document.getElementById('year').textContent=new Date().getFullYear();

const text=value=>String(value??'');
const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=text(value)};
const setContact=(id,value,prefix='')=>{const el=document.getElementById(id);if(!el)return;el.textContent=text(value);el.href=prefix+text(value)};
const REPO='jidexingshan/Resume';
const safeHttpUrl=value=>{try{const url=new URL(String(value));return ['http:','https:'].includes(url.protocol)?url.href:null}catch{return null}};
function appendProjectLink(container,url,label){const href=safeHttpUrl(url);if(!href)return;const link=document.createElement('a');link.href=href;link.textContent=label;link.target='_blank';link.rel='noopener noreferrer';container.appendChild(link)}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
function observeReveals(){document.querySelectorAll('.reveal:not(.visible)').forEach(element=>observer.observe(element))}

function renderContent(data){
  const p=data.profile||{};
  document.title=`${p.name||'个人主页'}｜个人主页`;
  setText('profile-name',p.name);setText('profile-title',p.title);setText('brand-initials',p.initials||'YN');setText('profile-intro',p.intro);
  setContact('profile-email',p.email,'mailto:');setContact('profile-phone',p.phone,'tel:');setText('profile-location',p.location);
  setText('fact-school',p.school);setText('fact-major',p.major);setText('fact-period',p.period);setText('fact-languages',p.languages);setText('footer-name',p.name);
  document.getElementById('email-button').href=`mailto:${p.email||''}`;setContact('contact-email',p.email,'mailto:');
  const photo=document.getElementById('profile-photo'),placeholder=document.getElementById('photo-placeholder');
  if(p.photo){const path=String(p.photo).replace(/^\/+/,''),source=safeHttpUrl(p.photo)||(location.hostname==='jidexingshan.github.io'?path:`https://raw.githubusercontent.com/${REPO}/main/${path}`);photo.src=source+(p.photoVersion?`${source.includes('?')?'&':'?'}v=${encodeURIComponent(p.photoVersion)}`:'');photo.hidden=false;placeholder.hidden=true}else{photo.hidden=true;placeholder.hidden=false}

  const timeline=document.getElementById('experience-list');timeline.innerHTML='';
  (data.experiences||[]).forEach(item=>{const article=document.createElement('article');article.className='timeline-item reveal';const date=document.createElement('div');date.className='date';date.textContent=text(item.date);const body=document.createElement('div');const tag=document.createElement('p');tag.className='tag';tag.textContent=text(item.type);const title=document.createElement('h3');title.textContent=[item.role,item.org].filter(Boolean).join(' · ');const summary=document.createElement('p');summary.textContent=text(item.summary);body.append(tag,title,summary);if(item.highlights?.length){const ul=document.createElement('ul');item.highlights.forEach(value=>{const li=document.createElement('li');li.textContent=text(value);ul.appendChild(li)});body.appendChild(ul)}article.append(date,body);timeline.appendChild(article)});

  const research=document.getElementById('research-list');research.innerHTML='';
  (data.research||[]).forEach((item,index)=>{const article=document.createElement('article');article.className='project-card reveal';const letter=document.createElement('div');letter.className='project-index';letter.textContent=item.letter||String.fromCharCode(65+index);const tag=document.createElement('p');tag.className='tag';tag.textContent=text(item.type);const title=document.createElement('h3');title.textContent=text(item.title);const description=document.createElement('p');description.textContent=text(item.description);article.append(letter,tag,title,description);if(item.meta){const meta=document.createElement('p');meta.className='citation';meta.textContent=text(item.meta);article.appendChild(meta)}if(item.tags?.length){const chips=document.createElement('div');chips.className='chips';item.tags.forEach(value=>{const chip=document.createElement('span');chip.textContent=text(value);chips.appendChild(chip)});article.appendChild(chips)}const links=document.createElement('div');links.className='project-links';appendProjectLink(links,item.link,item.linkLabel||'查看详情');appendProjectLink(links,item.codeUrl,'代码仓库');if(links.children.length)article.appendChild(links);research.appendChild(article)});

  const interests=document.getElementById('interest-list');interests.innerHTML='';
  (data.interests||[]).forEach((item,index)=>{const article=document.createElement('article');const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');const title=document.createElement('h3');title.textContent=text(item.title);const description=document.createElement('p');description.textContent=text(item.description);article.append(number,title,description);interests.appendChild(article)});
  observeReveals();
}

async function loadContent(){
  try{const response=await fetch(`https://api.github.com/repos/${REPO}/contents/content.json?ref=main&t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(response.ok){const file=await response.json();const bytes=Uint8Array.from(atob(file.content.replace(/\n/g,'')),c=>c.charCodeAt(0));renderContent(JSON.parse(new TextDecoder().decode(bytes)));return}}
  catch{}
  try{const response=await fetch('content.json',{cache:'no-store'});if(response.ok)renderContent(await response.json())}catch{}
}
observeReveals();loadContent();
