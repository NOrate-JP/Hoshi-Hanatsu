firebase.initializeApp(FB);
const db=firebase.database();
const COL={R:'#e53935',B:'#1e88e5',Y:'#f9a825',G:'#43a047',P:'#8e24aa'},JP={R:'赤',B:'青',Y:'黄',G:'緑',P:'紫'},K='RBYGP';
const rc=()=>K[Math.random()*5|0],rp=()=>rc()+rc(),cp=o=>JSON.parse(JSON.stringify(o));
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
let backLobby=false,lastSev=null,jT=null,resReady=true,hideRes=false,uid,code,room,g,prev=null,lastEv=null,sel=0,mode='',asg=[],ps=-1,cpuT=null;
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
function start(){backLobby=false;hideRes=false;prev=null;lastEv=null;lastSev=null;const ps=Object.entries(room.players).sort((a,b)=>a[1].t-b[1].t).map(([id,p])=>({id,name:p.n,cpu:p.c?1:0}));
 for(let i=ps.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[ps[i],ps[j]]=[ps[j],ps[i]]}
 db.ref('rooms/'+code+'/g').set({v:1,gid:Math.random(),bp:0,sb:0,pl:ps,b:ps.map(()=>[...K]),s:ps.map(()=>0),
  pc:[...K].sort(()=>Math.random()-.5).slice(0,ps.length).join(''),nx:[rp(),rp()],t:0,ph:'pick',hand:'',bc:'',combo:0,push:'',log:'ゲーム開始！',win:-1})}

/* ---------- ゲームロジック ---------- */
const gc=()=>{const n=cp(g);n.q=n.q||[];return n};
const actor=n=>n.ph==='recv'?+n.q[0][0]:n.t;
function commit(n){n.v=g.v+1;const v=g.v;mode='';
 db.ref('rooms/'+code+'/g').transaction(c=>(c===null||c.v===v)?n:undefined)}
function hasMagic(n){const c={};n.b[n.t].forEach(x=>{if(x){const k=x[x.length-1];c[k]=(c[k]||0)+1}});return Object.values(c).some(v=>v>=3)}
function after(n){if(hasMagic(n)){n.ph='judge';n.log=n.pl[n.t].name+'：流星魔法の判定…'}else judge(n)}
function judge(n){const b=n.b[n.t],cnt={};
 b.forEach(c=>{if(c){const x=c[c.length-1];cnt[x]=(cnt[x]||0)+1}});
 const col=Object.keys(cnt).find(k=>cnt[k]>=3);
 if(!col){if(n.push){n.ph='push';n.log=n.pl[n.t].name+'：押し付ける順番と相手を決める'}else endTurn(n);return}
 const m=cnt[col];n.combo++;const bp=[0,0,0,1,3,10][m],sb=n.combo-1;n.bp+=bp;n.sb+=sb;n.push+=col;
 b.forEach((c,i)=>{if(c&&c[c.length-1]===col)b[i]=c.slice(0,-1)});
 n.ev={id:Math.random(),p:n.t,c:col,m,b:bp,x:sb};
 n.log=n.pl[n.t].name+'：流星魔法！'+JP[col]+'×'+m;
 n.ph='bonus';n.bc=''}
function endTurn(n){
 if(n.bp>0){const tot=n.bp+n.sb;n.s[n.t]+=tot;n.sev={id:Math.random(),p:n.t,bp:n.bp,sb:n.sb,tot};n.log=n.pl[n.t].name+'：合計 '+tot+'P 獲得！'}
 n.bp=0;n.sb=0;n.fin=0;n.combo=0;n.push='';n.hand='';n.bc='';n.q=[];
 if(n.t===n.pl.length-1&&n.s.some(x=>x>=20)){n.ph='over';n.win=n.s.indexOf(Math.max(...n.s));return}
 n.t=(n.t+1)%n.pl.length;n.ph='pick'}
function aPick(n,i){let p;if(i<0)p=rp();else{p=n.nx[i];n.nx[i]=rp()}
 n.hand=p;n.ph='place';n.log=n.pl[n.t].name+'：カードを置く'}
