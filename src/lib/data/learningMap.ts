import { mediaEscape as escape } from './presentationMedia';
import type { ConvReport, ReportSection } from './outputs';

export interface LearningRoute { observation:string; change:string; check:string }
export interface LearningMap { question:string; routes:[LearningRoute,LearningRoute]; review?:string; decision?:{question:string;yes:string;no:string} }

export const fiveSMap: LearningMap = {
  question:'Where is the task losing time?',
  routes:[
    {observation:'People search for the right item',change:'Sort, then put it at point of use',check:'Time the same retrieval again'},
    {observation:'A defect goes unnoticed',change:'Clean to inspect and expose the fault',check:'Can the next shift see the abnormality?'},
  ],
  decision:{question:'Did the original loss fall?',yes:'Agree the standard and sustain it',no:'Observe again and revise the trial'},
  review:'If the change works, standardise it and agree who will sustain it. If the loss persists, observe the task again and revise the change.',
};

/** The author supplies the alternatives and consequences. Other tables retain their original presentation. */
export function mapFromTable(question:string, table:{headings:string[];rows:string[][]}): LearningMap | undefined {
  if (table.headings.map(h=>h.trim().toLowerCase()).join('|')!=='observation|change to try|check') return;
  if (table.rows.length!==2 || !table.rows.every(r=>r.length===3 && r.every(v=>v.trim().length>0 && v.length<=68 && v.split(/\s+/).every(w=>w.length<=18)))) return;
  const route = ([observation,change,check]:string[]):LearningRoute=>({observation,change,check});
  return {question,routes:[route(table.rows[0]),route(table.rows[1])]};
}

function lines(text:string, limit:number) {
  const result:string[]=[];
  for (const word of text.split(/\s+/)) {
    const last=result.length-1;
    if (last<0 || (result[last]+' '+word).length>limit) result.push(word);
    else result[last]+=' '+word;
  }
  return result;
}

const labels:[keyof LearningRoute,string][]=[['observation','Observe'],['change','Try'],['check','Check']];
const fills:{[K in keyof LearningRoute]:string}={observation:'#fff3d9',change:'#f1f6f8',check:'#eaf3e9'};
function mapDescription(map:LearningMap) {
  return map.routes.map((r,i)=>'Path '+(i+1)+'. Observe: '+r.observation+'. Try: '+r.change+'. Check: '+r.check+'.').join(' ')+(map.decision?' '+map.decision.question+' Yes: '+map.decision.yes+'. No: '+map.decision.no+'.':'');
}
function mapSvg(width:number, height:number, map:LearningMap, drawing:string) {
  const description=mapDescription(map);
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+escape(map.question+' '+description)+'" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><title>'+escape(map.question)+'</title><desc>'+escape(description)+'</desc>'+drawing+'</svg>';
}
function mapText(rows:string[],cx:number,y:number,color:string,size:number,step:number,bold=false) {
  return '<text x="'+cx+'" y="'+y+'" fill="'+color+'" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" font-weight="'+(bold?700:500)+'">'+
    rows.map((s,i)=>'<tspan x="'+cx+'" dy="'+(i?step:0)+'">'+escape(s)+'</tspan>').join('')+'</text>';
}
const mapPath=(d:string,color='#487265')=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
const arrowDown=(cx:number,y:number)=>mapPath('M'+(cx-4)+' '+(y-5)+' l4 5 4 -5');
const arrowRight=(x:number,y:number)=>mapPath('M'+(x-5)+' '+(y-4)+' l5 4 -5 4');

/** Portrait for HTML and paper. Landscape for 16:9 slides, same words, larger type across the width. */
export function learningMapSvg(map:LearningMap, layout:'portrait'|'landscape'='portrait') {
  return layout==='landscape' ? landscapeMap(map) : portraitMap(map);
}

export function mapViewSize(svg:string) {
  const box=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return box ? {width:Number(box[1]),height:Number(box[2])} : undefined;
}

