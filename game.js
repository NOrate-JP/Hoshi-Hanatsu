firebase.initializeApp(FB);
const db=firebase.database();
const COL={R:'#e53935',B:'#1e88e5',Y:'#f9a825',G:'#43a047',P:'#8e24aa'},JP={R:'赤',B:'青',Y:'黄',G:'緑',P:'紫'},K='RBYGP';
const RACES={dwarf:['ドワーフ','選別','「ランダムに引く」で4枚引き、2枚を選んで配置(残りは捨て札)'],elf:['エルフ','誘引','「ランダムに引く」で3枚引き、3枚とも配置'],oni:['鬼人','技術','連続したスロットだけで流星魔法が揃うたび (枚数-2)点を即加点'],fairy:['妖精','除去','追加アクション「取り除く」で、自分の1枚に加えて他プレイヤー1人の最前1枚も取り除く'],mage:['魔法族','属性','自分のプレイヤーカラーと同じ色で発動すると、揃った枚数ぶん即加点'],goblin:['ゴブリン','運','各ターン1回目の魔法後、「1枚配置」で3枚引いて3枚配置'],human:['人族','基礎','基礎ポイントがすべて+1P'],beast:['獣人','連鎖','流星群ボーナスが2倍'],dragon:['竜人','節約','スロットが4列になり、基礎ポイントが2倍(開始時に4色を選ぶ)']};
const RK=Object.keys(RACES);
const RICON={dwarf:'⛏️',elf:'🍃',oni:'👹',fairy:'🧚',mage:'🔮',goblin:'🍀',human:'🛡️',beast:'🐺',dragon:'🐉'};
const rc=()=>K[Math.random()*5|0],rp=()=>rc()+rc(),cp=o=>JSON.parse(JSON.stringify(o));
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
let pickFor=null,viewRace=null,lastFx=null,fxUntil=0,suSel=[],selSet=[],backLobby=false,lastSev=null,jT=null,resReady=true,hideRes=false,uid,code,room,g,prev=null,lastEv=null,sel=0,mode='',asg=[],ps=-1,cpuT=null;
firebase.auth().signInAnonymously().then(r=>{uid=r.user.uid;render()}).catch(e=>{$('app').textContent='ログイン失敗: '+e.message});

/* ---------- ロビー ---------- */
function nm(){const v=$('nm').value.trim()||'名無し';localStorage.hn=v;return v}
function mk(){const n=nm();code=String(Math.random()*1e4|0).padStart(4,'0');
 db.ref('rooms/'+code).set({host:uid,players:{[uid]:{n,t:Date.now()}}}).then(listen)}
function jn(){const n=nm();code=$('cd').value.trim();
 db.ref('rooms/'+code).once('value').then(s=>{const r=s.val();
  if(!r){code=null;return alert('部屋がありません')}
  if(r.g&&r.g.ph!=='over'){code=null;return alert('ゲーム開始済みです')}
  if(Object.keys(r.players||{}).length>=5&&!r.players[uid]){code=null;return alert('満員です')}
  return db.ref('rooms/'+code+'/players/'+uid).set({n,t:Date.now()}).then(listen)})}
function listen(){db.ref('rooms/'+code).on('value',s=>{room=s.val();g=room&&room.g;render();cpuCheck();judgeCheck()})}
function addCpu(){if(Object.keys(room.players).length>=5)return;
 const c=Object.values(room.players).filter(p=>p.c).length+1;
 db.ref('rooms/'+code+'/players/cpu'+Date.now()).set({n:'CPU'+c,c:1,t:Date.now()})}
function toggleAdv(){db.ref('rooms/'+code+'/adv').set(room.adv?0:1)}
function setGoal(v){db.ref('rooms/'+code+'/goal').set(Math.max(5,Math.min(99,+v||20)))}
function setRmode(v){db.ref('rooms/'+code+'/rmode').set(v)}
function toggleDup(){db.ref('rooms/'+code+'/dup').set(room.dup?0:1)}
function toggleFx(){db.ref('rooms/'+code+'/fx').set(room.fx===0?1:0)}
function setPF(id){pickFor=id;viewRace=null;render()}
function pickRace(k){viewRace=k||null;if(!k){setRace(pickFor,'');return}
 const tk=!room.dup&&Object.entries(room.players).some(([id,q])=>id!==pickFor&&q.race===k);
 if(tk){render();return}
 setRace(pickFor,(room.players[pickFor]||{}).race===k?'':k)}
