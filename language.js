(async()=>{
const dictionaries=await fetch('./translations.json').then(r=>{if(!r.ok)throw Error('Translations unavailable');return r.json()});
const allowed=['zh-TW','en','ar'];let lang='zh-TW';try{lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('tianyen-language')||lang}catch{}if(!allowed.includes(lang))lang='zh-TW';
const t=(key)=>dictionaries[lang]?.[key]??key;
window.siteI18n={t,get lang(){return lang}};
const records=new WeakMap(),attributes=new WeakMap();
function translated(raw){const key=raw.trim();return raw.replace(key,t(key))}
function translate(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
 if(node.parentElement.closest('script,style,[data-zh],#draft-text,[data-language-control]'))continue;
 let rec=records.get(node);if(!rec||node.textContent!==rec.last){rec={original:node.textContent,last:node.textContent};records.set(node,rec)}
 const value=translated(rec.original);rec.last=value;if(node.textContent!==value)node.textContent=value;
 }
 document.querySelectorAll('[aria-label],[placeholder],img[alt]').forEach(el=>{
 let rec=attributes.get(el);if(!rec){rec={};attributes.set(el,rec)}
 for(const attr of ['aria-label','placeholder','alt']){if(!el.hasAttribute(attr))continue;let r=rec[attr];const current=el.getAttribute(attr);if(!r||current!==r.last)r=rec[attr]={original:current};const value=t(r.original);r.last=value;if(current!==value)el.setAttribute(attr,value)}
 });
}
const grid=document.querySelector('.project-grid'),prev=document.querySelector('#work-prev'),next=document.querySelector('#work-next');
function layout(){const step=grid.children[0].getBoundingClientRect().width+18;const visible=Math.max(1,Math.round(grid.clientWidth/step));return{step,visible,total:Math.ceil(grid.children.length/visible)}}
function sync(){const{step,visible,total}=layout();const pos=Math.abs(grid.scrollLeft),max=grid.scrollWidth-grid.clientWidth;prev.disabled=pos<5;next.disabled=pos>=max-5;const page=next.disabled?total:Math.min(total,Math.round(pos/(step*visible))+1);document.querySelector('#work-page').textContent=String(page).padStart(2,'0')+' / '+String(total).padStart(2,'0')}
function slide(direction){const{step,visible}=layout();grid.scrollBy({left:direction*(lang==='ar'?-1:1)*step*visible,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
prev.onclick=()=>slide(-1);next.onclick=()=>slide(1);grid.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);
function apply(){document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.querySelectorAll('[data-zh]').forEach(el=>el.innerHTML=el.dataset[lang==='zh-TW'?'zh':lang]);document.querySelector('#language-select').value=lang;document.title=lang==='ar'?'TIANYEN — مساحات ذكية وتجارب لا تُنسى':lang==='en'?'TIANYEN — Bringing Spatial Intelligence to Life':'天衍互動｜讓空間擁有智慧 讓體驗深入人心';translate();prev.textContent=lang==='ar'?'→':'←';next.textContent=lang==='ar'?'←':'→';grid.scrollLeft=0;sync();document.dispatchEvent(new Event('languagechange'))}
document.querySelector('#language-select').addEventListener('change',e=>{lang=e.target.value;try{localStorage.setItem('tianyen-language',lang)}catch{}const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);apply()});apply();
new MutationObserver(translate).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label']});
})();
