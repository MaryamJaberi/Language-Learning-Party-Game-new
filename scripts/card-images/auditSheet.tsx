/**
 * برگهٔ بازبینی چشمی صحنه‌ها: یک صفحهٔ HTML از نمونه‌ای از کارت‌ها با همان تکه‌های Canva که اپ نشان می‌دهد.
 *   npx tsx scripts/card-images/auditSheet.tsx out.html scenes 5      (نمونهٔ صحنه‌ها؛ عدد = بذر نمونه)
 *   npx tsx scripts/card-images/auditSheet.tsx out.html props 3       (صحنه‌های دارای وسیله)
 *   npx tsx scripts/card-images/auditSheet.tsx out.html none 1        (کارت‌های بی‌تصویر و دلیلشان)
 *   npx tsx scripts/card-images/auditSheet.tsx out.html keys c_green_salad c_salad
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArtSceneContent } from '../../src/visual/ArtScene';
import ArtThumb from '../../src/visual/ArtThumb';
import { allEntries } from '../../src/visual/lexicon';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..') + '/';
const art=JSON.parse(fs.readFileSync(R+'public/data/art/art.json','utf8'));
const plan=JSON.parse(fs.readFileSync(R+'data/card-images/plan.json','utf8'));
const en:Record<string,string>={}; for(const r of plan) en[r.conceptId]=r.en;
const all:Record<string,any>={}; for(let n=0;n<16;n++) Object.assign(all,JSON.parse(fs.readFileSync(R+`public/data/scenes/${n}.json`,'utf8')));
const want=process.argv.slice(3);
let keys=Object.keys(all).filter(k=>!k.startsWith('d_'));
let pick:string[]=[];
if(want[0]==='props') pick=keys.filter(k=>all[k].props?.length); else if(want[0]==='none') pick=keys.filter(k=>all[k].none); else if(want[0]==='lex') pick=keys.filter(k=>all[k].lex); else pick=keys.filter(k=>all[k].actors);
const seed=Number(want[1]||1); pick=pick.filter((_,i)=>(i*2654435761+seed*97)%pick.length< (48*1.0)).slice(0,48);
if(want[0]==='keys') pick=want.slice(1);
const cells=pick.map(k=>{const s=all[k]; let body='';
  if(s.none) body=`<div style="height:156px;display:flex;align-items:center;justify-content:center;background:#eee;color:#999">— ${s.none} ${s.want||''} —</div>`;
  else if(s.lex){const e=allEntries().find(x=>x.id===s.lex)!; body='<div style="width:156px;margin:auto">'+renderToStaticMarkup(<ArtThumb visual={e.visual} art={art}/>)+'</div>';}
  else body=renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width={240} height={156}><ArtSceneContent spec={s} art={art}/></svg>);
  return `<div style="width:240px;font:11px sans-serif;margin:3px"><div style="height:28px;overflow:hidden"><b>${en[k]||k}</b></div>${body}</div>`;});
let html=`<html><body style="margin:0;display:flex;flex-wrap:wrap;width:1500px">${cells.join('')}</body></html>`;
html=html.replace(/href="[^"]*data\/art\//g,'href="file://'+R+'public/data/art/');
fs.writeFileSync(process.argv[2],html);
