const {DAYS,RESTOK,h,L,RATE}=require('./data.js');
const PROF=[6,6,6,6,7,7,6];               // floor through the peak: six every day, seven Thu/Fri
const WEEKS=4;                            // the roster repeats on a four-week cycle
const CAP=300;                            // default monthly overtime target, hours per branch
const CEIL=400;                           // and the ceiling it must never pass                            // overtime budget, hours per branch per month
const B={
 Ardiya :{onSite:'12:30',close:'03:30',open:4,closing:4,peakEnd:'23:30',today:[780,510],
   men:['Keshab Alemagar','Foudman Limbu','James Andrew Refrea','Aaitu Newar','Deb Bahadur Thapa',
        'Rajan Shrestha','Subas Pun Magar','Sudeep Limbu','Suman Karki'],
   sup:['Keshab Alemagar','Foudman Limbu','James Andrew Refrea'],
   note:'Arjun Pariyar and Bikash Bikram Shah are on leave. Opening cut to four and four.'},
 Kaifan :{onSite:'11:00',firstStart:'12:00',close:'03:30',open:3,closing:3,peakEnd:'23:30',today:[542,365],
   men:['Dipendra Thapa','Dhirendra Khatri','Milan Tamang','Jash Bahadur Gaha','Kabir Bhattarai',
        'Nilam Tamang','Nishan Rai','Pujan Bhattarai'],
   sup:['Dipendra Thapa','Nilam Tamang','Pujan Bhattarai'],
   note:'The delivery crew is on site at 11:00 for the Central Kitchen; the opening band starts with the branch at 12:00, so its nine hours reach 21:00 instead of 20:00. Three and three.'},
 Qurain :{onSite:'12:30',close:'03:30',open:3,closing:3,soloRest:true,peakEnd:'23:30',today:[732,438],
   men:['Lakpa Dorje Lama','Bimal Chamling','Devram Chaudhary','Dipak Lo','Pramesh Pyakurel',
        'Sandeep Khadka','Saroj KC'],
   sup:['Lakpa Dorje Lama','Bimal Chamling','Devram Chaudhary'],
   note:'Crew boards at Mahboula, twelve minutes away.'},
 Jahra  :{onSite:'12:30',close:'03:30',open:3,closing:3,cap:200,ceil:300,peakEnd:'23:30',today:[0,0],
   men:['Employee 1','Employee 2','Employee 3','Employee 4','Employee 5','Employee 6'],
   sup:['Employee 1','Employee 2','Employee 3'], newBranch:true,
   supRole:{'Employee 1':'supervisor','Employee 2':'assistant supervisor','Employee 3':'acting'},
   note:'Jahra runs Talabat orders only. Shift times are taken from Jabriya and the floor is the dine-in standard, both for want of an order curve &mdash; reset once two weeks of orders have been seen.'},
Mahboula:{onSite:'13:30',close:'01:30',open:2,closing:2,soloRest:true,peakEnd:'23:30',today:[0,0],
   cap:150,ceil:200, prof:[4,4,4,4,4,4,4],
   men:['Suman Bishwakarma','Sanamsing Siangtan','Uttam Chaudhary'],
   sup:['Suman Bishwakarma'],
   note:'Mahboula is walking distance from the accommodation, so no transport. Two to open and two to close replaces the single straight shift. The floor here is the branch&rsquo;s own four, not the dine-in six.'},
 Jabriya:{onSite:'12:30',close:'03:30',open:4,closing:4,peakEnd:'23:30',today:[712,485],
   men:['Bibek Nepali','Yogendra Oli','Manish Gurung','Ajay Gurung','Jit Bahadur Thakali',
        'Kristal Ghalan','Mukti Lama','Puran Kumar Thapa','Ram Bahadur Sirmal'],
   sup:['Bibek Nepali','Yogendra Oli','Manish Gurung'],
   note:'Ram Bahadur Sirmal joins from Kaifan on 7 October; Prakash Budha moves to Khairan.'},
};
// ---------------------------------------------------------------------------
// build(n,b) — one branch's roster, under REQUIREMENTS.md §2.
//
// THREE bands, because two cannot cover the rush without paying overtime:
//     First   onSite        -> onSite + 9       (arrives an hour before opening)
//     Peak    peakEnd - 9   -> peakEnd          (nine hours, covers the rush, NO overtime)
//     Second  close - 9     -> close           (18:30 at a branch closing 03:30)
//
// Holding a First man past his nine hours was what burned the budget. A Peak
// band reaches the same hour for nothing.
//
// Forward rotation (R6) is structural: First starts earliest, then Peak, then
// Second, so a man's week can only ever move forward --
//     rest day -> First... -> Peak... -> Second... -> rest day
// and he can never start earlier tomorrow than he did today.
//
// R8: a DOUBLE may ONLY fall on the first working day after a man's rest day.
// He comes off a full day off, works through, and is on Second from then on.
// Nobody is ever held late and then doubled the next morning.
// ---------------------------------------------------------------------------
// The search is expensive and every generator asks for the same rosters, so
// results are cached on the branch's parameters. Same input, same roster.
const _fs=require('fs'), _CF=__dirname+'/.roster-cache.json';
let _cache=new Map();
try{ _cache=new Map(Object.entries(JSON.parse(_fs.readFileSync(_CF,'utf8')))); }catch(e){}
let _dirty=false;
process.on('exit',()=>{ if(_dirty) try{
  _fs.writeFileSync(_CF, JSON.stringify(Object.fromEntries(_cache))); }catch(e){} });