function aPlace(n,hi,col){if(hi<0||hi>=n.hand.length)return 0;
 const c=n.hand[hi];n.hand=n.hand.slice(0,hi)+n.hand.slice(hi+1);n.b[n.t][col]+=c;
 if(!n.hand)after(n);return 1}
function aBonusRemove(n,col){const b=n.b[n.t];if(!b[col])return 0;b[col]=b[col].slice(0,-1);after(n);return 1}
function aBonusPlace(n,col){n.b[n.t][col]+=n.bc;n.bc='';after(n);return 1}
function aPush(n,a){n.q=a.map(x=>x.to+x.c);n.push='';n.ph='recv';
 n.log=n.pl[n.t].name+'が押し付け！ '+n.pl[+n.q[0][0]].name+'：'+JP[n.q[0][1]]+'を置く'}
function aRecv(n,col){const it=n.q[0],to=+it[0];n.b[to][col]+=it[1];n.q=n.q.slice(1);
 if(!n.q.length){if(n.bp>0){n.ph='judge';n.fin=1;n.log='得点を集計…'}else endTurn(n)}
 else n.log=n.pl[+n.q[0][0]].name+'：押し付けられた'+JP[n.q[0][1]]+'を置く'}

/* ---------- CPU ---------- */
function maxSame(b){const o={};let m=0;b.forEach(c=>{if(c){const x=c[c.length-1];o[x]=(o[x]||0)+1;m=Math.max(m,o[x])}});return m}
function best(b,card){let bs=-1,cs=[];b.forEach((c,i)=>{const t=b.slice();t[i]=c+card;const m=maxSame(t);
 if(m>bs){bs=m;cs=[i]}else if(m===bs)cs.push(i)});return cs[Math.random()*cs.length|0]}
