const {DAYS,RESTOK,h,L,RATE}=require('./data.js');
const PROF=[6,6,6,6,7,7,6];               // floor through the peak: six every day, seven Thu/Fri
const WEEKS=4;                            // the roster repeats on a four-week cycle
const CAP=200;                            // overtime budget, hours per branch per month
const B={
 Ardiya :{onSite:'12:00',close:'03:30',open:4,closing:4,peakEnd:'23:00',today:[780,510],
   men:['Keshab Alemagar','Foudman Limbu','James Andrew Refrea','Aaitu Newar','Deb Bahadur Thapa',
        'Rajan Shrestha','Subas Pun Magar','Sudeep Limbu','Suman Karki'],
   sup:['Keshab Alemagar','Foudman Limbu','James Andrew Refrea'],
   note:'Arjun Pariyar and Bikash Bikram Shah are on leave. Opening cut to four and four.'},
 Kaifan :{onSite:'11:00',close:'02:30',open:3,closing:3,peakEnd:'23:00',today:[542,365],
   men:['Dipendra Thapa','Dhirendra Khatri','Milan Tamang','Jash Bahadur Gaha','Kabir Bhattarai',
        'Nilam Tamang','Nishan Rai','Pujan Bhattarai'],
   sup:['Dipendra Thapa','Dhirendra Khatri','Milan Tamang'],
   note:'Opens 11:00 for the Central Kitchen delivery, closes 02:30. Three and three.'},
 Qurain :{onSite:'12:30',close:'03:30',open:3,closing:3,peakEnd:'23:30',today:[732,438],
   men:['Lakpa Dorje Lama','Bimal Chamling','Devram Chaudhary','Dipak Lo','Pramesh Pyakurel',
        'Sandeep Khadka','Saroj KC'],
   sup:['Lakpa Dorje Lama','Bimal Chamling','Devram Chaudhary'],
   note:'Crew boards at Mahboula, twelve minutes away.'},
 Jahra  :{onSite:'12:30',close:'03:30',open:3,closing:3,peakEnd:'23:00',today:[0,0],
   men:['Employee 1','Employee 2','Employee 3','Employee 4','Employee 5','Employee 6'],
   sup:['Employee 1','Employee 2'], newBranch:true,
   supRole:{'Employee 1':'supervisor','Employee 2':'assistant supervisor'},
   note:'Jahra runs Talabat orders only. Shift times are taken from Jabriya and the peak strength is the dine-in standard, both for want of an order curve &mdash; reset them once two weeks of orders have been seen.'},
 Jabriya:{onSite:'12:30',close:'03:30',open:3,closing:4,peakEnd:'23:00',today:[712,485],
   men:['Bibek Nepali','Yogendra Oli','Manish Gurung','Ajay Gurung','Jit Bahadur Thakali',
        'Kristal Ghalan','Mukti Lama','Puran Kumar Thapa','Ram Bahadur Sirmal'],
   sup:['Bibek Nepali','Yogendra Oli','Manish Gurung'],
   note:'Ram Bahadur Sirmal joins from Kaifan on 7 October; Prakash Budha moves to Khairan.'},
};
// ---------------------------------------------------------------------------
// build(n,b) — one branch's roster, under the hard rules in REQUIREMENTS.md §2.
//
// Forward rotation (R6) is STRUCTURAL, not a filter applied afterwards. Each
// man's week has exactly one shape:
//
//     rest day -> First x s -> (changeover) -> Second ... until the rest day
//
// so he can never start earlier tomorrow than he did today. The only legal
// place for a DOUBLE is his last First day: the changeover itself. A man who
// has closed can only close again, or rest. There is no arrangement of this
// shape that produces a Second-then-First turnaround, which is what the old
// allocator kept doing.
//
// s (how many First days a man works before crossing over) is the only free
// variable. Everything else follows. We search over s to meet the floors at
// the least overtime, then spread what overtime there is across the men.
// ---------------------------------------------------------------------------
function build(n,b){
  const men=b.men, N=men.length;

  // R4 — supervisors must not be buddies, or two of them rest the same day and
  // a shift is left without one. Interleave so every pair holds at most one.
  const supL=men.filter(m=>b.sup.includes(m)), hlpL=men.filter(m=>!b.sup.includes(m));
  const ord=[]; let si=0, hi=0;
  while(si<supL.length||hi<hlpL.length){
    if(si<supL.length){ ord.push(supL[si++]); if(hi<hlpL.length) ord.push(hlpL[hi++]); }
    else ord.push(hlpL[hi++]);
  }
  const rest={}, pair={};
  ord.forEach((m,i)=>{ rest[m]=RESTOK[Math.floor(i/2)%RESTOK.length]; pair[m]=Math.floor(i/2)+1; });

  const dblH=(h(b.close)+(h(b.close)<12?24:0))-h(b.onSite)-9;   // a double's extra hours
  const holdH=Math.max(0,h(b.peakEnd)-h(b.onSite)-9);           // holding a First man to the peak
  const isSup=m=>b.sup.includes(m);

  // where day d falls in a man's week: -1 on his rest day, else 0..5
  const pos=(m,d)=>((d-rest[m]+7)%7)-1;
  // his shift that day, given s First days
  const base=(m,s,d)=> d===rest[m] ? 'OFF' : (pos(m,d)<s ? 'First' : 'Second');
  // his one doubleable day — the last First day, which is the changeover
  const chg=(m,s)=> s>0 ? (rest[m]+s)%7 : -1;

  // Lay a week out from one assignment of s, and price it. Doubles cover a
  // short closing; holds cover a short peak. Both are taken from the men
  // carrying the least so far, which is how R9 gets satisfied.
  function lay(S,load){
    const day=[], add={}; men.forEach(m=>add[m]=0);
    let shortOpen=0, shortClose=0, shortPeak=0, noSup=0, ot=0;
    const least=a=>a.slice().sort((x,y)=>(load[x]+add[x])-(load[y]+add[y])
      || (isSup(x)?1:0)-(isSup(y)?1:0) || men.indexOf(x)-men.indexOf(y));
    for(let d=0; d<7; d++){
      const F=men.filter(m=>base(m,S[m],d)==='First');
      const S2=men.filter(m=>base(m,S[m],d)==='Second');

      // a short closing is covered by whoever changes over today
      const canDbl=F.filter(m=>chg(m,S[m])===d);
      const wantDbl=Math.max(0,b.closing-S2.length);
      const dbl=least(canDbl).slice(0,wantDbl);
      shortClose+=wantDbl-dbl.length;

      // R7 — the opening is a hard floor, and never one man
      shortOpen+=Math.max(0,b.open-F.length)+(F.length<2?1:0);

      // R10 — hold First men through the peak to make the floor
      const spanning=S2.length+dbl.length;
      const wantHold=Math.max(0,PROF[d]-spanning);
      const hold=least(F.filter(m=>!dbl.includes(m))).slice(0,wantHold);
      shortPeak+=wantHold-hold.length;

      // R5 — a supervisor on each shift; a doubling supervisor covers both
      if(!F.some(isSup)) noSup++;
      if(!S2.some(isSup)&&!dbl.some(isSup)) noSup++;

      dbl.forEach(m=>add[m]+=dblH); hold.forEach(m=>add[m]+=holdH);
      ot+=dbl.length*dblH+hold.length*holdH;
      day.push({F,S2,dbl,hold,peak:spanning+hold.length});
    }
    // R8 — a double must never sit next to another double for the same man
    let backToBack=0;
    for(const m of men){ const c=chg(m,S[m]);
      if(c>=0 && day[c].dbl.includes(m) && day[(c+6)%7].dbl.includes(m)) backToBack++; }
    const tot=men.map(m=>load[m]+add[m]);
    const imbalance=Math.max(...tot)-Math.min(...tot);
    return {day,add,ot,
      cost: 10000*(shortOpen+shortClose+shortPeak+noSup+backToBack) + 10*ot + imbalance};
  }

  // Search s. Small space, so a hill climb from several starts finds the floor.
  function solve(load){
    let best=null;
    for(let seed=0; seed<12; seed++){
      const S={}; men.forEach((m,i)=>S[m]=(i+seed)%6+1);
      let cur=lay(S,load), moved=true;
      while(moved){ moved=false;
        for(const m of men) for(let v=0; v<=6; v++){
          if(S[m]===v) continue;
          const old=S[m]; S[m]=v;
          const t=lay(S,load);
          if(t.cost<cur.cost-1e-9){ cur=t; moved=true; } else S[m]=old;
        }
      }
      if(!best||cur.cost<best.cost) best={cost:cur.cost,S:Object.assign({},S),r:cur};
    }
    return best;
  }

  // Four weeks, carrying the load forward, so the changeover and the holds
  // move down the list instead of landing on the same man every week (R9).
  const grid={}, otDay=Array(7).fill(0), rows={First:[],Second:[],Double:[],Hold:[],Peak:[]};
  const load={}, perMan={}; men.forEach(m=>{load[m]=0;perMan[m]=0;});
  let wk=0;
  for(let w=0; w<WEEKS; w++){
    const sol=solve(load), S=sol.S, R=sol.r;
    men.forEach(m=>{ load[m]+=R.add[m]; perMan[m]+=R.add[m]; });
    if(w===0){
      for(let d=0; d<7; d++){
        const {F,S2,dbl,hold,peak}=R.day[d];
        for(const m of men){ grid[m]=grid[m]||{};
          grid[m][d] = dbl.includes(m) ? 'DOUBLE'
                     : hold.includes(m) ? 'First +'+holdH+'h'
                     : base(m,S[m],d); }
        otDay[d]=dbl.length*dblH+hold.length*holdH;
        rows.First.push(F.length); rows.Second.push(S2.length+dbl.length);
        rows.Double.push(dbl.length); rows.Hold.push(hold.length); rows.Peak.push(peak);
      }
      wk=R.ot;
    }
  }
  const cyc=Object.values(perMan).reduce((a,c)=>a+c,0);
  const mo=Math.round(cyc/WEEKS*52/12);
  const perMo={}; men.forEach(m=>perMo[m]=Math.round(perMan[m]/WEEKS*52/12*10)/10);
  return {grid,pair,rest,otDay,wk,mo,rows,dblH,holdH,perMo,
          supOT:men.filter(isSup).reduce((a,m)=>a+perMo[m],0)};
}

module.exports={B,PROF,CAP,build};
