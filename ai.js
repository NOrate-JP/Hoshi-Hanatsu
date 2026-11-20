// ===== 最強CPU(AI) =====
// 1ターン先までを期待値探索(expectimax)。連鎖・追加アクション・種族技能・押し付け・
// 次手番への「渡したくないカード」まで評価する。game.js の aXxx 関数を使って操作する。
const AI=(()=>{
const KK='RBYGP',PHI=[0,.3,1.6,3.2,6,11],B0=[0,0,0,1,3,10],TR=['RBY','GPR','YYB','BGP','RRG','PBY'];
let DL=0,seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
const rcol=()=>KK[rnd()*5|0];
const cnt=b=>{const c={};for(const s of b)if(s){const x=s[s.length-1];c[x]=(c[x]||0)+1}return c};
// 盤面の静的評価(一番下の色の揃い具合・2枚目の繋がり・空列)
function E(b){const c=cnt(b);let v=0;for(const x in c)v+=PHI[Math.min(c[x],5)];
 for(const s of b){if(!s)v+=.15;else if(s.length>1){const x=s[s.length-1],y=s[s.length-2];if(y!==x&&c[y])v+=.2*(c[y]>=2?2:1)}}return v}
const thr=(n,p,t)=>Math.max(.5,Math.min(2,1+.1*(n.s[p]-n.s[t])));
function lamOf(n,t){const mx=Math.max(...n.s);if(mx>=n.goal)return .1;if(mx>=n.goal-6||n.s[t]>=n.goal-8)return .5;return .9}
const ctxOf=(n,i,lam)=>({r:n.pl[i].race||'',pc:(n.pc||KK)[i],lam,pv:.25,fh:0,memo:new Map()});
function fairyBest(n,t){let r={h:0,p:-1,c:0};
 n.pl.forEach((q,p)=>{if(p===t)return;const w=thr(n,p,t);
  n.b[p].forEach((s,c)=>{if(!s)return;const nb=n.b[p].slice();nb[c]=s.slice(0,-1);
   const h=w*(E(n.b[p])-E(nb))+.01*n.s[p];if(r.p<0||h>r.h)r={h,p,c}})});return r}
// 盤面bから連鎖を最後まで読んだときの期待得点+最終盤面の評価
function V(b,cb,x){const k=b.join('|')+'#'+cb,m=x.memo;if(m.has(k))return m.get(k);
 const c=cnt(b);let col=null;for(const y in c)if(c[y]>=3)col=y;let v;
 if(!col||cb>8)v=x.lam*E(b);
 else{const mm=c[col],idx=[];b.forEach((s,i)=>{if(s&&s[s.length-1]===col)idx.push(i)});
  const k2=cb+1;let bp=B0[mm],sb=k2-1,im=0;
  if(x.r==='human')bp++;if(x.r==='dragon')bp*=2;if(x.r==='beast')sb*=2;
  if(x.r==='mage'&&x.pc===col)im=mm;
  if(x.r==='oni'&&idx[idx.length-1]-idx[0]===idx.length-1)im=mm-2;
  const nb=b.map((s,i)=>idx.includes(i)?s.slice(0,-1):s);
  v=bp+sb+im+x.pv+bonus(nb,k2,x)}
 m.set(k,v);return v}
function bonus(b,cb,x){let best=-1e9;
 b.forEach((s,i)=>{if(s){const nb=b.slice();nb[i]=s.slice(0,-1);const v=V(nb,cb,x)+(x.r==='fairy'?x.fh:0);if(v>best)best=v}});
 return Math.max(best,flipV(b,cb,x))}
function flipV(b,cb,x){
 if(x.r==='goblin'&&cb===1){let t=0;for(const s of TR)t+=plan(b,[...s],cb,x,false)[0];return t/TR.length}
 let t=0;for(const y of KK){let bs=-1e9;for(let i=0;i<b.length;i++){const nb=b.slice();nb[i]+=y;const v=V(nb,cb,x);if(v>bs)bs=v}t+=bs}return t/5}
// cards を盤面に全部置く最善手 [価値,最初に置くカード番号,列]
function plan(b,cards,cb,x,perm){let best=[-1e9,0,0];
 const rec=(bd,rem,f)=>{if(!rem.length){const v=V(bd,cb,x);if(v>best[0])best=[v,f[0],f[1]];return}
  const seen={},cand=perm?rem:[rem[0]];
  for(const ci of cand){if(seen[cards[ci]])continue;seen[cards[ci]]=1;const rest=rem.filter(z=>z!==ci);
   for(let col=0;col<bd.length;col++){const nb=bd.slice();nb[col]+=cards[ci];rec(nb,rest,f||[ci,col])}}};
 rec(b,cards.map((_,i)=>i),null);return best}
function best2(b,cs,x){let best=[-1e9,0,1];
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const p=plan(b,[cs[i],cs[j]],0,x,true);if(p[0]>best[0])best=[p[0],i,j]}return best}
// 「ランダムに引く」の期待値
function randVal(b,x,r){
 if(r==='dwarf'||r==='elf'){const N=r==='dwarf'?4:3;let t=0,c=0;
  for(let i=0;i<22&&(i<6||Date.now()<DL);i++){const cs=Array.from({length:N},rcol);t+=r==='elf'?plan(b,cs,0,x,true)[0]:best2(b,cs,x)[0];c++}return t/c}
 let t=0;for(let i=0;i<5;i++)for(let j=i;j<5;j++)t+=(i===j?1:2)*plan(b,[KK[i],KK[j]],0,x,true)[0];return t/25}
// 手番の近い順に重みを付けて「そのペアを相手に残したときの得」を見積もる
function oppGain(n,t,pair){let g=0;const N=n.pl.length;
 for(let d=1;d<N;d++){const p=(t+d)%N,x=ctxOf(n,p,.9);
  const v=plan(n.b[p],[...pair],0,x,true)[0]-x.lam*E(n.b[p]);g+=[1,.5,.35,.25][d-1]*Math.max(0,v)}return g}
function pick(n){const t=n.t,b=n.b[t],x=ctxOf(n,t,lamOf(n,t));x.fh=Math.max(0,fairyBest(n,t).h);
 const sc=[0,1].map(i=>plan(b,[...n.nx[i]],0,x,true)[0]),gn=n.nx.map(p=>oppGain(n,t,p)),OM=.5;
 const s=[sc[0]-OM*gn[1],sc[1]-OM*gn[0],randVal(b,x,x.r)-OM*Math.max(gn[0],gn[1])];
 const k=s.indexOf(Math.max(...s));return k===2?-1:k}
function bonusAct(n,x){const b=n.b[n.t],cb=n.combo;let best=-1e9,col=-1;
 b.forEach((s,i)=>{if(s){const nb=b.slice();nb[i]=s.slice(0,-1);const v=V(nb,cb,x)+(x.r==='fairy'?x.fh:0);if(v>best){best=v;col=i}}});
 if(col>=0&&best>=flipV(b,cb,x))aBonusRemove(n,col);else aFlip(n)}
const perms=a=>{if(a.length<=1)return[a];const r=[];a.forEach((v,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).forEach(p=>r.push([v,...p])));return r};
// 押し付け: 相手が最善に置いたときの「相手の得」を最小にする割り当てと順番
function pushPlan(n){const t=n.t,cards=[...n.push],opps=n.pl.map((_,i)=>i).filter(i=>i!==t);
 const place=(bd,c)=>{let bs=-1e9,nb0=bd;for(let i=0;i<bd.length;i++){const nb=bd.slice();nb[i]+=c;const v=E(nb);if(v>bs){bs=v;nb0=nb}}return[nb0,bs]};
 const idxs=cards.map((_,i)=>i),small=cards.length<=3;let best=1e9,ba=null;
 for(const od of(small?perms(idxs):[idxs])){
  const rec=(k,sim,cost,as)=>{if(cost>=best)return;if(k===od.length){best=cost;ba=as;return}
   const c=cards[od[k]],ev=p=>{const[nb,v]=place(sim[p],c);return{p,nb,d:thr(n,p,t)*(v-E(sim[p]))}};
   let cs=opps.map(ev);if(!small)cs=[cs.reduce((a,b)=>b.d<a.d?b:a)];
   for(const o of cs){const s2=sim.slice();s2[o.p]=o.nb;rec(k+1,s2,cost+o.d,[...as,{c,to:o.p}])}};
  rec(0,n.b.map(b=>b.slice()),0,[])}
 return ba}
function act(n){DL=Date.now()+1400;const t=n.t,b=n.b[t];
 if(n.ph==='pick')return aPick(n,pick(n));
 const x=ctxOf(n,t,lamOf(n,t));x.fh=Math.max(0,fairyBest(n,t).h);
 if(n.ph==='sel'){const r=best2(b,[...n.hand],x);return aKeep(n,[r[1],r[2]])}
 if(n.ph==='place'){const p=plan(b,[...n.hand],0,x,true);return aPlace(n,p[1],p[2])}
 if(n.ph==='bonus'){if(n.bc){const p=plan(b,[...n.bc],n.combo,x,true);return aBonusPlace(n,p[2],p[1])}return bonusAct(n,x)}
 if(n.ph==='fairy'){const f=fairyBest(n,t);return aRemoveOther(n,f.p,f.c)}
 if(n.ph==='push')return aPush(n,pushPlan(n));
 if(n.ph==='recv'){const i=+n.q[0][0],c=n.q[0][1];let bs=-1e9,bc=0;
  n.b[i].forEach((s,col)=>{const nb=n.b[i].slice();nb[col]+=c;const v=E(nb);if(v>bs){bs=v;bc=col}});return aRecv(n,bc)}}
return{act}})();
