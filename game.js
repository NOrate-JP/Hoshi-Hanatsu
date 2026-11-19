firebase.initializeApp(FB);
const db=firebase.database();
const COL={R:'#e53935',B:'#1e88e5',Y:'#f9a825',G:'#43a047',P:'#8e24aa'},JP={R:'赤',B:'青',Y:'黄',G:'緑',P:'紫'},K='RBYGP';
const rc=()=>K[Math.random()*5|0],rp=()=>rc()+rc(),cp=o=>JSON.parse(JSON.stringify(o));
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
let uid,code,room,g,prev=null,lastEv=null,sel=0,mode='',asg=[],ps=-1,cpuT=null;
firebase.auth().signInAnonymously().then(r=>{uid=r.user.uid;render()}).catch(e=>{$('app').textContent='ログイン失敗: '+e.message});

/* ---------- ロビー ---------- */
function nm(){const v=$('nm').value.trim()||'名無し';localStorage.hn=v;return v}
function mk(){const n=nm();code=String(Math.random()*1e4|0).padStart(4,'0');
 db.ref('rooms/'+code).set({host:uid,players:{[uid]:{n,t:Date.now()}}}).then(listen)}
function jn(){const n=nm();code=$('cd').value.trim();
 db.ref('rooms/'+code).once('value').then(s=>{const r=s.val();
  if(!r){code=null;return alert('部屋がありません')}
  if(r.g){code=null;return alert('ゲーム開始済みです')}
  if(Object.keys(r.players||{}).length>=5&&!r.players[uid]){code=null;return alert('満員です')}
  return db.ref('rooms/'+code+'/players/'+uid).set({n,t:Date.now()}).then(listen)})}
function listen(){db.ref('rooms/'+code).on('value',s=>{room=s.val();g=room&&room.g;render();cpuCheck()})}
function addCpu(){if(Object.keys(room.players).length>=5)return;
 const c=Object.values(room.players).filter(p=>p.c).length+1;
 db.ref('rooms/'+code+'/players/cpu'+Date.now()).set({n:'CPU'+c,c:1,t:Date.now()})}
function start(){const ps=Object.entries(room.players).sort((a,b)=>a[1].t-b[1].t).map(([id,p])=>({id,name:p.n,cpu:p.c?1:0}));
 for(let i=ps.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[ps[i],ps[j]]=[ps[j],ps[i]]}
 db.ref('rooms/'+code+'/g').set({v:1,pl:ps,b:ps.map(()=>[...K]),s:ps.map(()=>0),
  nx:[rp(),rp()],t:0,ph:'pick',hand:'',bc:'',combo:0,push:'',log:'ゲーム開始！',win:-1})}

/* ---------- ゲームロジック ---------- */
const gc=()=>{const n=cp(g);n.q=n.q||[];return n};
const actor=n=>n.ph==='recv'?+n.q[0][0]:n.t;
function commit(n){n.v=g.v+1;const v=g.v;mode='';
 db.ref('rooms/'+code+'/g').transaction(c=>(c===null||c.v===v)?n:undefined)}
function judge(n){const b=n.b[n.t],cnt={};
 b.forEach(c=>{if(c){const x=c[c.length-1];cnt[x]=(cnt[x]||0)+1}});
 const col=Object.keys(cnt).find(k=>cnt[k]>=3);
 if(!col){if(n.push){n.ph='push';n.log=n.pl[n.t].name+'：押し付ける順番と相手を決める'}else endTurn(n);return}
 const m=cnt[col];n.combo++;const pt=[0,0,0,1,3,10][m]+n.combo-1;n.s[n.t]+=pt;n.push+=col;
 b.forEach((c,i)=>{if(c&&c[c.length-1]===col)b[i]=c.slice(0,-1)});
 n.ev={id:Math.random(),p:n.t,c:col,m,cb:n.combo,pt};
 n.log=n.pl[n.t].name+'：流星魔法！'+JP[col]+'×'+m+'（'+n.combo+'コンボ +'+pt+'点）';
 n.ph='bonus';n.bc=''}