function portraitMap(map:LearningMap) {
  const width=740, font=18, step=font+5, gutter=28, margin=14;
  const col=(width-margin*2-gutter)/2, x=[margin,margin+col+gutter];
  const middle=x.map(left=>left+col/2);
  const wrap=(s:string)=>lines(s,Math.max(10,Math.floor((col-26)/(font*.57))));
  const q=lines(map.question,58), top=12, qHeight=20+step*q.length, center=width/2;
  const qwidth=width * .65, left=(width-qwidth)/2, end=top+qHeight;
  let drawing='<rect x="'+left+'" y="'+top+'" width="'+qwidth+'" height="'+qHeight+'" rx="'+(qHeight/2)+'" fill="#e5f1eb" stroke="#2a6557" stroke-width="2"/>'+
    mapText(q,center,top+font+9,'#154237',font,step,true);
  const split=end+13;
  drawing+=mapPath('M'+center+' '+end+' V'+split+' M'+middle[0]+' '+split+' H'+middle[1]);
  let y=split+16;
  for(const [key,label] of labels){
    const words=map.routes.map(r=>wrap(r[key]));
    const height=27+Math.max(...words.map(w=>w.length))*step+10;
    for(const [i,cx] of middle.entries()){
      drawing+=mapPath('M'+cx+' '+(y-16)+' V'+(y-2))+arrowDown(cx,y-2);
      drawing+='<rect x="'+x[i]+'" y="'+y+'" width="'+col+'" height="'+height+'" rx="9" fill="'+fills[key]+'" stroke="#9dafa5"/>'+
        mapText([label],cx,y+18,'#42594f',14,step,true)+mapText(words[i],cx,y+20+step,'#173832',font,step,true);
    }
    y+=height+19;
  }
  if (map.decision) {
    const junction=y-6, decisionTop=y+10, decisionHeight=38;
    drawing+=mapPath('M'+middle[0]+' '+(y-19)+' V'+junction+' H'+middle[1]+' V'+(y-19)+' M'+center+' '+junction+' V'+decisionTop);
    drawing+='<rect x="'+left+'" y="'+decisionTop+'" width="'+qwidth+'" height="'+decisionHeight+'" rx="18" fill="#e5f1eb" stroke="#2a6557" stroke-width="2"/>'+
      mapText([map.decision.question],center,decisionTop+25,'#154237',font,step,true);
    const fork=decisionTop+decisionHeight+12, last=fork+14;
    drawing+=mapPath('M'+center+' '+(decisionTop+decisionHeight)+' V'+fork+' M'+middle[0]+' '+fork+' H'+middle[1]);
    const choices=[map.decision.yes,map.decision.no].map(wrap);
    const cardHeight=26+Math.max(...choices.map(w=>w.length))*step+8;
    middle.forEach((cx,i)=>{
      drawing+=mapPath('M'+cx+' '+fork+' V'+(last-2))+arrowDown(cx,last-2);
      drawing+='<rect x="'+x[i]+'" y="'+last+'" width="'+col+'" height="'+cardHeight+'" rx="8" fill="'+(i?'#fff3d9':'#e5f1eb')+'" stroke="#9dafa5"/>'+
        mapText([i?'No':'Yes'],cx,last+17,'#42594f',14,step,true)+mapText(choices[i],cx,last+20+step,'#173832',font,step,true);
    });
    y=last+cardHeight+7;
  }
  return mapSvg(width,y,map,drawing);
}

