// mklogideck.js — the transport pages of the deck. One page per location,
// one page of recommendations, one page for the Riggai move.
// Every time and every passenger count comes from core.js. Nothing typed by hand.
const fs=require('fs');
const {B,build}=require('./core.js');
const {DAYS,h}=require('./data.js');
const P='plan/project/slides/';

// ---- transport facts that are not in the roster model (Shakeel, 8 Oct 2026) ----
const LEAD=0.5, BACK=0.5;                 // leave 30 min before, 30 min to get home
const HOME={
  Qurain  :{live:'Mahboula', driver:'Driver 1', road:'about 12 minutes',
            note:'Driver 1 looks after Qurain and Mahboula. Mahboula walks, so in practice this is his whole day.'},
  Mahboula:{live:'Mahboula', driver:'Driver 1', walk:true},
  Ardiya  :{live:'Hawally',  driver:'Driver 2', road:'not yet measured'},
  Jabriya :{live:'Hawally',  driver:'Driver 3', road:'not yet measured',
            note:'Driver 2 and Driver 3 become one driver later, once the new timings have settled.'},
  Kaifan  :{live:'Hawally',  driver:'Driver 4', road:'not yet measured',
            note:'Kaifan has its own driver and is not shared with any branch.'},
  Jahra   :{live:'Riggai',   driver:'not decided', road:'not yet measured', future:true},
};
const LOC=['Qurain','Mahboula','Ardiya','Jabriya','Kaifan','Jahra'];
const MAHB='Mahboula';                    // the option the joker counts come from

