(function(){
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const mem={};
const store={get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* theme */
const root=document.documentElement;
const saved=store.get('dd_theme',null);if(saved)root.setAttribute('data-theme',saved);
$('#themeBtn').onclick=()=>{const cur=root.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');const n=cur==='dark'?'light':'dark';root.setAttribute('data-theme',n);store.set('dd_theme',n)};

/* progress + active nav */
const prog=$('#prog');
addEventListener('scroll',()=>{const h=document.documentElement;prog.style.width=(scrollY/(h.scrollHeight-innerHeight)*100||0)+'%'},{passive:true});
const navLinks=$$('#links a');
const secObs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)navLinks.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});
$$('section[id]').forEach(s=>secObs.observe(s));

/* shap bars */
const MAXV=.4;
function shapRows(el,items,labelFn){
  el.innerHTML=items.map(f=>`<div class="sr"><span class="lab">${labelFn(f)}</span><div class="track"><div class="bar ${f.v>=0?'p':'n'}" data-w="${Math.abs(f.v)/MAXV*50}"></div></div><span class="num" style="color:var(--${f.v>=0?'pos':'neg'})">${f.v>0?'+':''}${f.v.toFixed(2)}</span></div>`).join('');
  requestAnimationFrame(()=>requestAnimationFrame(()=>$$('.bar',el).forEach(b=>b.style.width=b.dataset.w+'%')));
}

/* data */
const CASES={
 A:{id:'LN-20417',outcome:'declined',f:[{k:'score',v:-.34,val:'612'},{k:'dti',v:-.27,val:'58'},{k:'history',v:-.12,val:'14',u:'m'},{k:'income',v:.18,val:'3',u:'y'},{k:'payments',v:.09}]},
 B:{id:'LN-20418',outcome:'approved',f:[{k:'score',v:.21,val:'764'},{k:'dti',v:.14,val:'22'},{k:'history',v:.08,val:'9',u:'y'},{k:'income',v:.07,val:'6',u:'y'},{k:'payments',v:-.05}]}
};
const T={
 en:{name:{score:'Credit score',dti:'Debt-to-income',history:'Credit history',income:'Income stability',payments:'Repayment record'},
  declined:'Your loan application was declined.',approved:'Your loan application was approved.',against:'Main reasons',concern:'Points to watch',pro:'Factors in your favour',
  foot:'Prepared in the {t} format. Reviewed by a compliance officer before release.',u:{m:'months',y:'years'},
  f:{score:{neg:'Credit score of {v} is below the lender\'s minimum',pos:'Credit score of {v} is above the lender\'s minimum'},dti:{neg:'Monthly EMIs take {v}% of income, above the safe limit',pos:'Monthly EMIs take only {v}% of income'},history:{neg:'Credit history is only {v} {u} long',pos:'A credit history of {v} {u} shows long-term reliability'},income:{pos:'Salary has been credited regularly for {v} {u}'},payments:{neg:'An EMI was paid late in the last 12 months',pos:'All EMIs were paid on time in the last 12 months'}}},
 hi:{name:{score:'क्रेडिट स्कोर',dti:'आय के मुकाबले ऋण',history:'क्रेडिट इतिहास',income:'आय की स्थिरता',payments:'भुगतान रिकॉर्ड'},
  declined:'आपका ऋण आवेदन अस्वीकृत किया गया है।',approved:'आपका ऋण आवेदन स्वीकृत किया गया है।',against:'मुख्य कारण',concern:'ध्यान देने योग्य बातें',pro:'आपके पक्ष में कारक',
  foot:'यह स्पष्टीकरण {t} प्रारूप में तैयार किया गया है। जारी करने से पहले अनुपालन अधिकारी द्वारा समीक्षित।',u:{m:'महीने',y:'वर्ष'},
  f:{score:{neg:'क्रेडिट स्कोर {v} ऋणदाता की न्यूनतम सीमा से कम है',pos:'क्रेडिट स्कोर {v} ऋणदाता की न्यूनतम सीमा से अधिक है'},dti:{neg:'मासिक किस्तें आय का {v}% हैं, जो सुरक्षित सीमा से अधिक है',pos:'मासिक किस्तें आय का केवल {v}% हैं'},history:{neg:'क्रेडिट इतिहास केवल {v} {u} पुराना है',pos:'{v} {u} का क्रेडिट इतिहास दीर्घकालिक भरोसे को दर्शाता है'},income:{pos:'{v} {u} से नियमित वेतन जमा हो रहा है'},payments:{neg:'पिछले 12 महीनों में एक किस्त देर से चुकाई गई',pos:'पिछले 12 महीनों में सभी किस्तें समय पर चुकाई गईं'}}},
 mr:{name:{score:'क्रेडिट स्कोअर',dti:'उत्पन्नाच्या तुलनेत कर्ज',history:'क्रेडिट इतिहास',income:'उत्पन्नाची स्थिरता',payments:'परतफेड नोंद'},
  declined:'तुमचा कर्ज अर्ज नाकारण्यात आला आहे.',approved:'तुमचा कर्ज अर्ज मंजूर करण्यात आला आहे.',against:'मुख्य कारणे',concern:'लक्ष देण्यासारख्या बाबी',pro:'तुमच्या बाजूचे घटक',
  foot:'हे स्पष्टीकरण {t} स्वरूपात तयार केले आहे. प्रसिद्ध करण्यापूर्वी अनुपालन अधिकाऱ्याने तपासले आहे.',u:{m:'महिने',y:'वर्षे'},
  f:{score:{neg:'क्रेडिट स्कोअर {v} हा कर्जदात्याच्या किमान मर्यादेपेक्षा कमी आहे',pos:'क्रेडिट स्कोअर {v} हा कर्जदात्याच्या किमान मर्यादेपेक्षा जास्त आहे'},dti:{neg:'मासिक हप्ते उत्पन्नाच्या {v}% आहेत, जे सुरक्षित मर्यादेपेक्षा जास्त आहे',pos:'मासिक हप्ते उत्पन्नाच्या फक्त {v}% आहेत'},history:{neg:'क्रेडिट इतिहास फक्त {v} {u} जुना आहे',pos:'{v} {u} चा क्रेडिट इतिहास दीर्घकालीन विश्वासार्हता दर्शवतो'},income:{pos:'{v} {u} पासून नियमित पगार जमा होत आहे'},payments:{neg:'गेल्या 12 महिन्यांत एक हप्ता उशिरा भरला गेला',pos:'गेल्या 12 महिन्यांत सर्व हप्ते वेळेवर भरले गेले'}}},
 ta:{name:{score:'கடன் மதிப்பெண்',dti:'வருமான-கடன் விகிதம்',history:'கடன் வரலாறு',income:'வருமான நிலைத்தன்மை',payments:'திருப்பிச் செலுத்தும் பதிவு'},
  declined:'உங்கள் கடன் விண்ணப்பம் நிராகரிக்கப்பட்டுள்ளது.',approved:'உங்கள் கடன் விண்ணப்பம் ஒப்புதல் செய்யப்பட்டுள்ளது.',against:'முக்கியக் காரணங்கள்',concern:'கவனிக்க வேண்டியவை',pro:'உங்களுக்குச் சாதகமான காரணிகள்',
  foot:'இந்த விளக்கம் {t} வடிவத்தில் தயாரிக்கப்பட்டது. வெளியிடும் முன் இணக்க அதிகாரியால் மதிப்பாய்வு செய்யப்பட்டது.',u:{m:'மாதங்கள்',y:'ஆண்டுகள்'},
  f:{score:{neg:'கடன் மதிப்பெண் {v}, கடன் வழங்குநரின் குறைந்தபட்ச வரம்பை விடக் குறைவு',pos:'கடன் மதிப்பெண் {v}, கடன் வழங்குநரின் குறைந்தபட்ச வரம்பை விட அதிகம்'},dti:{neg:'மாதத் தவணைகள் வருமானத்தில் {v}% ஆகும், இது பாதுகாப்பான வரம்பை மீறுகிறது',pos:'மாதத் தவணைகள் வருமானத்தில் {v}% மட்டுமே'},history:{neg:'கடன் வரலாறு {v} {u} மட்டுமே',pos:'{v} {u} கடன் வரலாறு நீண்டகால நம்பகத்தன்மையைக் காட்டுகிறது'},income:{pos:'{v} {u} ஆக ஊதியம் தொடர்ந்து வரவு வைக்கப்படுகிறது'},payments:{neg:'கடந்த 12 மாதங்களில் ஒரு தவணை தாமதமாகச் செலுத்தப்பட்டது',pos:'கடந்த 12 மாதங்களில் அனைத்துத் தவணைகளும் சரியான நேரத்தில் செலுத்தப்பட்டன'}}}
};
const sent=(L,f)=>(L.f[f.k][f.v<0?'neg':'pos']||'').replace('{v}',f.val||'').replace('{u}',f.u?L.u[f.u]:'');
function explain(c,lang,tpl){
  const L=T[lang],C=CASES[c];
  const neg=C.f.filter(f=>f.v<0).sort((a,b)=>a.v-b.v),pos=C.f.filter(f=>f.v>0).sort((a,b)=>b.v-a.v);
  const lines=[L[C.outcome]];
  return {L,C,neg,pos,text:()=>{
    let s=L[C.outcome];
    if(neg.length)s+='\n'+(C.outcome==='declined'?L.against:L.concern)+':\n'+neg.map(f=>'- '+sent(L,f)).join('\n');
    if(pos.length)s+='\n'+L.pro+':\n'+pos.map(f=>'- '+sent(L,f)).join('\n');
    return s+'\n'+L.foot.replace('{t}',tpl);
  }};
}
function esc(s){return s.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

/* hero */
const heroItems=CASES.A.f.slice().sort((a,b)=>Math.abs(b.v)-Math.abs(a.v));
shapRows($('#heroShap'),heroItems,f=>T.en.name[f.k]);
const qs=['Why was this loan declined?','यह ऋण अस्वीकृत क्यों हुआ?','हे कर्ज का नाकारले गेले?','இந்தக் கடன் ஏன் நிராகரிக்கப்பட்டது?','এই ঋণ কেন প্রত্যাখ্যাত হলো?'];
let qi=0;const hq=$('#heroQ');
if(!reduce)setInterval(()=>{hq.classList.add('out');setTimeout(()=>{qi=(qi+1)%qs.length;hq.textContent=qs[qi];hq.classList.remove('out')},380)},3200);

/* demo */
let dCase='A';
function renderDemo(){
  const lang=$('#langSel').value,tpl=$('#tplSel').value,E=explain(dCase,lang,tpl),C=E.C;
  $('#dId').textContent='DECISION '+C.id;
  const pill=$('#dPill');pill.textContent=C.outcome.toUpperCase();pill.className='pill '+(C.outcome==='declined'?'bad':'good');
  shapRows($('#demoShap'),C.f.slice().sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)),f=>E.L.name[f.k]);
  const sum=C.f.reduce((s,f)=>s+f.v,0),score=Math.max(0,Math.min(1,.5+sum));
  $('#meterFill').style.width=(score*100)+'%';$('#scoreTxt').textContent=score.toFixed(2)+' / 0.50';
  const box=$('#explainBox');box.lang=lang;
  const neg=E.neg,pos=E.pos,L=E.L;
  box.innerHTML=`<h4>${esc(L[C.outcome])}</h4>`+(neg.length?`<b>${esc(C.outcome==='declined'?L.against:L.concern)}</b><ul>${neg.map(f=>`<li>${esc(sent(L,f))}</li>`).join('')}</ul>`:'')+(pos.length?`<b>${esc(L.pro)}</b><ul>${pos.map(f=>`<li>${esc(sent(L,f))}</li>`).join('')}</ul>`:'')+`<div class="foot">${esc(L.foot.replace('{t}',tpl))}</div>`;
}
$('#caseA').onclick=()=>{dCase='A';$('#caseA').setAttribute('aria-pressed','true');$('#caseB').setAttribute('aria-pressed','false');renderDemo()};
$('#caseB').onclick=()=>{dCase='B';$('#caseB').setAttribute('aria-pressed','true');$('#caseA').setAttribute('aria-pressed','false');renderDemo()};
$('#langSel').onchange=renderDemo;$('#tplSel').onchange=renderDemo;
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
const langName={en:'English',hi:'Hindi',mr:'Marathi',ta:'Tamil'};
function curText(){const E=explain(dCase,$('#langSel').value,$('#tplSel').value);return E.text()}
$('#saveLog').onclick=()=>requireAuth(()=>{
  const lang=$('#langSel').value,tpl=$('#tplSel').value,txt=curText();
  const logs=store.get('dd_log',[]);logs.unshift({id:CASES[dCase].id,ts:new Date().toISOString().slice(0,16).replace('T',' '),out:CASES[dCase].outcome,lang,tpl,h:fnv(txt),mine:1});
  store.set('dd_log',logs);renderLog();updateKpis();$('#demoMsg').textContent='Saved to your audit log in the console below.';
});
$('#openReport').onclick=()=>requireAuth(()=>{
  const lang=$('#langSel').value,tpl=$('#tplSel').value,C=CASES[dCase];
  const en=explain(dCase,'en',tpl).text(),loc=lang==='en'?'':explain(dCase,lang,tpl).text();
  $('#repText').textContent=`AUDIT REPORT · ${tpl} FORMAT\nDecision ID: ${C.id}\nOutcome: ${C.outcome}\nGenerated: ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC\nPrepared for: ${user.name} (${user.org})\n\nENGLISH REFERENCE\n${en}\n`+(loc?`\n${langName[lang].toUpperCase()} VERSION\n${loc}\n`:'')+`\nFEATURE CONTRIBUTIONS\n`+C.f.map(f=>`${T.en.name[f.k].padEnd(18)} ${(f.v>0?'+':'')+f.v.toFixed(2)}`).join('\n')+`\n\nIllustrative prototype output, not a regulatory filing.`;
  $('#repMsg').textContent='';$('#repModal').hidden=false;
});
$('#repClose').onclick=()=>$('#repModal').hidden=true;
$('#repCopy').onclick=async()=>{const t=$('#repText').textContent;try{await navigator.clipboard.writeText(t);$('#repMsg').textContent='Copied.'}catch(e){const r=document.createRange();r.selectNodeContents($('#repText'));const s=getSelection();s.removeAllRanges();s.addRange(r);$('#repMsg').textContent='Select and copy the text above.'}};