function cpuCheck(){clearTimeout(cpuT);if(!g||g.ph==='over'||g.ph==='judge'||room.host!==uid)return;
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

function judgeCheck(){clearTimeout(jT);if(!g||g.ph!=='judge')return;
 const t=g.pl[g.t],run=t.cpu?room.host===uid:t.id===uid;if(!run)return;
 const v=g.v;jT=setTimeout(()=>{if(!g||g.v!==v||g.ph!=='judge')return;const n=gc();if(n.fin)endTurn(n);else judge(n);commit(n)},1000)}
function toLobby(){backLobby=true;hideRes=true;render()}
function toTitle(){db.ref('rooms/'+code).off();db.ref('rooms/'+code+'/players/'+uid).remove();
 clearTimeout(cpuT);clearTimeout(jT);code=null;room=null;g=null;prev=null;backLobby=false;hideRes=false;render()}
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
const cardH=(x,cls,ex,pl)=>`<i class="cd ${cls||''}" style="--img:${pl?'none':`url('${CARD_IMG[x]}')`};--c:${COL[x]}" ${ex||''}>${CARD_LABEL&&!pl?`<b>${JP[x]}</b>`:''}</i>`;
function stockH(i,small){const n=gc(),o=[];let qi=0;const st='data-st="1"';
 if(g.ph==='place'&&i===g.t)[...g.hand].forEach((x,k)=>o.push([x,!small&&sel===k?'sel':'',!small?`onclick="setSel(${k})"`:'','']));
 else if(g.ph==='bonus'&&i===g.t){if(g.bc)o.push([g.bc,'cur','','']);[...(g.push||'')].forEach(x=>o.push([x,'',st,'']))}
 else if(g.ph==='judge'&&i===g.t)[...(g.push||'')].forEach(x=>o.push([x,'',st,'']));
 else if(g.ph==='push'&&i===g.t)[...g.push].forEach((x,k)=>{const d=asg.findIndex(a=>a.i===k);o.push([x,(ps===k?'sel ':'')+(d>=0?'dim':''),st+(!small?` onclick="selPush(${k})"`:''),d>=0?d+1:''])});
 else if(g.ph==='recv')n.q.forEach((it,k)=>{if(+it[0]===i){qi++;o.push([it[1],k===0?'cur':'','',qi])}});
 return `<div class="stock">`+o.map(([x,c,e,bd])=>`<span class="sk">${cardH(x,c,e,small)}${bd?`<em>${bd}</em>`:''}</span>`).join('')+`</div>`}
function boardH(i,small){const b=g.b[i],me=g.pl[i].id===uid,a=actor(gc()),pc=(g.pc||K)[i];
 const ok=!small&&me&&myTurn()&&(g.ph==='place'||g.ph==='recv'||(g.ph==='bonus'&&(g.bc||mode==='x')));
 return `<div class="bd ${small?'sm':'big'} ${i===g.t&&g.ph!=='over'?'turn':''} ${i===a&&g.ph!=='over'?'act':''}" style="--pc:${COL[pc]}"><div class="plate"><span class="gem"></span><span class="pn">${esc(g.pl[i].name)}${g.pl[i].cpu?' (CPU)':''}</span><span class="sc" data-sc="${i}">${g.s[i]}<small>点</small></span></div>${stockH(i,small)}<div class="cols">`+
 b.map((c,ci)=>`<div class="col ${ok?'ok':''}" ${ok?`onclick="colClick(${ci})"`:''}>`+[...c].map((x,k)=>cardH(x,'',`data-k="${i}-${ci}-${k}"`,small)).join('')+`</div>`).join('')+`</div></div>`}
function snap(){const m={};document.querySelectorAll('[data-k]').forEach(e=>{m[e.dataset.k]={r:e.getBoundingClientRect(),n:e.cloneNode(true)}});return m}
function ghost(d){const e=d.n;e.classList.remove('new','bt');e.classList.add('ghost');
 e.style.left=d.r.left+'px';e.style.top=d.r.top+'px';e.style.width=d.r.width+'px';e.style.height=d.r.height+'px';
 document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
function burst(col,k){for(let i=0;i<k;i++){const e=document.createElement('span');e.className='star';e.textContent='★';e.style.color=col;
  const a=Math.random()*6.28,r=120+Math.random()*200;
  e.style.setProperty('--dx',Math.cos(a)*r+'px');e.style.setProperty('--dy',Math.sin(a)*r+'px');
  document.body.appendChild(e);setTimeout(()=>e.remove(),1150)}}
function banner(ev){const d=document.createElement('div');d.className='banner';d.style.borderColor=COL[ev.c];
 d.innerHTML=`<div class="t">★ 流星魔法 ★</div><div>${esc(g.pl[ev.p].name)}：${JP[ev.c]}×${ev.m}</div><div class="b2">基礎 +${ev.b}P ／ 流星群ボーナス +${ev.x}P</div>`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),1750);burst(COL[ev.c],14)}
function tallyBanner(e){const d=document.createElement('div');d.className='banner long';d.style.borderColor='#e8d9a0';
 d.innerHTML=`<div class="t">${esc(g.pl[e.p].name)} の獲得</div><div class="bl"><span>基礎ポイント</span><b>${e.bp}P</b></div><div class="bl"><span>流星群ボーナス</span><b>${e.sb}P</b></div><div class="bl tot"><span>合計</span><b>${e.tot}P</b></div>`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),2750);burst('#e8d9a0',26)}
function animate(old){
 if(prev&&prev.v!==g.v&&prev.pl.length===g.pl.length)g.s.forEach((v,i)=>{if(prev.s[i]!==v){const e=document.querySelector('[data-sc="'+i+'"]');e&&e.classList.add('pop')}});
 if(prev&&prev.v!==g.v&&prev.pl.length===g.pl.length)
  g.b.forEach((bd,p)=>bd.forEach((s,c)=>{const o=(prev.b[p]||[])[c]||'';
   if(s.length>o.length&&s.startsWith(o)){for(let k=o.length;k<s.length;k++){const e=document.querySelector(`[data-k="${p}-${c}-${k}"]`);e&&e.classList.add('new')}}
   else if(o.length>s.length&&o.startsWith(s)){for(let k=s.length;k<o.length;k++){const d=old[p+'-'+c+'-'+k];d&&ghost(d)}}}));
 if(prev&&prev.v!==g.v&&(g.push||'').length>(prev.push||'').length){const e=[...document.querySelectorAll('[data-st]')].pop();e&&e.classList.add('new')}
 if(!prev){lastEv=g.ev&&g.ev.id;lastSev=g.sev&&g.sev.id}
 else{if(g.ev&&g.ev.id!==lastEv){lastEv=g.ev.id;banner(g.ev)}
  if(g.sev&&g.sev.id!==lastSev){lastSev=g.sev.id;tallyBanner(g.sev)}}}