function endTurn(n){n.combo=0;n.push='';n.hand='';n.bc='';n.q=[];
 if(n.t===n.pl.length-1&&n.s.some(x=>x>=20)){n.ph='over';n.win=n.s.indexOf(Math.max(...n.s));return}
 n.t=(n.t+1)%n.pl.length;n.ph='pick'}
function aPick(n,i){let p;if(i<0)p=rp();else{p=n.nx[i];n.nx[i]=rp()}
 n.hand=p;n.ph='place';n.log=n.pl[n.t].name+'：カードを置く'}
function aPlace(n,hi,col){if(hi<0||hi>=n.hand.length)return 0;
 const c=n.hand[hi];n.hand=n.hand.slice(0,hi)+n.hand.slice(hi+1);n.b[n.t][col]+=c;
 if(!n.hand)judge(n);return 1}
function aBonusRemove(n,col){const b=n.b[n.t];if(!b[col])return 0;b[col]=b[col].slice(0,-1);judge(n);return 1}
function aBonusPlace(n,col){n.b[n.t][col]+=n.bc;n.bc='';judge(n);return 1}
function aPush(n,a){n.q=a.map(x=>x.to+x.c);n.push='';n.ph='recv';
 n.log=n.pl[n.t].name+'が押し付け！ '+n.pl[+n.q[0][0]].name+'：'+JP[n.q[0][1]]+'を置く'}
function aRecv(n,col){const it=n.q[0],to=+it[0];n.b[to][col]+=it[1];n.q=n.q.slice(1);
 if(!n.q.length)endTurn(n);else n.log=n.pl[+n.q[0][0]].name+'：押し付けられた'+JP[n.q[0][1]]+'を置く'}

/* ---------- CPU ---------- */
function maxSame(b){const o={};let m=0;b.forEach(c=>{if(c){const x=c[c.length-1];o[x]=(o[x]||0)+1;m=Math.max(m,o[x])}});return m}
function best(b,card){let bs=-1,cs=[];b.forEach((c,i)=>{const t=b.slice();t[i]=c+card;const m=maxSame(t);
 if(m>bs){bs=m;cs=[i]}else if(m===bs)cs.push(i)});return cs[Math.random()*cs.length|0]}
function cpuCheck(){clearTimeout(cpuT);if(!g||g.ph==='over'||room.host!==uid)return;
 const n=gc();if(!n.pl[actor(n)].cpu)return;
 const v=g.v;cpuT=setTimeout(()=>{if(g&&g.v===v)cpuAct()},1200)}
function cpuAct(){const n=gc(),b=n.b[n.t];
 if(n.ph==='pick'){const sc=n.nx.map(p=>{const t=b.slice();for(const ch of p){const i=best(t,ch);t[i]+=ch}return maxSame(t)});
  aPick(n,sc[0]>=sc[1]?0:1)}
 else if(n.ph==='place')aPlace(n,0,best(b,n.hand[0]));
 else if(n.ph==='bonus'){if(!n.bc)n.bc=rc();else aBonusPlace(n,best(b,n.bc))}
 else if(n.ph==='push'){const o=n.pl.map((_,i)=>i).filter(i=>i!==n.t).sort((a,c)=>n.s[c]-n.s[a]);
  aPush(n,[...n.push].map(c=>({c,to:o[0]})))}
 else if(n.ph==='recv'){const i=+n.q[0][0];aRecv(n,best(n.b[i],n.q[0][1]))}
 commit(n)}

/* ---------- 操作 ---------- */
const myTurn=()=>g&&g.ph!=='over'&&g.pl[actor(gc())].id===uid;
function pk(i){if(!myTurn()||g.ph!=='pick')return;const n=gc();aPick(n,i);sel=0;commit(n)}
function flip(){if(!myTurn()||g.ph!=='bonus'||g.bc)return;const n=gc();n.bc=rc();n.log=n.pl[n.t].name+'：山札をめくった！';commit(n)}
function colClick(ci){if(!myTurn())return;const n=gc();
 if(g.ph==='place'){if(!aPlace(n,Math.min(sel,n.hand.length-1),ci))return;sel=0}
 else if(g.ph==='bonus'){if(g.bc)aBonusPlace(n,ci);else if(mode==='x'){if(!aBonusRemove(n,ci))return}else return}
 else if(g.ph==='recv')aRecv(n,ci);else return;
 commit(n)}