function setRace(id,v){db.ref('rooms/'+code+'/players/'+id+'/race').set(v)}
function start(){backLobby=false;hideRes=false;prev=null;lastEv=null;lastSev=null;suSel=[];selSet=[];
 const adv=!!room.adv,goal=Math.max(5,Math.min(99,+room.goal||20));
 const es=Object.entries(room.players).sort((a,b)=>a[1].t-b[1].t),dup=!!room.dup,used=[];
 const rs=es.map(([,p])=>{const w=room.rmode==='random'?'':(p.race||'');if(w&&(dup||!used.includes(w))){used.push(w);return w}return ''});
 rs.forEach((r,i)=>{if(!r){const pool=RK.filter(k=>dup||!used.includes(k));rs[i]=pool[Math.random()*pool.length|0];used.push(rs[i])}});
 const ps=es.map(([id,p],i)=>({id,name:p.n,cpu:p.c?1:0,race:adv?rs[i]:''}));
 for(let i=ps.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[ps[i],ps[j]]=[ps[j],ps[i]]}
 const b=ps.map(p=>p.race==='dragon'?(p.cpu?[...K].sort(()=>Math.random()-.5).slice(0,4):['','','','']):[...K]);
 const rd=ps.map(p=>p.race==='dragon'&&!p.cpu?0:1);
 db.ref('rooms/'+code+'/g').set({v:1,gid:Math.random(),bp:0,sb:0,ib:0,adv:adv?1:0,fx:room.fx===0?0:1,goal,pl:ps,b,rd,s:ps.map(()=>0),
  pc:[...K].sort(()=>Math.random()-.5).slice(0,ps.length).join(''),nx:[rp(),rp()],t:0,ph:rd.every(x=>x)?'pick':'setup',hand:'',bc:'',combo:0,push:'',log:'ゲーム開始！',win:-1})}
function suToggle(c){const k=suSel.indexOf(c);if(k>=0)suSel.splice(k,1);else if(suSel.length<4)suSel.push(c);render()}
function suOk(){if(suSel.length!==4)return;const me=g.pl.findIndex(p=>p.id===uid),cs=suSel.slice();suSel=[];
 db.ref('rooms/'+code+'/g').transaction(c=>{if(!c||c.ph!=='setup')return c;c.b[me]=cs;c.rd[me]=1;if(c.rd.every(x=>x))c.ph='pick';c.v++;return c})}
function toggleSel(k){const i=selSet.indexOf(k);if(i>=0)selSet.splice(i,1);else if(selSet.length<2)selSet.push(k);render()}
function keepOk(){if(selSet.length!==2||g.ph!=='sel')return;const n=gc();aKeep(n,selSet);selSet=[];commit(n)}
/* ---------- ゲームロジック ---------- */
const gc=()=>{const n=cp(g);n.q=n.q||[];n.mg=n.mg||[];return n};
const actor=n=>n.ph==='recv'?+n.q[0][0]:n.t;
function commit(n){n.v=g.v+1;const v=g.v;mode='';
 db.ref('rooms/'+code+'/g').transaction(c=>(c===null||c.v===v)?n:undefined)}
function hasMagic(n){const c={};n.b[n.t].forEach(x=>{if(x){const k=x[x.length-1];c[k]=(c[k]||0)+1}});return Object.values(c).some(v=>v>=3)}
const rcOf=n=>n.pl[n.t].race||'';
function after(n){if(hasMagic(n)){n.ph='judge';n.log=n.pl[n.t].name+'：流星魔法の判定…'}else judge(n)}
function judge(n){const b=n.b[n.t],cnt={};
 b.forEach(c=>{if(c){const x=c[c.length-1];cnt[x]=(cnt[x]||0)+1}});
 const col=Object.keys(cnt).find(k=>cnt[k]>=3);
 if(!col){if(n.push){n.ph='push';n.log=n.pl[n.t].name+'：押し付ける順番と相手を決める'}else endTurn(n);return}
 const m=cnt[col],r=rcOf(n),idx=[];b.forEach((c,i)=>{if(c&&c[c.length-1]===col)idx.push(i)});
 n.combo++;let bp=[0,0,0,1,3,10][m],sb=n.combo-1,im=0;
 if(r==='human')bp+=1;if(r==='dragon')bp*=2;if(r==='beast')sb*=2;
 if(r==='mage'&&n.pc[n.t]===col)im=m;
 if(r==='oni'&&idx[idx.length-1]-idx[0]===idx.length-1)im=m-2;
 n.bp+=bp;n.sb+=sb;n.ib=(n.ib||0)+im;n.s[n.t]+=im;n.push+=col;n.mg.push(col+m);
 idx.forEach(i=>{b[i]=b[i].slice(0,-1)});
 n.ev={id:Math.random(),p:n.t,c:col,m,b:bp,x:sb,r:im};
 n.log=n.pl[n.t].name+'：流星魔法！'+JP[col]+'×'+m;
 n.ph='bonus';n.bc='';n.fxid=0}