function resultH(){const r=g.pl.map((p,i)=>({i,s:g.s[i]})).sort((x,y)=>y.s-x.s||x.i-y.i),N=r.length;
 return `<div class="result"><div class="rbox"><div class="rt">— RESULT —</div><div class="rh">${esc(g.pl[r[0].i].name)} の勝利！</div>`+
 r.map((o,k)=>`<div class="rr${k?'':' top'}" style="--pc:${COL[(g.pc||K)[o.i]]};--d:${N-1-k}"><span class="rk">${k+1}<small>位</small></span><span class="gem"></span><span class="rn">${esc(g.pl[o.i].name)}${g.pl[o.i].cpu?' (CPU)':''}</span><span class="rs">${o.s}<small>点</small></span></div>`).join('')+
 `<div class="rb"><button onclick="hideRes=true;render()">盤面を見る</button><button class="pri" onclick="toLobby()">ロビーに戻る</button><button class="g" onclick="toTitle()">タイトルに戻る</button></div></div></div>`}
function sumH(){const r=g.pl.map((p,i)=>({i,s:g.s[i]})).sort((x,y)=>y.s-x.s||x.i-y.i);
 return `<div class="panel sum"><div class="ttl">◆ 点数サマリー <small>目標 20点</small></div>`+r.map((o,k)=>`<div class="sr" style="--pc:${COL[(g.pc||K)[o.i]]}"><span class="rkn">${k+1}</span><span class="gem"></span><span class="sn">${esc(g.pl[o.i].name)}${g.pl[o.i].cpu?' (CPU)':''}</span><span class="sp">${o.s}<small>点</small></span><div class="bar"><i style="width:${Math.min(o.s/20,1)*100}%"></i></div></div>`).join('')+`</div>`}