function setSel(i){sel=i;render()}
function setMode(m){mode=m;render()}
function selPush(i){if(asg.some(a=>a.i===i))return;ps=i;if(g.pl.length===2)giveTo(1-g.t);else render()}
function giveTo(to){if(ps<0)return;asg.push({i:ps,to,c:g.push[ps]});ps=-1;
 if(asg.length===g.push.length){const n=gc();aPush(n,asg);asg=[];commit(n)}else render()}
function resetAsg(){asg=[];ps=-1;render()}

/* ---------- 描画 ---------- */
const cardH=(x,cls,ex)=>`<i class="cd ${cls||''}" style="--img:url('${CARD_IMG[x]}');--c:${COL[x]}" ${ex||''}>${CARD_LABEL?`<b>${JP[x]}</b>`:''}</i>`;
function boardH(i,small){const b=g.b[i],me=g.pl[i].id===uid,a=actor(gc());
 const ok=!small&&me&&myTurn()&&(g.ph==='place'||g.ph==='recv'||(g.ph==='bonus'&&(g.bc||mode==='x')));
 return `<div class="bd ${small?'sm':'big'} ${i===g.t&&g.ph!=='over'?'turn':''} ${i===a&&g.ph!=='over'?'act':''}"><div class="nm">${esc(g.pl[i].name)}${g.pl[i].cpu?'(CPU)':''} <b>${g.s[i]}点</b></div><div class="cols">`+
 b.map((c,ci)=>`<div class="col ${ok?'ok':''}" ${ok?`onclick="colClick(${ci})"`:''}>`+[...c].map((x,k)=>cardH(x,k===c.length-1?'bt':'',`data-k="${i}-${ci}-${k}"`)).join('')+`</div>`).join('')+`</div></div>`}
function snap(){const m={};document.querySelectorAll('[data-k]').forEach(e=>{m[e.dataset.k]={r:e.getBoundingClientRect(),n:e.cloneNode(true)}});return m}
function ghost(d){const e=d.n;e.classList.remove('new','bt');e.classList.add('ghost');
 e.style.left=d.r.left+'px';e.style.top=d.r.top+'px';e.style.width=d.r.width+'px';e.style.height=d.r.height+'px';
 document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
function banner(ev){const d=document.createElement('div');d.className='banner';d.style.borderColor=COL[ev.c];
 d.innerHTML=`<div class="t">★ 流星魔法 ★</div><div>${esc(g.pl[ev.p].name)}：${JP[ev.c]}×${ev.m}</div><div>${ev.cb}コンボ　+${ev.pt}点</div>`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),1750);
 for(let i=0;i<18;i++){const s=document.createElement('span');s.className='star';s.textContent='★';s.style.color=COL[ev.c];
  const a=Math.random()*6.28,r=120+Math.random()*180;
  s.style.setProperty('--dx',Math.cos(a)*r+'px');s.style.setProperty('--dy',Math.sin(a)*r+'px');
  document.body.appendChild(s);setTimeout(()=>s.remove(),1150)}}
function animate(old){
 if(prev&&prev.v!==g.v&&prev.pl.length===g.pl.length)
  g.b.forEach((bd,p)=>bd.forEach((s,c)=>{const o=(prev.b[p]||[])[c]||'';
   if(s.length>o.length&&s.startsWith(o)){for(let k=o.length;k<s.length;k++){const e=document.querySelector(`[data-k="${p}-${c}-${k}"]`);e&&e.classList.add('new')}}
   else if(o.length>s.length&&o.startsWith(s)){for(let k=s.length;k<o.length;k++){const d=old[p+'-'+c+'-'+k];d&&ghost(d)}}}));
 if(!prev)lastEv=g.ev&&g.ev.id;
 else if(g.ev&&g.ev.id!==lastEv){lastEv=g.ev.id;banner(g.ev)}}
