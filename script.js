const root=document.body;
const themeButton=document.querySelector('.theme-button');
const savedTheme=localStorage.getItem('resume-theme');
if(savedTheme==='light')root.classList.add('light');
themeButton.addEventListener('click',()=>{root.classList.toggle('light');localStorage.setItem('resume-theme',root.classList.contains('light')?'light':'dark')});
document.getElementById('year').textContent=new Date().getFullYear();
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(element=>observer.observe(element));