function endTurn(n){
 if(n.bp>0){const tot=n.bp+n.sb;n.s[n.t]+=tot;n.sev={id:Math.random(),p:n.t,bp:n.bp,sb:n.sb,tot,ib:n.ib||0};n.log=n.pl[n.t].name+'：合計 '+tot+'P 獲得！'}
 n.bp=0;n.sb=0;n.ib=0;n.fin=0;n.combo=0;n.push='';n.hand='';n.bc='';n.q=[];n.mg=[];n.fxid=0;
 if(n.t===n.pl.length-1&&n.s.some(x=>x>=n.goal)){n.ph='over';n.win=n.s.indexOf(Math.max(...n.s));return}
 n.t=(n.t+1)%n.pl.length;n.ph='pick'}
function aPick(n,i){let p='';const r=rcOf(n);
 if(i<0){const k=r==='dwarf'?4:r==='elf'?3:2;for(let j=0;j<k;j++)p+=rc()}else{p=n.nx[i];n.nx[i]=rp()}
 n.hand=p;if(i<0&&r==='dwarf'){n.ph='sel';n.log=n.pl[n.t].name+'：4枚から2枚を選ぶ'}else{n.ph='place';n.log=n.pl[n.t].name+'：カードを置く'}}
function aKeep(n,ix){n.hand=ix.slice().sort().map(k=>n.hand[k]).join('');n.ph='place';n.log=n.pl[n.t].name+'：カードを置く'}
function chance(n){const b=n.b[n.t],c={};b.forEach(x=>{if(x){const k=x[x.length-1];c[k]=(c[k]||0)+1}});
 return [...K].some(x=>{const k=c[x]||0;return k>=3||(k===2&&b.some(y=>!y||y[y.length-1]!==x))})}
function aFlip(n){n.bc=(rcOf(n)==='goblin'&&n.combo===1)?rc()+rc()+rc():rc();n.log=n.pl[n.t].name+'：山札をめくった！';if(n.fx&&n.combo>=3&&chance(n)){n.fxid=Math.random();n.fxc=n.bc}}
function aPlace(n,hi,col){if(hi<0||hi>=n.hand.length)return 0;
 const c=n.hand[hi];n.hand=n.hand.slice(0,hi)+n.hand.slice(hi+1);n.b[n.t][col]+=c;
 if(!n.hand)after(n);return 1}
function aBonusRemove(n,col){const b=n.b[n.t];if(!b[col])return 0;b[col]=b[col].slice(0,-1);if(rcOf(n)==='fairy'&&n.b.some((x,i)=>i!==n.t&&x.some(c=>c))){n.ph='fairy';n.log=n.pl[n.t].name+'：妖精の除去！ 他の人から1枚'}else after(n);return 1}
function aRemoveOther(n,pi,col){const b=n.b[pi];if(pi===n.t||!b[col])return 0;b[col]=b[col].slice(0,-1);after(n);return 1}
function aBonusPlace(n,col,k){k=k||0;const c=n.bc[k];n.bc=n.bc.slice(0,k)+n.bc.slice(k+1);n.b[n.t][col]+=c;if(!n.bc){n.fxid=0;after(n)}return 1}
function aPush(n,a){n.q=a.map(x=>x.to+x.c);n.push='';n.ph='recv';
 n.log=n.pl[n.t].name+'が押し付け！ '+n.pl[+n.q[0][0]].name+'：'+JP[n.q[0][1]]+'を置く'}
function aRecv(n,col){const it=n.q[0],to=+it[0];n.b[to][col]+=it[1];n.q=n.q.slice(1);
 if(!n.q.length){if(n.bp>0){n.ph='judge';n.fin=1;n.log='得点を集計…'}else endTurn(n)}
 else n.log=n.pl[+n.q[0][0]].name+'：押し付けられた'+JP[n.q[0][1]]+'を置く'}

/* ---------- CPU ---------- */
function maxSame(b){const o={};let m=0;b.forEach(c=>{if(c){const x=c[c.length-1];o[x]=(o[x]||0)+1;m=Math.max(m,o[x])}});return m}
function best(b,card){let bs=-1,cs=[];b.forEach((c,i)=>{const t=b.slice();t[i]=c+card;const m=maxSame(t);
 if(m>bs){bs=m;cs=[i]}else if(m===bs)cs.push(i)});return cs[Math.random()*cs.length|0]}
function cpuCheck(){clearTimeout(cpuT);if(!g||g.ph==='over'||g.ph==='judge'||g.ph==='setup'||room.host!==uid)return;
 const n=gc();if(!n.pl[actor(n)].cpu)return;
 const v=g.v;const w=Math.max(1200,fxUntil-Date.now()+600);cpuT=setTimeout(()=>{if(g&&g.v===v)cpuAct()},w)}