function build(n,b){
  const key=JSON.stringify([n,b.men,b.sup,b.onSite,b.firstStart,b.close,b.open,b.closing,
                            b.peakEnd,b.soloRest,b.prof,b.cap]);
  if(_cache.has(key)) return _cache.get(key);
  const out=_build(n,b); _cache.set(key,out); _dirty=true; return out;
}
function _build(n,b){
  const men=b.men, N=men.length;

  // R4 — supervisors must never be buddies
  const supL=men.filter(m=>b.sup.includes(m)), hlpL=men.filter(m=>!b.sup.includes(m));
  const ord=[]; let si=0, hi=0;
  while(si<supL.length||hi<hlpL.length){
    if(si<supL.length){ ord.push(supL[si++]); if(hi<hlpL.length) ord.push(hlpL[hi++]); }
    else ord.push(hlpL[hi++]);
  }
  const rest={}, pair={};
  if(b.soloRest){
    // One man off each day instead of a whole pair, spread over all seven days.
    // That keeps the branch at full strength every day of the week, which a
    // seven-man branch cannot do while buddies rest together.
    ord.forEach((m,i)=>{ rest[m]=i%7; pair[m]=i+1; });
  } else {
    ord.forEach((m,i)=>{ rest[m]=RESTOK[Math.floor(i/2)%RESTOK.length]; pair[m]=Math.floor(i/2)+1; });
  }

  const close=h(b.close)+(h(b.close)<12?24:0);
  const ss=close-9;                           // Second starts nine hours before close
  const prof=b.prof||PROF;                    // a branch may carry its own floor
  const cap=b.cap||CAP;
  const fs=b.firstStart||b.onSite;            // when the First band's nine hours begin
  const dblH=close-h(b.onSite)-9;             // a double still arrives for the delivery
  const peakStart=L(h(b.peakEnd)-9);          // the Peak band's start time
  const holdH=Math.max(0,h(b.peakEnd)-h(fs)-9);         // last resort: hold a First man late
  const opens=L(h(b.onSite)+1);               // the branch opens an hour after arrival
  const isSup=m=>b.sup.includes(m);

  const pos=(m,d)=>((d-rest[m]+7)%7)-1;                       // -1 on his rest day, else 0..5
  const band=(m,A,P,d)=>{ if(d===rest[m]) return 'OFF';
    const p=pos(m,d); return p<A ? 'First' : p<A+P ? 'Peak' : 'Second'; };

  function lay(SA,SP,load){
    const day=[], add={}; men.forEach(m=>add[m]=0);
    let shortOpen=0, shortClose=0, shortPeak=0, noSup=0, ot=0;
    const least=a=>a.slice().sort((x,y)=>(load[x]+add[x])-(load[y]+add[y])
      || (isSup(x)?1:0)-(isSup(y)?1:0) || men.indexOf(x)-men.indexOf(y));
    for(let d=0; d<7; d++){
      const F=men.filter(m=>band(m,SA[m],SP[m],d)==='First');
      const P=men.filter(m=>band(m,SA[m],SP[m],d)==='Peak');
      const S=men.filter(m=>band(m,SA[m],SP[m],d)==='Second');

      // R8 — a double only on the first working day after the rest day
      // A double is legal when the day BEFORE it is a rest day or a First shift
      // (so he is not coming off a 03:30 close), and the day AFTER is Second or
      // his rest day (so he never opens the morning after closing). That is the
      // day-before-or-after-the-day-off rule, both sides of it.
      // A double only ever the day AFTER a rest day, and he is on Second from the
      // next day on. The day before must be the rest day itself, so a man can
      // never be held late and then doubled the next morning.
      const canDbl=men.filter(m=>{
        const t=band(m,SA[m],SP[m],d); if(t==='OFF') return false;
        return band(m,SA[m],SP[m],(d+6)%7)==='OFF'
            && band(m,SA[m],SP[m],(d+1)%7)==='Second';
      });
      const wantDbl=Math.max(0, Math.max(b.open-F.length, b.closing-S.length));
      const dbl=least(canDbl).slice(0,Math.max(0,wantDbl));

      // a man who doubles is ONE body at the door, not two -- count the union
      const openCt =F.length+dbl.filter(m=>!F.includes(m)).length;
      const closeCt=S.length+dbl.filter(m=>!S.includes(m)).length;
      let peakCt=P.length+S.length+dbl.filter(m=>!P.includes(m)&&!S.includes(m)).length;
      // if the Peak band cannot make the floor, hold First men late -- this costs
      // overtime, so the search only reaches for it when headcount leaves no choice
      const wantHold=Math.max(0,prof[d]-peakCt);
      const hold=least(F.filter(m=>!dbl.includes(m))).slice(0,wantHold);
      peakCt+=hold.length;

      shortOpen +=Math.max(0,b.open-openCt)+(openCt<2?1:0);   // R7
      shortClose+=Math.max(0,b.closing-closeCt);              // R7
      shortPeak +=Math.max(0,prof[d]-peakCt);                 // R10

      // R5 — a supervisor on the opening and on the closing; a double covers both
      if(!F.some(isSup)&&!dbl.some(isSup)) noSup++;
      if(!S.some(isSup)&&!dbl.some(isSup)) noSup++;

      dbl.forEach(m=>add[m]+=dblH); hold.forEach(m=>add[m]+=holdH);
      ot+=dbl.length*dblH+hold.length*holdH;
      day.push({F,P,S,dbl,hold,peak:peakCt,open:openCt,close:closeCt});
    }
    const tot=men.map(m=>load[m]+add[m]);
    return {day,add,ot,
      cost:100000*(shortOpen+shortClose+shortPeak+noSup) + 100*ot + 0.2*(Math.max(...tot)-Math.min(...tot))};
  }

  function solve(load){
    let best=null;
    for(let seed=0; seed<3*(men.length+1); seed++){
      const SA={}, SP={};
      // Structured starts: split the crew into First-heavy "openers" and
      // Second-heavy "closers" in varying proportions. A branch that must put
      // four at the door every day needs some men who stay on First all week,
      // and a drifting start never produces that shape.
      const k=seed%(N+1), mode=Math.floor(seed/(N+1));
      men.forEach((m,i)=>{
        if(mode===0){ SA[m]=i<k?6:1; SP[m]=0; }
        else if(mode===1){ SA[m]=i<k?6:0; SP[m]=i<k?0:2; }
        else { SA[m]=(i*3+seed)%6; SP[m]=(i*2+seed*3)%4; }
      });
      let cur=lay(SA,SP,load), moved=true, guard=0;
      while(moved&&guard++<60){ moved=false;
        for(const m of men) for(let a=0;a<=6;a++) for(let p=0;a+p<=6;p++){
          if(SA[m]===a&&SP[m]===p) continue;
          const oa=SA[m], op=SP[m]; SA[m]=a; SP[m]=p;
          const t=lay(SA,SP,load);
          if(t.cost<cur.cost-1e-9){ cur=t; moved=true; } else { SA[m]=oa; SP[m]=op; }
        }
      }
      // Single-man moves plateau: fixing one day's opening often needs two men to
      // move together. Shake two at random, re-converge, keep it only if better.
      let bSA={...SA}, bSP={...SP}, bcur=cur;
      for(let kick=0; kick<6; kick++){
        const s2={...bSA}, p2={...bSP};
        for(let t=0;t<2;t++){ const m=men[(seed*7+kick*3+t*5)%men.length];
          s2[m]=(s2[m]+1+kick)%7; p2[m]=(p2[m]+kick)%Math.max(1,7-s2[m]); }
        let c2=lay(s2,p2,load), mv=true, g2=0;
        while(mv&&g2++<40){ mv=false;
          for(const m of men) for(let a=0;a<=6;a++) for(let p=0;a+p<=6;p++){
            if(s2[m]===a&&p2[m]===p) continue;
            const oa=s2[m], op=p2[m]; s2[m]=a; p2[m]=p;
            const t2=lay(s2,p2,load);
            if(t2.cost<c2.cost-1e-9){ c2=t2; mv=true; } else { s2[m]=oa; p2[m]=op; }
          }
        }
        if(c2.cost<bcur.cost-1e-9){ bcur=c2; bSA={...s2}; bSP={...p2}; }
      }
      if(!best||bcur.cost<best.cost) best={cost:bcur.cost,SA:bSA,SP:bSP,r:bcur};
    }
    return best;
  }

  const grid={}, otDay=Array(7).fill(0), rows={First:[],Peak:[],Second:[],Double:[],Hold:[]};
  const load={}, perMan={}; men.forEach(m=>{load[m]=0;perMan[m]=0;});
  let wk=0;
  for(let w=0; w<WEEKS; w++){
    const sol=solve(load), {SA,SP,r:R}=sol;
    men.forEach(m=>{ load[m]+=R.add[m]; perMan[m]+=R.add[m]; });
    if(w===0){
      for(let d=0; d<7; d++){
        const {F,P,S,dbl,hold,peak}=R.day[d];
        for(const m of men){ grid[m]=grid[m]||{};
          grid[m][d]= dbl.includes(m) ? 'DOUBLE'
                    : hold.includes(m) ? 'First +'+holdH+'h'
                    : band(m,SA[m],SP[m],d); }
        otDay[d]=dbl.length*dblH+hold.length*holdH;
        rows.First.push(F.length); rows.Peak.push(peak);
        rows.Second.push(S.length+dbl.length); rows.Double.push(dbl.length); rows.Hold.push(hold.length);
      }
      wk=R.ot;
    }
  }
  const cyc=Object.values(perMan).reduce((a,c)=>a+c,0);
  const mo=Math.round(cyc/WEEKS*52/12);
  const perMo={}; men.forEach(m=>perMo[m]=Math.round(perMan[m]/WEEKS*52/12*10)/10);
  return {grid,pair,rest,otDay,wk,mo,rows,dblH,holdH,peakStart,opens,secondStart:L(ss%24),cap,ceil:b.ceil||CEIL,prof,perMo,
          supOT:men.filter(isSup).reduce((a,m)=>a+perMo[m],0)};
}

module.exports={B,PROF,CAP,CEIL,build};