function orderH(a){return `<div class="order">`+g.pl.map((p,i)=>`<span class="od ${i===a&&g.ph!=='over'?'cur':''}" style="--pc:${COL[(g.pc||K)[i]]}"><span class="gem"></span><small>${esc(p.name)}</small></span>`).join('<span class="ar">→</span>')+`</div>`}
const titleH=(small,c)=>small?`<div class="mini">星を放つ夜<span>MeteoNight ONLINE</span><em class="rc">${c}</em></div>`:`<div class="hero"><div class="dia">◆ ━━━ ◇ ━━━ ◆</div><h1 class="title">星を放つ夜</h1><div class="sub">MeteoNight&nbsp;ONLINE</div></div>`;
function render(){const A=$('app');
 if(!uid)return;
 if(!code){A.innerHTML=titleH(0)+`<div class="panel entry"><label>なまえ</label><input id="nm" value="${esc(localStorage.hn||'')}" maxlength="10"><br><button class="pri" onclick="mk()">部屋をつくる</button><div class="or">─ または ─</div><label>部屋コード</label><input id="cd" size="6" inputmode="numeric"><br><button onclick="jn()">参加する</button></div>`;return}
 if(!room){A.textContent='読み込み中…';return}
 if(backLobby&&g&&g.ph!=='over')backLobby=false;
 if(!g||backLobby){prev=null;const ps=Object.entries(room.players||{}).sort((a,b)=>a[1].t-b[1].t),host=room.host===uid;
  const seats=[0,1,2,3,4].map(i=>{const p=ps[i];return p?`<div class="seat on"><span class="gem" style="--pc:#e8d9a0"></span>${esc(p[1].n)}${p[1].c?' <small>CPU</small>':''}</div>`:`<div class="seat"><span class="gem off"></span>空席</div>`}).join('');
  A.innerHTML=titleH(0)+`<div class="panel lobby"><div class="ttl">◆ 部屋コード ◆</div><div class="code">${code}</div><div class="hint">このコードを仲間に伝えよう</div><div class="seats">${seats}</div>`+
  (host?`<button class="g" onclick="addCpu()">CPUを追加</button><button class="pri" onclick="start()" ${ps.length<2?'disabled':''}>ゲーム開始</button>`:'<div class="hint">ホストの開始を待っています…</div>')+`<br><button class="g" onclick="toTitle()">タイトルに戻る</button></div>`;return}
 if(prev&&prev.gid!==g.gid){prev=null;lastEv=null;lastSev=null;hideRes=false;resReady=true}
 if(prev&&prev.ph!=='over'&&g.ph==='over'&&prev.v!==g.v){resReady=false;setTimeout(()=>{resReady=true;render()},2900)}
 const me=g.pl.findIndex(p=>p.id===uid),mt=myTurn(),n=gc(),a=actor(n),an=esc(g.pl[a].name);
 let tt,mx='',mb='';
 if(g.ph==='over'){tt='ゲーム終了';mx='全員の手番が終わりました';mb=`<button class="pri" onclick="hideRes=false;render()">結果を見る</button><button onclick="toLobby()">ロビーに戻る</button><button class="g" onclick="toTitle()">タイトルに戻る</button>`}
 else{tt=mt?'あなたの番':an+' の番';
  if(g.ph==='pick')mx=mt?'ネクストスロットから星を1組えらんでください':'星を選んでいます…';
  else if(g.ph==='place')mx=mt?'ストックの星を選んで、置く列をタップしてください':'星を置いています…';
  else if(g.ph==='judge')mx=n.fin?'得点を集計しています…':'流星魔法の判定中…';
  else if(g.ph==='bonus'){mx=mt?(g.bc?'めくれた星を置く列をタップしてください':'魔法ボーナス！ 山札をめくるか、一番下を除外'):'魔法ボーナスを選んでいます…';
   if(mt&&!g.bc)mb=`<button class="${mode==='x'?'':'g'}" onclick="setMode('x')">一番下を除外(列をタップ)</button><button onclick="flip()">山札から1枚めくる</button>`}
  else if(g.ph==='push'){mx=mt?'ストックの星を、渡す順にタップ'+(g.pl.length>2?' → 相手を選ぶ':''):'星を押し付けています…';
   if(mt)mb=(g.pl.length>2?g.pl.map((p,i)=>i===g.t?'':`<button onclick="giveTo(${i})">${esc(p.name)}</button>`).join(''):'')+`<button class="g" onclick="resetAsg()">やり直し</button>`}
  else if(g.ph==='recv')mx=mt?'押し付けられた星を置く列をタップしてください':'押し付けられた星を置いています…'}
 const tl=n.bp>0&&g.ph!=='over'?`<div class="tally"><div class="tl">今回の獲得ポイント</div><div><span>基礎ポイント</span><b>${n.bp}P</b></div><div><span>流星群ボーナス</span><b>${n.sb}P</b></div><div class="tot"><span>合計</span><b>${n.bp+n.sb}P</b></div></div>`:'';
 const others=g.pl.map((_,i)=>i===me?'':boardH(i,1)).join('');
 const can=mt&&g.ph==='pick',dis=can?'':'disabled';
 const old=snap();
 A.innerHTML=titleH(1,code)+`<div class="game"><div class="gl"><div class="panel nx"><div class="ttl">◆ ネクストスロット</div>${g.nx.map((p,i)=>`<span class="pair">${[...p].map(x=>cardH(x)).join('')}<button ${dis} onclick="pk(${i})">選ぶ</button></span>`).join('')}<button class="g" ${dis} onclick="pk(-1)">ランダムで引く</button></div>${me>=0?boardH(me,0):''}${sumH()}</div>`+
 `<div class="gr"><div class="panel msg ${mt?'mine':''}"><div class="mt">${tt}</div><div class="mx">${mx}</div><div class="mb">${mb}</div>${tl}<div class="lg">${esc(g.log)}</div></div>${orderH(a)}<div class="others n${g.pl.length-1}">${others}</div></div></div>`+
 (g.ph==='over'&&!hideRes&&resReady?resultH():'');
 animate(old);prev=g}
