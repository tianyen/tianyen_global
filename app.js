import {FluidArt} from './fluid.js?v=riyadh-2026-5';
import {initHistory} from './history.js?v=riyadh-2026-5';
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motionPreference.matches;try{if(!paused)paused=localStorage.getItem('tianyen-overseas-motion')==='paused'}catch{}
const status=document.querySelector('.art-status');
const arts=[...document.querySelectorAll('[data-art]')].map(host=>new FluidArt(host,{paused,onFallback:()=>{status.textContent='Still artwork mode';document.querySelectorAll('.interaction-hint').forEach(el=>el.textContent='A study in light and form')}}));
const lab=arts[0];
function updateMotion(){document.body.classList.toggle('motion-paused',paused);document.documentElement.style.scrollBehavior=paused?'auto':'';document.querySelectorAll('.motion-toggle').forEach(btn=>{btn.setAttribute('aria-pressed',String(paused));btn.innerHTML=paused?'Resume motion <span aria-hidden="true">▷</span>':'Pause motion <span aria-hidden="true">Ⅱ</span>'});arts.forEach(art=>art.setPaused(paused));document.dispatchEvent(new Event('motionchange'));status.textContent=paused?'Motion paused':arts.some(a=>a.host.dataset.renderer==='static')?'Still artwork mode':''}
updateMotion();document.querySelectorAll('.motion-toggle').forEach(btn=>btn.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('tianyen-overseas-motion',paused?'paused':'playing')}catch{}updateMotion()}));motionPreference.addEventListener('change',e=>{paused=e.matches;updateMotion()});
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#mobile-nav');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');nav.hidden=true}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));menu.setAttribute('aria-label',open?'Open menu':'Close menu');nav.hidden=open});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){closeMenu();menu.focus()}});
initHistory(lab);
let lastFocus;function openDialog(id){lastFocus=document.activeElement;closeMenu();document.querySelector(id).showModal();document.body.style.overflow='hidden'}
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.dialog-close').addEventListener('click',()=>d.close());d.addEventListener('close',()=>{document.body.style.overflow='';lastFocus?.focus()});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let casesPromise;
const loadCases=()=>casesPromise??=(fetch('./cases.json').then(r=>{if(!r.ok)throw Error('Projects unavailable');return r.json()}).catch(e=>{casesPromise=null;throw e}));
document.querySelectorAll('[data-project]').forEach(btn=>btn.addEventListener('click',async()=>{const content=document.querySelector('#project-content');content.innerHTML='<div class="project-detail-copy"><h2 id="project-dialog-title">Opening project</h2></div>';openDialog('#project-dialog');try{const cases=await loadCases();const c=cases.find(c=>c.id===Number(btn.dataset.project));if(!c)throw Error('Project not found');content.innerHTML=`<img class="project-detail-image" src="${escape(c.image)}" alt="${escape(c.title)}">${c.originalImage?`<div class="image-comparison"><span id="image-version">${escape(c.coverLabel||'AI-enhanced cover')}</span><button id="compare-original" type="button" aria-pressed="false">View original photo</button></div>`:''}<div class="project-detail-copy"><p class="eyebrow">${escape(c.category.toUpperCase())}</p><h2 id="project-dialog-title">${escape(c.title)}</h2><p>${escape(c.description)}</p><div class="project-links">${c.video?`<a href="${escape(c.video)}" target="_blank" rel="noopener noreferrer">Watch project film ↗</a>`:''}<a href="#contact" id="project-enquire">Discuss a similar project ↗</a></div>${c.gallery.length>1?`<div class="project-gallery">${c.gallery.slice(1).map(p=>`<img src="${escape(p)}" alt="${escape(c.title)} installation detail" loading="lazy">`).join('')}</div>`:''}</div>`;if(c.originalImage){document.querySelector('#compare-original').addEventListener('click',e=>{const original=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(original));e.currentTarget.textContent=original?'View refined cover':'View original photo';document.querySelector('.project-detail-image').src=original?c.originalImage:c.image;document.querySelector('#image-version').textContent=original?'Original project photo':(c.coverLabel||'AI-enhanced cover')})}document.querySelector('#project-enquire').addEventListener('click',()=>document.querySelector('#project-dialog').close())}catch{content.innerHTML='<div class="project-detail-copy"><h2 id="project-dialog-title">Project unavailable</h2><p>Please reload the page or contact service@tianyen.com.</p></div>'}}));
document.querySelector('#brief-open').addEventListener('click',()=>openDialog('#brief-dialog'));document.querySelector('#privacy-open').addEventListener('click',()=>openDialog('#privacy-dialog'));
const tr=key=>window.siteI18n?.t(key)??key;
const form=document.querySelector('#brief-form');let summary='';
form.addEventListener('input',e=>e.target.setCustomValidity?.(''));

form.addEventListener('submit',e=>{e.preventDefault();for(const name of ['name','message']){const input=form.elements.namedItem(name);input.setCustomValidity(input.value.trim()?'':tr('Please complete this field.'))}if(!form.reportValidity())return;const d=Object.fromEntries(new FormData(form));summary=`TIANYEN — ${tr('New project enquiry')}

${tr('Name')}: ${d.name.trim()}
${tr('Email')}: ${d.email.trim()}
${tr('Company')}: ${d.company.trim()||tr('Not specified')}
${tr('Country / city')}: ${d.location.trim()||tr('Not specified')}
${tr('Project type')}: ${tr(d.type)}
${tr('Timing')}: ${d.timing.trim()||tr('Not specified')}

${tr('Project brief')}
${d.message.trim()}`;document.querySelector('#draft-text').textContent=summary;document.querySelector('#draft-mail').href=`mailto:service@tianyen.com?subject=${encodeURIComponent(tr('New project enquiry')+' — '+d.name.trim())}&body=${encodeURIComponent(summary)}`;document.querySelector('#draft').hidden=false;document.querySelector('#draft-status').textContent='Your brief is ready. It has not been sent.';document.querySelector('#draft').scrollIntoView({behavior:paused?'instant':'smooth',block:'nearest'})});
document.querySelector('#draft-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary);document.querySelector('#draft-status').textContent='Copied. Paste the brief into your email when you are ready.'}catch{document.querySelector('#draft-status').textContent='Please select and copy the brief above.'}});

document.addEventListener('languagechange',()=>{form.querySelectorAll('input,textarea').forEach(el=>el.setCustomValidity(''));if(summary)form.requestSubmit()});