/* auth */
let user=store.get('dd_session',null);
let afterAuth=null,mode='in';
async function sha(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return fnv(s)}}
function setMode(m){mode=m;$('#tabIn').setAttribute('aria-pressed',m==='in');$('#tabUp').setAttribute('aria-pressed',m==='up');$$('.up').forEach(e=>e.hidden=m==='in');$('#authTitle').textContent=m==='in'?'Sign in':'Create your account';$('#authSubmit').textContent=m==='in'?'Sign in':'Sign up';$('#authErr').textContent='';$('#fPw').autocomplete=m==='in'?'current-password':'new-password'}
function openAuth(m){setMode(m);$('#authModal').hidden=false;setTimeout(()=>$(m==='up'?'#fName':'#fEmail').focus(),30)}
function closeAuth(){$('#authModal').hidden=true;afterAuth=null}
function requireAuth(cb){if(user)cb();else{afterAuth=cb;openAuth('up')}}
$('#tabIn').onclick=()=>setMode('in');$('#tabUp').onclick=()=>setMode('up');$('#authClose').onclick=closeAuth;
$('#authModal').addEventListener('click',e=>{if(e.target.id==='authModal')closeAuth()});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();$('#repModal').hidden=true}});
$$('[data-open]').forEach(b=>b.onclick=()=>openAuth(b.dataset.open==='signup'?'up':'in'));
$('#authForm').onsubmit=async e=>{
  e.preventDefault();const err=$('#authErr');err.textContent='';
  const email=$('#fEmail').value.trim().toLowerCase(),pw=$('#fPw').value,acc=store.get('dd_accounts',{});
  if(!/^\S+@\S+\.\S+$/.test(email)){err.textContent='Enter a valid email address.';return}
  if(mode==='up'){
    const name=$('#fName').value.trim();
    if(!name){err.textContent='Enter your name.';return}
    if(pw.length<8){err.textContent='Use a password of at least 8 characters.';return}
    if(acc[email]){err.textContent='That email already has an account here. Sign in instead.';return}
    acc[email]={name,org:$('#fOrg').value,role:$('#fRole').value,h:await sha(email+'|'+pw)};store.set('dd_accounts',acc);
    user={email,name,org:acc[email].org,role:acc[email].role};
  }else{
    const a=acc[email];
    if(!a||a.h!==await sha(email+'|'+pw)){err.textContent='Email or password does not match an account in this browser.';return}
    user={email,name:a.name,org:a.org,role:a.role};
  }
  store.set('dd_session',user);$('#authModal').hidden=true;$('#authForm').reset();renderAuth();const cb=afterAuth;afterAuth=null;if(cb)cb();
};
function renderAuth(){
  const area=$('#authArea');
  if(user){area.innerHTML=`<div class="chip-user"><span class="avatar">${esc(user.name.trim()[0]||'?').toUpperCase()}</span><span class="muted" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(user.name.split(' ')[0])}</span><button class="btn sm" id="outBtn">Sign out</button></div>`;$('#outBtn').onclick=()=>{user=null;store.set('dd_session',null);renderAuth()}}
  else{area.innerHTML=`<div class="right"><button class="btn sm" data-open="signin">Sign in</button><button class="btn pri sm" data-open="signup">Sign up</button></div>`;$$('[data-open]',area).forEach(b=>b.onclick=()=>openAuth(b.dataset.open==='signup'?'up':'in'))}
  document.body.classList.toggle('authed',!!user);
  $('#consoleWho').textContent=user?`Signed in as ${user.name} · ${user.role}, ${user.org}`:'Viewing sample data';
  $('#demoMsg').textContent=user?'You can save this explanation to your audit log or open a report.':'Saving and reports need a free account.';
}