function cpuAct(){const n=gc(),b=n.b[n.t];
 if(n.ph==='pick'){const sc=n.nx.map(p=>{const t=b.slice();for(const ch of p){const i=best(t,ch);t[i]+=ch}return maxSame(t)});
  aPick(n,sc[0]>=sc[1]?0:1)}
 else if(n.ph==='place')aPlace(n,0,best(b,n.hand[0]));
 else if(n.ph==='fairy'){const c=n.pl.map((_,i)=>i).filter(i=>i!==n.t&&n.b[i].some(x=>x)).sort((a,b)=>n.s[b]-n.s[a])[0];aRemoveOther(n,c,n.b[c].findIndex(x=>x))}
 else if(n.ph==='sel'){let bs=-1,bi=[0,1];for(let x=0;x<4;x++)for(let y=x+1;y<4;y++){const t=b.slice();for(const k of[x,y]){const ch=n.hand[k];t[best(t,ch)]+=ch}const m=maxSame(t);if(m>bs){bs=m;bi=[x,y]}}aKeep(n,bi)}
 else if(n.ph==='bonus'){if(!n.bc)aFlip(n);else aBonusPlace(n,best(b,n.bc[0]),0)}
 else if(n.ph==='push'){const o=n.pl.map((_,i)=>i).filter(i=>i!==n.t).sort((a,c)=>n.s[c]-n.s[a]);
  aPush(n,[...n.push].map(c=>({c,to:o[0]})))}
 else if(n.ph==='recv'){const i=+n.q[0][0];aRecv(n,best(n.b[i],n.q[0][1]))}
 commit(n)}

function judgeCheck(){clearTimeout(jT);if(!g||g.ph!=='judge')return;
 const t=g.pl[g.t],run=t.cpu?room.host===uid:t.id===uid;if(!run)return;
 const v=g.v;jT=setTimeout(()=>{if(!g||g.v!==v||g.ph!=='judge')return;const n=gc();if(n.fin)endTurn(n);else judge(n);commit(n)},1000)}
function toLobby(){backLobby=true;hideRes=true;render()}
function toTitle(){db.ref('rooms/'+code).off();db.ref('rooms/'+code+'/players/'+uid).remove();
 clearTimeout(cpuT);clearTimeout(jT);code=null;room=null;g=null;prev=null;backLobby=false;hideRes=false;render()}
/* ---------- 操作 ---------- */
const myTurn=()=>g&&g.ph!=='over'&&g.pl[actor(gc())].id===uid;
function pk(i){if(!myTurn()||g.ph!=='pick')return;const n=gc();aPick(n,i);sel=0;commit(n)}
function flip(){if(!myTurn()||g.ph!=='bonus'||g.bc)return;const n=gc();aFlip(n);commit(n)}
function colClick(ci){if(!myTurn())return;const n=gc();
 if(g.ph==='place'){if(!aPlace(n,Math.min(sel,n.hand.length-1),ci))return;sel=0}
 else if(g.ph==='bonus'){if(g.bc){aBonusPlace(n,ci,Math.min(sel,g.bc.length-1));sel=0}else if(mode==='x'){if(!aBonusRemove(n,ci))return}else return}
 else if(g.ph==='recv')aRecv(n,ci);else return;
 commit(n)}
function colClick2(pi,ci){if(!myTurn()||g.ph!=='fairy')return;const n=gc();if(!aRemoveOther(n,pi,ci))return;commit(n)}
function setSel(i){sel=i;render()}
function setMode(m){mode=m;render()}
function selPush(i){if(asg.some(a=>a.i===i))return;ps=i;if(g.pl.length===2)giveTo(1-g.t);else render()}
function giveTo(to){if(ps<0)return;asg.push({i:ps,to,c:g.push[ps]});ps=-1;
 if(asg.length===g.push.length){const n=gc();aPush(n,asg);asg=[];commit(n)}else render()}
function resetAsg(){asg=[];ps=-1;render()}

/* ---------- 描画 ---------- */
const cardH=(x,cls,ex,pl)=>`<i class="cd ${cls||''}" style="--img:${pl?'none':`url('${CARD_IMG[x]}')`};--c:${COL[x]}" ${ex||''}>${CARD_LABEL&&!pl?`<b>${JP[x]}</b>`:''}</i>`;
function stockH(i,small){const n=gc(),o=[];let qi=0;const st='data-st="1"';
 if(g.ph==='setup'){if(!small&&g.pl[i].race==='dragon'&&!g.rd[i])[...K].forEach(c=>{const k=suSel.indexOf(c);o.push([c,k>=0?'sel':'',`onclick="suToggle('${c}')"`,k>=0?k+1:''])})}
 else if(g.ph==='sel'&&i===g.t)[...g.hand].forEach((x,k)=>o.push([x,!small&&selSet.includes(k)?'sel':'',!small?`onclick="toggleSel(${k})"`:'','']));
 else if(g.ph==='place'&&i===g.t)[...g.hand].forEach((x,k)=>o.push([x,!small&&sel===k?'sel':'',!small?`onclick="setSel(${k})"`:'','']));
 else if(g.ph==='bonus'&&i===g.t){[...(g.bc||'')].forEach((x,k)=>o.push([x,(!small&&sel===k?'sel ':'')+'cur',!small?`onclick="setSel(${k})"`:'','']))}
 else if(g.ph==='push'&&i===g.t)[...g.push].forEach((x,k)=>{const d=asg.findIndex(a=>a.i===k);o.push([x,(ps===k?'sel ':'')+(d>=0?'dim':''),st+(!small?` onclick="selPush(${k})"`:''),d>=0?d+1:''])});
 else if(g.ph==='recv')n.q.forEach((it,k)=>{if(+it[0]===i){qi++;o.push([it[1],k===0?'cur':'','',qi])}});
 return `<div class="stock">`+o.map(([x,c,e,bd])=>`<span class="sk">${cardH(x,c,e,small)}${bd?`<em>${bd}</em>`:''}</span>`).join('')+`</div>`}