const f=x=>{const t=((x%24)+24)%24,H=Math.floor(t),M=Math.round((t%1)*60);
  return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0');};

// ---- pull every movement out of the roster ---------------------------------
function moves(n,b){
  const r=build(b.men.length,b), men=r.men||b.men;
  const o=h(b.onSite), c=h(b.close)+(h(b.close)<12?24:0), pe=h(b.peakEnd), sec=h('18:30');
  const drop={},pick={};
  for(let d=0;d<7;d++) for(const m of men){
    const v=r.grid[m][d]; if(!v||v==='OFF'||v==='—') continue;
    let a,z;
    if(v==='First'){a=o;z=o+9;}
    else if(String(v).startsWith('First +')){a=o;z=pe;}
    else if(v==='Peak'){a=pe-9;z=pe;}
    else if(v==='Second'){a=sec;z=c;}
    else if(v==='DOUBLE'){a=o;z=c;}
    else continue;
    (drop[a]=drop[a]||Array(7).fill(0))[d]++;
    (pick[z]=pick[z]||Array(7).fill(0))[d]++;
  }
  const outs=Object.keys(drop).map(Number).sort((x,y)=>x-y).map(t=>({t,counts:drop[t],dir:'out'}));
  const ins =Object.keys(pick).map(Number).sort((x,y)=>x-y).map(t=>({t,counts:pick[t],dir:'in'}));
  outs.forEach((x,i)=>x.what = i===0 ? 'Take the men who open the branch'
                                     : 'Take the men who work the night');
  ins.forEach((x,i)=>x.what = i===ins.length-1 ? 'Bring home the men who close the branch'
                            : x.t===pe         ? 'Bring home the men who stayed for the busy time'
                                               : 'Bring home the men who finished their nine hours');
  return {rows:outs.concat(ins), r, men};
}

// ---- one palette, two moods -------------------------------------------------
const PAL=d=>d
 ?{bg:'#1C2B33',fg:'#FAF7F2',mut:'#8FA3AE',card:'#263A45',th:'#0F1C23',alt:'#263A45',
   grn:'#4FA391',org:'#E09A6A',rule:'#2E7D6B'}
 :{bg:'#FAF7F2',fg:'#1C2B33',mut:'#4A5568',card:'#FFFFFF',th:'#1C2B33',alt:'#F3F0EA',
   grn:'#1F6B59',org:'#C4622D',rule:'#2E7D6B'};

const head=(p,kick,title,sub)=>`<div style="display:flex; flex-direction:column; gap:5px">
<p style="font-size:25px; letter-spacing:3px; color:${p.grn}; margin:0">${kick}</p>
<h2 style="font-family:'Libre Baskerville', Georgia, serif; font-size:47px; font-weight:400; line-height:1.12; margin:0">${title}</h2>
<p style="font-size:26px; line-height:1.35; color:${p.mut}; margin:0; width:1664px">${sub}</p></div>`;

const foot=(p,t)=>`<p style="position:absolute; left:128px; bottom:56px; width:1664px; font-size:23px; line-height:1.28; color:${p.mut}">${t}</p>`;

const shell=(id,p,body,note)=>`<section id="${id}" data-transition="fade" style="background:${p.bg}; color:${p.fg}; font-family:'Public Sans', Verdana, sans-serif; padding:50px 128px 150px; display:flex; flex-direction:column; gap:14px">
${body}
<aside>${note}</aside></section>`;

// ---- a location page --------------------------------------------------------
function locPage(n,dark){
  const p=PAL(dark), b=B[n], H=HOME[n];

  if(H.walk){
    const jok={};
    for(const k of ['Mahboula','MahboulaB','MahboulaC']){
      const bb=B[k], rr=build(bb.men.length,bb);
      const j=(rr.men||bb.men).find(m=>/^Joker/.test(m));
      const days=[0,1,2,3,4,5,6].filter(d=>{const v=rr.grid[j][d];return v&&v!=='OFF'&&v!=='—';});
      jok[k]={n:days.length, days:days.map(d=>DAYS[d])};
    }
    const opt=[['Option 1','Mahboula'],['Option 2','MahboulaB'],['Option 3','MahboulaC']];
    return shell('logimahboula',p,
`${head(p,'TRANSPORT &nbsp;&middot;&nbsp; MAHBOULA','Mahboula &mdash; nobody needs a vehicle',
  'The men who work at Mahboula live in Mahboula and <b>walk to work</b>. No driver and no vehicle are needed for them, on any day of the week. This is the only branch in the estate where that is true.')}
<div style="display:flex; gap:20px; margin-top:4px">
<div style="flex:1; background:${p.card}; padding:18px 26px; border-radius:14px; border-left:6px solid ${p.rule}">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${p.grn}; margin:0 0 6px">WHAT THIS SAVES</p>
<p style="font-size:25px; line-height:1.35; margin:0">Every other branch needs five trips a day. Mahboula needs <b>none</b>. No vehicle, no fuel, no driver hours, and no man waiting outside at half past one in the morning for a van.</p></div>
<div style="flex:1; background:${p.card}; padding:18px 26px; border-radius:14px; border-left:6px solid #C4622D">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${p.org}; margin:0 0 6px">THE ONE EXCEPTION</p>
<p style="font-size:25px; line-height:1.35; margin:0">Mahboula borrows one man from another branch to cover rest days. He is called <b>the joker</b>. He does not live in Mahboula, so somebody has to bring him and take him home again.</p></div></div>
<table style="width:1664px; font-size:25px; border-collapse:collapse; margin-top:2px">
<tr style="background:${p.th}"><th style="width:22%; text-align:left; color:#FAF7F2; padding:10px 16px">Which plan is picked</th>
<th style="width:22%; text-align:left; color:#8FA3AE">Joker travels</th>
<th style="width:56%; text-align:left; color:#8FA3AE; padding-left:22px">Which days</th></tr>
${opt.map(([lab,k],i)=>`<tr${i%2?` style="background:${p.alt}"`:''}><td style="padding:9px 16px"><b>${lab}</b></td>
<td><b style="color:${jok[k].n>3?p.org:p.grn}">${jok[k].n} days a week</b></td>
<td style="padding-left:22px; color:${p.mut}">${jok[k].days.join(', ')}</td></tr>`).join('')}
</table>
<div style="background:${p.card}; padding:16px 26px; border-radius:14px; border-left:6px solid #C4622D">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${p.org}; margin:0 0 6px">NOT DECIDED YET &mdash; AND IT CHANGES THE COST</p>
<p style="font-size:25px; line-height:1.35; margin:0">The joker may come from <b>Qurain</b> or from <b>Jabriya</b>. If he comes from Qurain, Driver 1 carries him on a trip he is making anyway and it costs nothing extra. <b>If he comes from Jabriya, Driver 1 cannot carry him at all</b> &mdash; Jabriya is a different corridor, and a second driver would have to make a special journey for one man. Please settle this before the plan is finalised.</p></div>
${foot(p,'Mahboula is on site at '+b.onSite+' and closes at '+b.close+', with half an hour of buffer at each end for preparation and cleaning. The walk is the reason this branch carries no transport cost at all, and it is worth remembering when accommodation is chosen for any future branch.')}`,
`The point of this page is that walking distance is worth more than any clever routing. Mahboula costs nothing to move. If the room is choosing accommodation for a future branch, this is the argument. Do not leave without a decision on where the joker comes from — it is the only open item here and it is a cheap decision to make.`);
  }

  const mv=moves(n,b);
  const seats=Math.max(...mv.rows.map(x=>Math.max(...x.counts)));
  const ts=mv.rows.map(x=>x.t);
  const span=(Math.max(...ts)+BACK)-(Math.min(...ts)-LEAD);
  const driving=mv.rows.length*(LEAD+BACK);
  const per=[0,1,2,3,4,5,6].map(d=>mv.rows.filter(x=>x.counts[d]>0).length);
  const lo=Math.min(...per), hi=Math.max(...per);
  const zero=mv.rows.filter(x=>x.counts.some(v=>v===0));

  const row=(x,i)=>`<tr${i%2?` style="background:${p.alt}"`:''}>
<td style="padding:8px 16px; width:30%">${x.what}</td>
<td style="text-align:center; width:8%"><b>${f(x.t-LEAD)}</b></td>
<td style="text-align:center; width:8%; color:${p.grn}"><b>${f(x.t)}</b></td>
<td style="text-align:center; width:8%; color:${p.mut}">${f(x.t+BACK)}</td>
${x.counts.map(v=>`<td style="text-align:center; width:5.4%; ${v===0?`color:${p.org}; font-weight:700`:'font-weight:700'}">${v===0?'&mdash;':v}</td>`).join('')}
</tr>`;

  const tile=(lab,val)=>`<div style="flex:1; background:${p.card}; padding:13px 22px; border-radius:12px; border-top:5px solid ${p.rule}">
<p style="font-size:23px; color:${p.mut}; margin:0 0 2px">${lab}</p>
<p style="font-size:30px; font-weight:700; margin:0">${val}</p></div>`;

  return shell('logi'+n.toLowerCase(),p,
`${head(p,'TRANSPORT &nbsp;&middot;&nbsp; '+n.toUpperCase()+(H.future?' &nbsp;&middot;&nbsp; NOT OPEN YET':''),
  n+' &mdash; getting the men to work',
  'The men live in <b>'+H.live+'</b>. <b>'+H.driver+'</b> takes them and brings them home, and he lives in the same accommodation they do. The branch is on site at <b>'+b.onSite+'</b> and closes at <b>'+b.close+'</b>.')}
<table style="width:1664px; font-size:24px; border-collapse:collapse; margin-top:2px">
<tr style="background:${p.th}">
<th style="text-align:left; color:#FAF7F2; padding:9px 16px">What the trip is for</th>
<th style="text-align:center; color:#8FA3AE">Leave</th>
<th style="text-align:center; color:#FAF7F2">Be there</th>
<th style="text-align:center; color:#8FA3AE">Back</th>
${DAYS.map(d=>`<th style="text-align:center; color:#8FA3AE">${d}</th>`).join('')}</tr>
${mv.rows.map(row).join('\n')}
</table>
<div style="display:flex; gap:16px">
${tile('Trips a day', lo===hi? hi : lo+' to '+hi)}
${tile('Seats needed', seats+' passengers')}
${tile('Driver on duty', f(Math.min(...ts)-LEAD)+' to '+f(Math.max(...ts)+BACK))}
${tile('Actually driving', driving.toFixed(1)+' hours')}
</div>
<div style="background:${p.card}; padding:15px 26px; border-radius:14px; border-left:6px solid ${zero.length?'#C4622D':p.rule}">
<p style="font-size:25px; line-height:1.35; margin:0">${zero.length
 ? `<b style="color:${p.org}">Where the table shows a dash, do not make that trip at all.</b> There is nobody to carry, so the vehicle stays at the accommodation and the driver rests. ${zero.map(x=>`The <b>${f(x.t)}</b> pick-up is not needed on ${x.counts.map((v,k)=>v===0?DAYS[k]:null).filter(Boolean).join(', ')}`).join('. ')}. On every other day all ${mv.rows.length} trips run.`
 : `<b>All ${mv.rows.length} trips run every day of the week.</b> The number of men changes because each man takes one rest day, but no trip is ever empty.`}</p></div>
${foot(p,'<b>The times are a recommendation, not an order.</b> The rule behind every one of them is the same: leave the accommodation thirty minutes before the men must be at the branch. The driver knows the road &mdash; if traffic is heavy, if it is raining, if a road is closed, he leaves earlier, and he and the logistics team decide that on the day. It is always better to be early than late.'+(H.note?' '+H.note:'')+(H.future?' Jahra is a projection: these times follow the roster we have modelled and must be checked against the real order curve once it opens.':''))}`,
`Walk the room along one row, not down the table. ${n} needs ${lo===hi?hi:'up to '+hi} trips a day, a vehicle with ${seats} passenger seats, and about ${driving.toFixed(1)} hours of actual driving inside a ${span.toFixed(1)}-hour window. ${zero.length?'Point out the dashes — that is '+zero.reduce((a,x)=>a+x.counts.filter(v=>v===0).length,0)+' empty runs a week we are not making.':'Every trip carries somebody.'} If anyone pushes on the exact minutes, say the thirty-minute rule is the policy and the driver adjusts for traffic.`);
}

// ---- the recommendation page ------------------------------------------------
function advicePage(dark){
  const p=PAL(dark);
  // the cost of merging the two evening pick-ups, measured not guessed
  const b=B.Qurain, mv=moves('Qurain',b), r=build(b.men.length,b);
  const pe=h(b.peakEnd);
  const early=mv.rows.find(x=>x.dir==='in'&&x.t<pe);
  const held=early?early.counts.reduce((a,c)=>a+c,0):0;
  const gap=early?(pe-early.t):0;
  const cost=Math.round(held*gap*52/12);
  const drv=LOC.filter(n=>!HOME[n].walk&&!HOME[n].future)
    .map(n=>({n,mv:moves(n,B[n])}));
  const totalDriving=drv.reduce((a,x)=>a+x.mv.rows.length*(LEAD+BACK),0);

  return shell('logiadvice',p,
`${head(p,'TRANSPORT &nbsp;&middot;&nbsp; RECOMMENDATION','What we recommend, and what we need you to decide',
  'The routes above are settled. Three things are not, and two of them cost money whichever way they go.')}
<div style="background:${p.card}; padding:17px 26px; border-radius:14px; border-left:6px solid #C4622D">
<p style="font-size:25px; font-weight:700; letter-spacing:1px; color:${p.org}; margin:0 0 6px">1 &nbsp; THE DRIVER'S REST &mdash; THE ONE THAT MATTERS</p>
<p style="font-size:25px; line-height:1.34; margin:0">A driver's last trip brings men home at four in the morning and his first trip leaves at noon. That is <b>eight hours</b> between them, and the night is <b>broken</b>, because he has to come out again at three for the closing pick-up. We give the kitchen men <b>eleven hours</b> between shifts and hold ourselves to it. We are not giving the drivers the same.</p></div>
<table style="width:1664px; font-size:24px; border-collapse:collapse">
<tr style="background:${p.th}"><th style="width:26%; text-align:left; color:#FAF7F2; padding:9px 16px">Option</th>
<th style="width:20%; text-align:left; color:#8FA3AE">What it costs</th>
<th style="width:54%; text-align:left; color:#8FA3AE; padding-left:22px">What it means</th></tr>
<tr><td style="padding:9px 16px"><b>Two drivers per corridor</b><br><span style="font-size:22px; color:${p.mut}">one day, one night</span></td>
<td style="color:${p.org}"><b>One more man<br>per corridor</b></td>
<td style="padding-left:22px">Day driver finishes about ten at night, night driver starts at eleven. Both sleep properly. This is the only option where nobody drives at three in the morning tired.</td></tr>
<tr style="background:${p.alt}"><td style="padding:9px 16px"><b>One driver, accept it</b></td>
<td style="color:${p.grn}"><b>Nothing</b></td>
<td style="padding-left:22px">Cheapest, and it may well be workable &mdash; he is seated for ${totalDriving>0?'about five':'a few'} hours, not on his feet for nine. But it should be a decision somebody signs, not something nobody noticed.</td></tr>
<tr><td style="padding:9px 16px"><b>Join the late pick-ups</b></td>
<td style="color:${p.org}"><b>+${cost} overtime<br>hours a month</b></td>
<td style="padding-left:22px"><b>Do not do this.</b> The men who finish their nine hours would wait at the branch for the last trip, and every hour of waiting is paid. At Qurain alone that is ${cost} hours a month against a roster of ${r.mo}. It looks like a transport saving and it is a payroll bill.</td></tr>
</table>
<div style="display:flex; gap:18px">
<div style="flex:1; background:${p.card}; padding:15px 24px; border-radius:14px; border-left:6px solid #C4622D">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${p.org}; margin:0 0 5px">2 &nbsp; WHERE THE JOKER COMES FROM</p>
<p style="font-size:24px; line-height:1.32; margin:0">From <b>Qurain</b> he rides along on a trip Driver 1 is making anyway &mdash; free. From <b>Jabriya</b> he needs a special journey across the city for one man. Same man, very different cost.</p></div>
<div style="flex:1; background:${p.card}; padding:15px 24px; border-radius:14px; border-left:6px solid ${p.rule}">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${p.grn}; margin:0 0 5px">3 &nbsp; FOUR THINGS TO MEASURE</p>
<p style="font-size:24px; line-height:1.32; margin:0">Seats in each vehicle. Whether drivers are our staff or hired. What time the Hawally supply run happens. And the real drive times from Hawally to Ardiya, Jabriya and Kaifan &mdash; only Mahboula to Qurain has been timed.</p></div></div>
${foot(p,'Our recommendation: <b>settle the joker now</b>, because it is free to decide and it changes a route. <b>Measure the three drive times this week</b> &mdash; one man with a watch. And put the driver’s rest in front of whoever signs for safety, because the honest position is that we are holding the kitchen to a standard we are not holding the drivers to, and that is a decision to take deliberately rather than by default.')}`,
`This is the page to stop on. The first row is the only one with a safety argument in it, so do not let the room settle on "one driver, accept it" without saying out loud that it is a conscious choice. The joker decision is free — try to walk out of the room with it. The ${cost}-hour figure is the one that stops anyone proposing the cheap-looking merge; it is measured from the roster, not estimated.`);
}

// ---- the Riggai page ---------------------------------------------------------
function riggaiPage(dark){
  const p=PAL(dark);
  const ka=B.Kaifan, ar=B.Ardiya, ja=B.Jahra;
  const gapOpen=(h(ar.onSite)-h(ka.onSite));
  const cA=h(ar.close)+(h(ar.close)<12?24:0), cK=h(ka.close)+(h(ka.close)<12?24:0);
  const gapClose=cA-cK;
  const card=(t,body,col)=>`<div style="flex:1; background:${p.card}; padding:15px 24px; border-radius:14px; border-left:6px solid ${col}">
<p style="font-size:24px; font-weight:700; letter-spacing:1px; color:${col===p.rule?p.grn:p.org}; margin:0 0 5px">${t}</p>
<p style="font-size:24px; line-height:1.32; margin:0">${body}</p></div>`;

  return shell('logiriggai',p,
`${head(p,'TRANSPORT &nbsp;&middot;&nbsp; THE RIGGAI MOVE','If we move the accommodation to Riggai',
  'Maya Tex is looking at an accommodation in <b>Riggai, directly opposite Ardiya</b>, to house the <b>Ardiya, Kaifan and Jahra</b> men together. It changes the shape of the whole transport plan, so it is worth understanding before it is signed.')}
<table style="width:1664px; font-size:24px; border-collapse:collapse; margin-top:2px">
<tr style="background:${p.th}"><th style="width:17%; text-align:left; color:#FAF7F2; padding:9px 16px">Branch</th>
<th style="width:24%; text-align:left; color:#8FA3AE">Men live today</th>
<th style="width:24%; text-align:left; color:#FAF7F2">Men live after the move</th>
<th style="width:35%; text-align:left; color:#8FA3AE; padding-left:22px">What changes for transport</th></tr>
<tr><td style="padding:9px 16px"><b>Ardiya</b></td><td style="color:${p.mut}">Hawally</td><td><b>Riggai</b></td>
<td style="padding-left:22px">Still needs a driver. Opposite does not mean walking distance.</td></tr>
<tr style="background:${p.alt}"><td style="padding:9px 16px"><b>Kaifan</b></td><td style="color:${p.mut}">Hawally</td><td><b>Riggai</b></td>
<td style="padding-left:22px">Reached by Road 60 and Road 80. May share Ardiya&rsquo;s vehicle &mdash; see the test below.</td></tr>
<tr><td style="padding:9px 16px"><b>Jahra</b></td><td style="color:${p.mut}">&mdash; not open</td><td><b>Riggai</b></td>
<td style="padding-left:22px">Needs the same times as Ardiya, so it cannot share unless we move its start.</td></tr>
<tr style="background:${p.alt}"><td style="padding:9px 16px"><b>Jabriya</b></td><td style="color:${p.mut}">Hawally</td><td style="color:${p.org}"><b>Hawally &mdash; alone</b></td>
<td style="padding-left:22px">Keeps its own driver. The branch everyone forgets in this plan.</td></tr>
<tr><td style="padding:9px 16px"><b>Qurain</b></td><td style="color:${p.mut}">Mahboula</td><td><b>Mahboula</b></td>
<td style="padding-left:22px">No change at all. Driver 1 is unaffected.</td></tr>
</table>
<div style="display:flex; gap:18px">
${card('IT ONLY HAPPENS WHEN JAHRA OPENS','Jahra is still a projection with no approved headcount. Until then the plan on the pages above &mdash; Hawally for Ardiya, Jabriya and Kaifan &mdash; is what we work to. <b>Treat it as the arrangement, not a stopgap.</b>',p.rule)}
${card('ONE VEHICLE OR TWO &mdash; A TEST ANYONE CAN RUN','Kaifan is on site at '+ka.onSite+' and Ardiya at '+ar.onSite+' &mdash; exactly '+gapOpen+' hour apart, and they close '+gapClose+' hour apart too. <b>One vehicle can serve both if Riggai to Kaifan to Ardiya takes under an hour</b>, loading included. Drive it once with a watch.',p.rule)}
${card('JAHRA IS THE ONE WE CAN STILL CHANGE','Jahra needs men at '+ja.onSite+' and '+ar.close+' &mdash; the same minutes as Ardiya, so they cannot share. But Jahra&rsquo;s times were only copied from Jabriya as a placeholder. <b>Move its start by one hour and the clash disappears.</b> Decide before the times harden.','#C4622D')}
</div>
${foot(p,'The move buys one accommodation instead of two and puts three branches on one site &mdash; but it does not by itself reduce the number of drivers. Whether it does depends entirely on the one-hour test above and on whether we are willing to shift Jahra’s start time. Both are answerable before the lease is signed, and both should be.')}`,
`Do not let this be heard as "Riggai saves us drivers". It might, and only if the hour test passes. The useful decision on this page is Jahra's start time, because it is ours to set and it is free today and expensive later. Also make sure Jabriya is noticed — the move leaves it stranded on its own driver and nobody has costed that.`);
}

// ---- write them -------------------------------------------------------------
const ids=[];
LOC.forEach((n,i)=>{
  const dark=i%2===1;
  const html=locPage(n,dark);
  const id=html.match(/id="([^"]+)"/)[1];
  fs.writeFileSync(P+id+'.html',html); ids.push(id);
});
fs.writeFileSync(P+'logiadvice.html',advicePage(LOC.length%2===1)); ids.push('logiadvice');
fs.writeFileSync(P+'logiriggai.html',riggaiPage(LOC.length%2===0)); ids.push('logiriggai');
console.log(ids.join(' '));