function render(){const A=$('app');
 if(!uid)return;
 if(!code){A.innerHTML=`<h2>星を放つ夜 ONLINE</h2><div class="box">名前 <input id="nm" value="${esc(localStorage.hn||'')}" maxlength="10"><br><button onclick="mk()">部屋を作る</button><br>部屋コード <input id="cd" size="6" inputmode="numeric"><button onclick="jn()">参加</button></div>`;return}
 if(!room){A.textContent='読み込み中…';return}
 if(!g){prev=null;const ps=Object.entries(room.players).sort((a,b)=>a[1].t-b[1].t),host=room.host===uid;
  A.innerHTML=`<h2>部屋コード：${code}</h2><div class="box">参加者(${ps.length}/5)<br>${ps.map(([,p])=>esc(p.n)+(p.c?'(CPU)':'')).join(' ／ ')}</div>`+
  (host?`<button class="g" onclick="addCpu()">CPUを追加</button><button onclick="start()" ${ps.length<2?'disabled':''}>ゲーム開始</button>`:'ホストの開始を待っています…');return}
 const me=g.pl.findIndex(p=>p.id===uid),mt=myTurn(),n=gc();let ctl='';
 const hand=(s,fn)=>`<span class="chips">`+[...s].map((x,i)=>cardH(x,fn&&sel===i?'sel':'',fn?`onclick="${fn}(${i})"`:'')).join('')+`</span>`;
 if(g.ph==='over'){ctl=`<h3>🏆 ${esc(g.pl[g.win].name)} の勝利！</h3>`+g.pl.map((p,i)=>esc(p.name)+' '+g.s[i]+'点').join(' ／ ')+`<br><button onclick="location.reload()">最初に戻る</button>`}
 else if(g.ph==='recv'){const c=n.q[0];ctl=(mt?'押し付けられました！ 置く列をタップ：':esc(g.pl[+c[0]].name)+' が押し付けカードを置く…')+hand(c[1])}
 else if(!mt)ctl=`${esc(g.pl[g.t].name)} のターン…`+(g.ph==='bonus'&&g.bc?' めくったカード：'+hand(g.bc):'');
 else if(g.ph==='pick')ctl=`ネクストスロットから1組選ぶか、ランダムで引く`;
 else if(g.ph==='place')ctl=`置くカードを選び、置く列をタップ<br>${hand(g.hand,'setSel')}`;
 else if(g.ph==='bonus')ctl=g.bc?`めくれたカード：${hand(g.bc)} 置く列をタップ`:`魔法発動ボーナス：<button class="${mode==='x'?'':'g'}" onclick="setMode('x')">一番下を除外(列をタップ)</button><button onclick="flip()">山札から1枚めくる</button>`;
 else if(g.ph==='push')ctl=`押し付け：渡す順にカードをタップ${g.pl.length>2?'→相手を選ぶ':''}<br>`+[...g.push].map((x,i)=>{const k=asg.findIndex(a=>a.i===i);
  return `<span class="chips pk">${cardH(x,(ps===i?'sel ':'')+(k>=0?'dim':''),`onclick="selPush(${i})"`)}${k>=0?`<small>${k+1}番目→${esc(g.pl[asg[k].to].name)}</small>`:''}</span>`}).join('')+`<br>`+
  (g.pl.length>2?g.pl.map((p,i)=>i===g.t?'':`<button onclick="giveTo(${i})">${esc(p.name)}</button>`).join(''):'')+`<button class="g" onclick="resetAsg()">やり直し</button>`;
 const old=snap();
 A.innerHTML=`<div class="box">部屋 ${code} ／ ${esc(g.log)}</div><div class="bds">${g.pl.map((_,i)=>i===me?'':boardH(i,1)).join('')}</div>`+
 `<div class="box">ネクストスロット：${g.nx.map((p,i)=>`<span class="pair">${[...p].map(x=>cardH(x)).join('')}${mt&&g.ph==='pick'?`<button onclick="pk(${i})">選ぶ</button>`:''}</span>`).join('')}${mt&&g.ph==='pick'?`<button class="g" onclick="pk(-1)">ランダムで引く</button>`:''}</div>`+
 `<div class="box">${ctl}</div>`+(me>=0?boardH(me,0):'')+`<div class="box" style="font-size:12px">20点で最終ターン(全員同回数)。手番順: ${g.pl.map(p=>esc(p.name)).join('→')}</div>`;
 animate(old);prev=g}