function mgH(i,small){const e=i===g.t?gc().mg:[];
 return `<div class="mg">`+e.map(s=>`<span class="mgp">${Array.from({length:+s[1]},()=>cardH(s[0],'','',small)).join('')}<b>×${s[1]}</b></span>`).join('')+`</div>`}
function boardH(i,small){const b=g.b[i],me=g.pl[i].id===uid,a=actor(gc()),pc=(g.pc||K)[i],r=g.pl[i].race,n=gc();
 const ok=!small&&me&&myTurn()&&(g.ph==='place'||g.ph==='recv'||(g.ph==='bonus'&&(g.bc||mode==='x')));
 const ok2=small&&myTurn()&&g.ph==='fairy';
 return `<div class="bd ${small?'sm':'big'} ${i===g.t&&g.ph!=='over'?'turn':''} ${i===a&&g.ph!=='over'?'act':''}" style="--pc:${COL[pc]}"><div class="plate"><span class="gem"></span><span class="pn">${esc(g.pl[i].name)}${g.pl[i].cpu?' (CPU)':''}${r?`<small>${RACES[r][0]}【${RACES[r][1]}】</small>`:''}</span><span class="sc" data-sc="${i}">${g.s[i]}<small>点</small></span></div>${mgH(i,small)}${stockH(i,small)}<div class="cols">`+
 b.map((c,ci)=>`<div class="col ${ok||(ok2&&c)?'ok':''}" ${ok?`onclick="colClick(${ci})"`:ok2&&c?`onclick="colClick2(${i},${ci})"`:''}>`+[...c].map((x,k)=>cardH(x,'',`data-k="${i}-${ci}-${k}"`,small)).join('')+`</div>`).join('')+`</div></div>`}
function snap(){const m={};document.querySelectorAll('[data-k]').forEach(e=>{m[e.dataset.k]={r:e.getBoundingClientRect(),n:e.cloneNode(true)}});return m}
function ghost(d){const e=d.n;e.classList.remove('new','bt');e.classList.add('ghost');
 e.style.left=d.r.left+'px';e.style.top=d.r.top+'px';e.style.width=d.r.width+'px';e.style.height=d.r.height+'px';
 document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
function burst(col,k){for(let i=0;i<k;i++){const e=document.createElement('span');e.className='star';e.textContent='★';e.style.color=col;
  const a=Math.random()*6.28,r=120+Math.random()*200;
  e.style.setProperty('--dx',Math.cos(a)*r+'px');e.style.setProperty('--dy',Math.sin(a)*r+'px');
  document.body.appendChild(e);setTimeout(()=>e.remove(),1150)}}
function banner(ev){const d=document.createElement('div');d.className='banner';d.style.borderColor=COL[ev.c];
 d.innerHTML=`<div class="t">★ 流星魔法 ★</div><div>${esc(g.pl[ev.p].name)}：${JP[ev.c]}×${ev.m}</div><div class="b2">基礎 +${ev.b}P ／ 流星群ボーナス +${ev.x}P</div>${ev.r?`<div class="b2">種族技能 +${ev.r}P 即加点</div>`:''}`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),1750);burst(COL[ev.c],14)}
function tallyBanner(e){const d=document.createElement('div');d.className='banner long';d.style.borderColor='#e8d9a0';
 d.innerHTML=`<div class="t">${esc(g.pl[e.p].name)} の獲得</div><div class="bl"><span>基礎ポイント</span><b>${e.bp}P</b></div><div class="bl"><span>流星群ボーナス</span><b>${e.sb}P</b></div><div class="bl tot"><span>合計</span><b>${e.tot}P</b></div>${e.ib?`<div class="b2">＋種族技能 ${e.ib}P(加点済)</div>`:''}`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),2750);burst('#e8d9a0',26)}