function landscapeMap(map:LearningMap) {
  const width=1280, font=24, step=30, gutter=24, margin=32, cols=3;
  const col=(width-margin*2-gutter*(cols-1))/cols;
  const x=[0,1,2].map(i=>margin+i*(col+gutter));
  const wrap=(s:string)=>lines(s,Math.max(8,Math.floor((col-30)/(font*.52))));
  const q=lines(map.question,72), top=16, qHeight=24+step*q.length, center=width/2;
  const qwidth=width*.7, left=(width-qwidth)/2, end=top+qHeight;
  let drawing='<rect x="'+left+'" y="'+top+'" width="'+qwidth+'" height="'+qHeight+'" rx="'+(qHeight/2)+'" fill="#e5f1eb" stroke="#2a6557" stroke-width="2"/>'+
    mapText(q,center,top+font+10,'#154237',font,step,true);
  let y=end+20;
  map.routes.forEach(route=>{
    const words=labels.map(([key])=>wrap(route[key]));
    const height=30+Math.max(...words.map(w=>w.length))*step+12;
    labels.forEach(([key,label],i)=>{
      const cx=x[i]+col/2;
      drawing+='<rect x="'+x[i]+'" y="'+y+'" width="'+col+'" height="'+height+'" rx="10" fill="'+fills[key]+'" stroke="#9dafa5"/>'+
        mapText([label],cx,y+20,'#42594f',16,step,true)+mapText(words[i],cx,y+22+step,'#173832',font,step,true);
      if (i) {
        const from=x[i-1]+col, to=x[i], ay=y+height/2;
        drawing+=mapPath('M'+from+' '+ay+' H'+(to-2))+arrowRight(to-2,ay);
      }
    });
    y+=height+18;
  });
  if (map.decision) {
    const decisionHeight=44, half=(width-margin*2-gutter)/2, yesX=margin, noX=margin+half+gutter;
    drawing+='<rect x="'+left+'" y="'+y+'" width="'+qwidth+'" height="'+decisionHeight+'" rx="20" fill="#e5f1eb" stroke="#2a6557" stroke-width="2"/>'+
      mapText([map.decision.question],center,y+30,'#154237',font,step,true);
    const last=y+decisionHeight+16, yesCx=yesX+half/2, noCx=noX+half/2;
    drawing+=mapPath('M'+center+' '+(y+decisionHeight)+' V'+(last-6)+' M'+yesCx+' '+(last-6)+' H'+noCx);
    const wrapped=[map.decision.yes,map.decision.no].map(wrap);
    const cardHeight=28+Math.max(...wrapped.map(w=>w.length))*step+10;
    ([[yesX,yesCx,'Yes','#e5f1eb'],[noX,noCx,'No','#fff3d9']] as const).forEach(([leftX,cx,label,fill],i)=>{
      drawing+=mapPath('M'+cx+' '+(last-6)+' V'+(last-2))+arrowDown(cx,last-2);
      drawing+='<rect x="'+leftX+'" y="'+last+'" width="'+half+'" height="'+cardHeight+'" rx="9" fill="'+fill+'" stroke="#9dafa5"/>'+
        mapText([label],cx,last+18,'#42594f',16,step,true)+mapText(wrapped[i],cx,last+20+step,'#173832',font,step,true);
    });
    y=last+cardHeight+8;
  }
  return mapSvg(width,y,map,drawing);
}

export function learningMapHtml(map:LearningMap) {
  const compact='<div class="lg-map-small"><strong class="lg-root">'+escape(map.question)+'</strong><div class="lg-branches">'+
    map.routes.map((r,i)=>'<details class="lg-branch"'+(i===0?' open':'')+'><summary>'+escape(r.observation)+'</summary><ol>'+
      '<li><span>Try</span>'+escape(r.change)+'</li><li><span>Check</span>'+escape(r.check)+'</li></ol></details>').join('')+'</div>'+
    (map.decision?'<strong class="lg-root">'+escape(map.decision.question)+'</strong><dl class="lg-choices"><dt>Yes</dt><dd>'+escape(map.decision.yes)+'</dd><dt>No</dt><dd>'+escape(map.decision.no)+'</dd></dl>':'')+'</div>';
  return '<figure class="lg-learning" data-guide-figure="learning-map"><figcaption>Follow an observation to a change you can test</figcaption>'+
    '<div class="lg-map-wide">'+learningMapSvg(map)+'</div>'+compact+
    (map.review?'<details class="lg-review"><summary>What do you do with the result?</summary><p>'+escape(map.review)+'</p></details>':'')+'</figure>';
}

/** Keep the task in sight. Examples and background remain one disclosure away in a teaching document. */
export function lessonReading(report:ConvReport,section:ReportSection) {
  if (section.kind!=='text' || !section.text || (report.purpose!=='training' && !/\b(?:training guide|lesson|course)\b/i.test(report.title))) return;
  const paragraphs=section.text.trim().split(/\n\s*\n/);
  if (paragraphs.length<2 || paragraphs[0].startsWith('|')) return;
  const first=paragraphs[0].match(/^(.+?[.!?])(?:\s+|$)([\s\S]*)$/);
  const lead=first?.[1] ?? paragraphs[0];
  const detail=[first?.[2],...paragraphs.slice(1)].filter(Boolean).join('\n\n');
  return {lead,detail};
}