/* console charts */
const WEEKS=Array.from({length:12},(_,i)=>'W'+(i+1));
const ENG=[120,135,150,148,170,181,190,204,210,226,238,251],REG=[0,0,10,22,41,60,88,115,140,172,198,231];
function lineChart(){
  const W=640,H=270,l=40,r=44,t=16,b=30,max=300,x=i=>l+i*(W-l-r)/11,y=v=>H-b-v/max*(H-t-b);
  let h='';
  for(let g=0;g<=max;g+=100)h+=`<line x1="${l}" x2="${W-r}" y1="${y(g)}" y2="${y(g)}" class="grid-l"/><text x="${l-8}" y="${y(g)+4}" class="ax" text-anchor="end">${g}</text>`;
  WEEKS.forEach((w,i)=>{if(i%2===0||i===11)h+=`<text x="${x(i)}" y="${H-8}" class="ax" text-anchor="middle">${w}</text>`});
  const path=d=>d.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
  h+=`<path d="${path(REG)} L${x(11)} ${y(0)} L${x(0)} ${y(0)} Z" style="fill:var(--c1);opacity:.14"/>`;
  h+=`<path class="draw" pathLength="1" d="${path(ENG)}" style="fill:none;stroke:var(--c3);stroke-width:2.5"/><path class="draw" pathLength="1" d="${path(REG)}" style="fill:none;stroke:var(--c1);stroke-width:2.5"/>`;
  h+=`<circle cx="${x(11)}" cy="${y(251)}" r="4.5" style="fill:var(--c3)"/><text x="${x(11)+8}" y="${y(251)-4}" class="ax" style="fill:var(--c3)">251</text><circle cx="${x(11)}" cy="${y(231)}" r="4.5" style="fill:var(--c1)"/><text x="${x(11)+8}" y="${y(231)+14}" class="ax" style="fill:var(--c1)">231</text>`;
  $('#lineSvg').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly explanations: English grows from 120 to 251, regional languages from 0 to 231 across 12 weeks (sample data)">${h}</svg>`;
}
const MIX=[['English',38,'--c3'],['Hindi',27,'--c1'],['Marathi',12,'--c2'],['Tamil',9,'--c4'],['Others',14,'--c5']];
function donut(){
  let off=0,h='';
  MIX.forEach(([n,v,c])=>{h+=`<circle r="15.915" cx="21" cy="21" fill="none" stroke-width="6" style="stroke:var(${c})" stroke-dasharray="${v-.6} ${100-v+.6}" stroke-dashoffset="${25-off}"/>`;off+=v});
  $('#donutSvg').innerHTML=`<svg viewBox="0 0 42 42" role="img" aria-label="Language mix of explanations (sample data)">${h}<text x="21" y="20.5" text-anchor="middle" style="font:600 6px var(--f-display);fill:var(--fg)">${100-MIX[0][1]}%</text><text x="21" y="26" text-anchor="middle" style="font:3px var(--f-mono);fill:var(--muted)">non-English</text></svg>`;
  $('#donutLeg').innerHTML=MIX.map(([n,v,c])=>`<span><i style="background:var(${c})"></i>${n} ${v}%</span>`).join('');
}
const DRV=[['Credit score',.31],['Debt-to-income',.26],['Credit history length',.14],['Recent credit enquiries',.09],['Income stability',.07]];
function drivers(){
  $('#drivers').innerHTML=DRV.map(([n,v])=>`<div class="r"><div class="top"><span>${n}</span><b class="mono">${v.toFixed(2)}</b></div><div class="bg"><div class="fg" data-w="${v/.31*100}" style="background:var(--c2)"></div></div></div>`).join('');
}
function updateKpis(){
  const te=ENG.reduce((a,b)=>a+b,0),tr=REG.reduce((a,b)=>a+b,0),mine=(store.get('dd_log',[])).length;
  $('#kpis').innerHTML=[[te+tr,'Explanations in 12 weeks (sample)'],[Math.round(tr/(te+tr)*100)+'%','Delivered in regional languages (sample)'],[3,'Regulator templates: RBI, IRDAI, SEBI'],[mine,'Saved by you in this browser']].map(([v,l])=>`<div class="kpi"><div class="v">${typeof v==='number'?v.toLocaleString('en-IN'):v}</div><div class="l">${l}</div></div>`).join('');
}
const SEED=[{id:'LN-19873',ts:'2026-10-02 10:14',out:'declined',lang:'hi',tpl:'RBI'},{id:'LN-19874',ts:'2026-10-02 10:31',out:'approved',lang:'en',tpl:'RBI'},{id:'UW-30211',ts:'2026-10-03 15:02',out:'declined',lang:'mr',tpl:'IRDAI'},{id:'LN-19902',ts:'2026-10-05 09:47',out:'approved',lang:'ta',tpl:'RBI'},{id:'UW-30240',ts:'2026-10-06 12:20',out:'approved',lang:'hi',tpl:'IRDAI'}].map(r=>({...r,h:fnv(r.id+r.lang+r.tpl)}));
function renderLog(){
  const rows=[...store.get('dd_log',[]),...SEED];
  $('#logBody').innerHTML=rows.map(r=>`<tr><td class="mono-cell">${esc(r.id)}${r.mine?'':' <span class="sample">sample</span>'}</td><td class="mono-cell">${esc(r.ts)}</td><td><span class="pill ${r.out==='declined'?'bad':'good'}">${r.out}</span></td><td>${langName[r.lang]}</td><td>${r.tpl}</td><td class="mono-cell">${r.h}</td></tr>`).join('');
}
$$('.tabs button').forEach(b=>b.onclick=()=>{$$('.tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));$('#tab-ov').hidden=b.dataset.tab!=='ov';$('#tab-log').hidden=b.dataset.tab!=='log'});

/* radar */
function radar(){
  const ax=['Indian templates','22 languages','DPDP handling','Pricing fit'],us=[1,1,1,1],them=[0,0,.5,0],cx=190,cy=150,R=100;
  const pt=(i,v)=>{const a=-Math.PI/2+i*Math.PI/2;return[cx+Math.cos(a)*R*v,cy+Math.sin(a)*R*v]};
  const poly=d=>d.map((v,i)=>pt(i,v).join(',')).join(' ');
  let h='';
  [.5,1].forEach(g=>h+=`<polygon points="${poly([g,g,g,g])}" style="fill:none;stroke:var(--line)"/>`);
  ax.forEach((n,i)=>{const[e1,e2]=pt(i,1),[lx,ly]=pt(i,1.2);h+=`<line x1="${cx}" y1="${cy}" x2="${e1}" y2="${e2}" style="stroke:var(--line)"/><text x="${lx}" y="${ly+4}" class="ax" text-anchor="${i===1?'start':i===3?'end':'middle'}">${n}</text>`});
  h+=`<polygon points="${poly(them)}" style="fill:var(--c5);fill-opacity:.3;stroke:var(--c5);stroke-width:2"/><polygon class="rp" points="${poly(us)}" style="fill:var(--saf);fill-opacity:.2;stroke:var(--saf);stroke-width:2"/>`;
  $('#radarSvg').innerHTML=`<svg viewBox="0 0 380 300" role="img" aria-label="Radar: we meet all four criteria; incumbents meet only DPDP partially">${h}</svg>`;
}

/* languages */
const LANGS=['English','Hindi','Marathi','Tamil','Telugu','Bengali','Gujarati','Kannada','Malayalam','Odia','Punjabi','Assamese','Urdu','Sanskrit','Konkani','Maithili','Nepali','Sindhi','Dogri','Kashmiri','Manipuri','Santali'];
$('#langGrid').innerHTML=LANGS.map((n,i)=>`<span class="${i===0?'live':''}">${n}<em>${i===0?'LIVE':'Q3'}</em></span>`).join('');

/* count up + reveal */
function count(el){const to=+el.dataset.count;if(reduce||to===0){el.textContent=to;return}let s=null;const d=1100;const f=t=>{s=s||t;const p=Math.min(1,(t-s)/d);el.textContent=Math.round(to*p);if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;const el=e.target;io.unobserve(el);
  el.classList.remove('rv-hide','pre');
  $$('[data-count]',el).forEach(count);if(el.dataset.count)count(el);
  $$('.fg',el).forEach(f=>f.style.width=f.dataset.w+'%');
  if(el.id==='road'){el.style.setProperty('--w','100%');el.style.setProperty('--h','100%')}
}),{threshold:.15});
$$('.rv,.chart').forEach(el=>{
  const r=el.getBoundingClientRect(),below=r.top>innerHeight*.9;
  if(el.classList.contains('chart'))el.classList.add('pre');
  if(el.classList.contains('rv')&&below&&!reduce)el.classList.add('rv-hide');
  io.observe(el);
});
$$('[data-count]').forEach(el=>{if(!el.closest('.rv'))io.observe(el)});
$$('.fg').forEach(f=>{if(reduce||!f.closest('.chart'))f.style.width=f.dataset.w+'%'});
setTimeout(()=>$$('.rv-hide').forEach(e=>{const r=e.getBoundingClientRect();if(r.top<innerHeight)e.classList.remove('rv-hide')}),2500);

/* init */
lineChart();donut();drivers();radar();updateKpis();renderLog();renderAuth();renderDemo();
})();