function flipFx(cs){cs=[...cs];const d=document.createElement('div');d.className='fx';
 d.innerHTML=`<div class="fxt">山札をめくる…！</div><div class="fxr">`+cs.map((x,k)=>`<div class="fxc" style="--k:${k}"><div class="fxi"><div class="fxb"></div><div class="fxf" style="--img:url('${CARD_IMG[x]}');--c:${COL[x]}">${CARD_LABEL?JP[x]:''}</div></div></div>`).join('')+`</div><div class="fxs">コンボのチャンス！</div>`;
 document.body.appendChild(d);const dur=1500+700+(cs.length-1)*600+1000;fxUntil=Date.now()+dur;setTimeout(()=>d.remove(),dur);
 cs.forEach((x,k)=>setTimeout(()=>burst(COL[x],10),1500+k*600+400))}
function animate(old){
 if(prev&&prev.v!==g.v&&prev.pl.length===g.pl.length)g.s.forEach((v,i)=>{if(prev.s[i]!==v){const e=document.querySelector('[data-sc="'+i+'"]');e&&e.classList.add('pop')}});
 if(prev&&prev.v!==g.v&&prev.pl.length===g.pl.length)
  g.b.forEach((bd,p)=>bd.forEach((s,c)=>{const o=(prev.b[p]||[])[c]||'';
   if(s.length>o.length&&s.startsWith(o)){for(let k=o.length;k<s.length;k++){const e=document.querySelector(`[data-k="${p}-${c}-${k}"]`);e&&e.classList.add('new')}}
   else if(o.length>s.length&&o.startsWith(s)){for(let k=s.length;k<o.length;k++){const d=old[p+'-'+c+'-'+k];d&&ghost(d)}}}));
 if(prev&&prev.v!==g.v&&(g.push||'').length>(prev.push||'').length){const e=[...document.querySelectorAll('[data-st]')].pop();e&&e.classList.add('new')}
 if(!prev){lastEv=g.ev&&g.ev.id;lastSev=g.sev&&g.sev.id;lastFx=g.fxid||null}
 else{if(g.ev&&g.ev.id!==lastEv){lastEv=g.ev.id;banner(g.ev)}
  if(g.sev&&g.sev.id!==lastSev){lastSev=g.sev.id;tallyBanner(g.sev)}
  if(g.fxid&&g.fxid!==lastFx){lastFx=g.fxid;flipFx(g.fxc)}}}
function resultH(){const r=g.pl.map((p,i)=>({i,s:g.s[i]})).sort((x,y)=>y.s-x.s||x.i-y.i),N=r.length;
 return `<div class="result"><div class="rbox"><div class="rt">— RESULT —</div><div class="rh">${esc(g.pl[r[0].i].name)} の勝利！</div>`+
 r.map((o,k)=>`<div class="rr${k?'':' top'}" style="--pc:${COL[(g.pc||K)[o.i]]};--d:${N-1-k}"><span class="rk">${k+1}<small>位</small></span><span class="gem"></span><span class="rn">${esc(g.pl[o.i].name)}${g.pl[o.i].cpu?' (CPU)':''}</span><span class="rs">${o.s}<small>点</small></span></div>`).join('')+
 `<div class="rb"><button onclick="hideRes=true;render()">盤面を見る</button><button class="pri" onclick="toLobby()">ロビーに戻る</button><button class="g" onclick="toTitle()">タイトルに戻る</button></div></div></div>`}
function sumH(){const me=g.pl.findIndex(p=>p.id===uid),r=me>=0?(g.pl[me].race||''):'';
 const bp=m=>{let b=[0,0,0,1,3,10][m];if(r==='human')b+=1;if(r==='dragon')b*=2;return b},sb=k=>(k-1)*(r==='beast'?2:1);
 return `<div class="panel sum"><div class="ttl">◆ 得点ルール <small>${g.goal}点で最終ターン</small></div><div class="rtab"><div><b>基礎ポイント</b>${[3,4,5].filter(m=>!(r==='dragon'&&m===5)).map(m=>`<span>${m}枚 <i>${bp(m)}P</i></span>`).join('')}</div><div><b>流星群ボーナス</b>${[1,2,3,4].map(k=>`<span>${k}回目 <i>${sb(k)}P</i></span>`).join('')}<span>…</span></div></div><div class="hint2">連鎖が終わり、押し付けた星を全員が置き終えたら合計を加点</div>`+(r?`<div class="rsk"><b>${RACES[r][0]}【${RACES[r][1]}】</b><br>${RACES[r][2]}</div>`:'')+`</div>`}
function orderH(a){return `<div class="order">`+g.pl.map((p,i)=>`<span class="od ${i===a&&g.ph!=='over'?'cur':''}" style="--pc:${COL[(g.pc||K)[i]]}"><span class="gem"></span><small>${esc(p.name)}</small></span>`).join('<span class="ar">→</span>')+`</div>`}
const titleH=(small,c)=>small?`<div class="mini">星を放つ夜<span>MeteoNight ONLINE</span><em class="rc">${c}</em></div>`:`<div class="hero"><div class="dia">◆ ━━━ ◇ ━━━ ◆</div><h1 class="title">星を放つ夜</h1><div class="sub">MeteoNight&nbsp;ONLINE</div></div>`;
function render(){const A=$('app');
 if(!uid)return;
 if(!code){A.innerHTML=titleH(0)+`<div class="panel entry"><label>なまえ</label><input id="nm" value="${esc(localStorage.hn||'')}" maxlength="10"><br><button class="pri" onclick="mk()">部屋をつくる</button><div class="or">─ または ─</div><label>部屋コード</label><input id="cd" size="6" inputmode="numeric"><br><button onclick="jn()">参加する</button></div>`;return}
 if(!room){A.textContent='読み込み中…';return}
 if(backLobby&&g&&g.ph!=='over')backLobby=false;
 if(!g||backLobby){prev=null;const ps=Object.entries(room.players||{}).sort((a,b)=>a[1].t-b[1].t),host=room.host===uid,adv=!!room.adv,goal=room.goal||20,rm=room.rmode==='random'?'random':'free',dup=!!room.dup,fx=room.fx!==0;
  const ce=ps.find(([k])=>k===pickFor);if(!ce||!(pickFor===uid||(ce[1].c&&host)))pickFor=uid;
  const pf=(room.players||{})[pickFor]||{},mine=pf.race||'',vk=viewRace||mine,fr=adv&&rm==='free';
  const seats=[0,1,2,3,4].map(i=>{const e=ps[i];if(!e)return `<div class="seat"><span class="gem off"></span>空席</div>`;const [id,p]=e,can=id===uid||(p.c&&host);
   return `<div class="seat on ${fr&&id===pickFor?'pf':''}" ${fr&&can?`onclick="setPF('${id}')"`:''}><span class="gem" style="--pc:#e8d9a0"></span><span class="sn2">${esc(p.n)}${p.c?' <small>CPU</small>':''}</span>${adv?(rm==='random'?'<small>開始時に決定</small>':`<small>${p.race?RACES[p.race][0]+'【'+RACES[p.race][1]+'】':'ランダム'}</small>`):''}</div>`}).join('');
  const tiles=fr?`<div class="ttl">◆ 種族選択 <small>${esc(pf.n||'')} の種族${pickFor!==uid?'(CPU)':''}</small></div><div class="rsel">`+RK.map(k=>{const hs=ps.filter(([,q])=>q.race===k).map(([,q])=>esc(q.n)),tk=!dup&&ps.some(([id,q])=>id!==pickFor&&q.race===k);
   return `<div class="rt3 ${mine===k?'mine':''} ${tk?'taken':''}" onclick="pickRace('${k}')"><div class="ic">${RICON[k]}</div><b>${RACES[k][0]}</b><small>${RACES[k][1]}</small>${hs.length?`<span class="tg">${hs.join(',')}</span>`:''}</div>`}).join('')+`</div><div class="rdesc">${vk?`<b>${RACES[vk][0]}【${RACES[vk][1]}】</b> ${RACES[vk][2]}`:'ランダム：開始時に決まります'}</div><button class="g" onclick="pickRace('')">ランダムにする</button>`:(adv?'<div class="hint">種族は開始時にランダムで決まります</div>':'');
  A.innerHTML=titleH(0)+`<div class="panel lobby"><div class="ttl">◆ 部屋コード ◆</div><div class="code">${code}</div><div class="hint">このコードを仲間に伝えよう</div>`+
  `<div class="opts"><div>アドバンスルール <button class="${adv?'pri':'g'}" ${host?'':'disabled'} onclick="toggleAdv()">${adv?'ON':'OFF'}</button></div><div>めくり演出 <button class="${fx?'pri':'g'}" ${host?'':'disabled'} onclick="toggleFx()">${fx?'ON':'OFF'}</button></div><div>終了点数 <input type="number" min="5" max="99" value="${goal}" ${host?'':'disabled'} onchange="setGoal(this.value)"> 点</div></div>`+
  (adv?`<div class="opts"><div>種族 <button class="${rm==='free'?'pri':'g'}" ${host?'':'disabled'} onclick="setRmode('free')">自由に選択</button><button class="${rm==='random'?'pri':'g'}" ${host?'':'disabled'} onclick="setRmode('random')">全員ランダム</button></div><div>重複 <button class="${dup?'pri':'g'}" ${host?'':'disabled'} onclick="toggleDup()">${dup?'あり':'なし'}</button></div></div>`:'')+
  `<div class="seats">${seats}</div>${tiles}<div style="margin-top:10px"></div>`+
  (host?`<button class="g" onclick="addCpu()">CPUを追加</button><button class="pri" onclick="start()" ${ps.length<2?'disabled':''}>ゲーム開始</button>`:'<div class="hint">ホストの開始を待っています…</div>')+`<br><button class="g" onclick="toTitle()">タイトルに戻る</button></div>`;return}
 if(prev&&prev.gid!==g.gid){prev=null;lastEv=null;lastSev=null;lastFx=null;hideRes=false;resReady=true}
 if(prev&&prev.ph!=='over'&&g.ph==='over'&&prev.v!==g.v){resReady=false;setTimeout(()=>{resReady=true;render()},2900)}
 const me=g.pl.findIndex(p=>p.id===uid),mt=myTurn(),n=gc(),a=actor(n),an=esc(g.pl[a].name);
 let tt,mx='',mb='';
 if(g.ph==='over'){tt='ゲーム終了';mx='全員の手番が終わりました';mb=`<button class="pri" onclick="hideRes=false;render()">結果を見る</button><button onclick="toLobby()">ロビーに戻る</button><button class="g" onclick="toTitle()">タイトルに戻る</button>`}
 else if(g.ph==='setup'){tt='準備中';const sd=me>=0&&g.pl[me].race==='dragon'&&!g.rd[me];mx=sd?'竜人：置く4色を左の列から順にタップして選んでください':'竜人が色を選んでいます…';if(sd)mb=`<button class="pri" ${suSel.length===4?'':'disabled'} onclick="suOk()">この4色で開始</button>`}
 else{tt=mt?'あなたの番':an+' の番';
  if(g.ph==='pick')mx=mt?'ネクストスロットから星を1組えらんでください':'星を選んでいます…';
  else if(g.ph==='fairy')mx=mt?'妖精：他プレイヤーの盤面の一番下を1枚選んでください(盤面をタップ)':'妖精の除去中…';
  else if(g.ph==='sel'){mx=mt?'4枚から配置する2枚を選んでください(残りは捨て札)':'カードを選別しています…';if(mt)mb=`<button class="pri" ${selSet.length===2?'':'disabled'} onclick="keepOk()">この2枚を配置する</button>`}
  else if(g.ph==='place')mx=mt?'ストックの星を選んで、置く列をタップしてください':'星を置いています…';
  else if(g.ph==='judge')mx=n.fin?'得点を集計しています…':'流星魔法の判定中…';
  else if(g.ph==='bonus'){mx=mt?(g.bc?'めくれた星を置く列をタップしてください':'魔法ボーナス！ 山札をめくるか、一番下を除外'):'魔法ボーナスを選んでいます…';
   if(mt&&!g.bc)mb=`<button class="${mode==='x'?'':'g'}" onclick="setMode('x')">${rcOf(n)==='fairy'?'一番下を除外(自分1枚+他の人1枚)':'一番下を除外(列をタップ)'}</button><button onclick="flip()">山札から${rcOf(n)==='goblin'&&n.combo===1?3:1}枚めくる</button>`}
  else if(g.ph==='push'){mx=mt?'ストックの星を、渡す順にタップ'+(g.pl.length>2?' → 相手を選ぶ':''):'星を押し付けています…';
   if(mt)mb=(g.pl.length>2?g.pl.map((p,i)=>i===g.t?'':`<button onclick="giveTo(${i})">${esc(p.name)}</button>`).join(''):'')+`<button class="g" onclick="resetAsg()">やり直し</button>`}
  else if(g.ph==='recv')mx=mt?'押し付けられた星を置く列をタップしてください':'押し付けられた星を置いています…'}
 const tl=n.bp>0&&g.ph!=='over'?`<div class="tally"><div class="tl">今回の獲得ポイント</div><div><span>基礎ポイント</span><b>${n.bp}P</b></div><div><span>流星群ボーナス</span><b>${n.sb}P</b></div><div class="tot"><span>合計</span><b>${n.bp+n.sb}P</b></div>${n.ib>0?`<div><span>種族技能(加点済)</span><b>${n.ib}P</b></div>`:''}</div>`:'';
 const others=g.pl.map((_,i)=>i===me?'':boardH(i,1)).join('');
 const can=mt&&g.ph==='pick',dis=can?'':'disabled';
 const old=snap();
 A.innerHTML=titleH(1,code)+`<div class="game"><div class="gl"><div class="panel nx"><div class="ttl">◆ ネクストスロット</div>${g.nx.map((p,i)=>`<span class="pair">${[...p].map(x=>cardH(x)).join('')}<button ${dis} onclick="pk(${i})">選ぶ</button></span>`).join('')}<button class="g" ${dis} onclick="pk(-1)">ランダムで引く</button></div>${me>=0?boardH(me,0):''}${sumH()}</div>`+
 `<div class="gr"><div class="panel msg ${mt?'mine':''}"><div class="mt">${tt}</div><div class="mx">${mx}</div><div class="mb">${mb}</div>${tl}<div class="lg">${esc(g.log)}</div></div>${orderH(a)}<div class="others n${g.pl.length-1}">${others}</div></div></div>`+
 (g.ph==='over'&&!hideRes&&resReady?resultH():'');
 animate(old);prev=g}
