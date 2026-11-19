import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import './interface-motion.css';

const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const groups='[role="tablist"],.periods>div:first-child,.expense-tabs,.cp-periods,.hs-tabs,.wh-tabs';

// Плашка следует за реальной выбранной кнопкой; логика и клавиатурное управление остаются у вкладок.
export function useInterfaceMotion(){
 useEffect(()=>{
  let frame=0,disposed=false;const tracked=new Set();
  const resize=new ResizeObserver(()=>schedule());
  const measure=()=>{
   frame=0;
   for(const group of tracked)if(!group.isConnected){resize.unobserve(group);tracked.delete(group)}
   document.querySelectorAll(groups).forEach(group=>{
    const style=getComputedStyle(group);
    if(parseFloat(style.borderRadius)<6||style.backgroundColor==='rgba(0, 0, 0, 0)'||!group.getBoundingClientRect().width)return;
    if(!tracked.has(group)){tracked.add(group);resize.observe(group)}
    const active=group.querySelector('button[aria-selected="true"],button[aria-pressed="true"]');
    if(!active){group.style.setProperty('--motion-tab-opacity','0');return}
    const box=group.getBoundingClientRect(),button=active.getBoundingClientRect();
    for(const [key,value] of Object.entries({x:button.left-box.left-group.clientLeft+group.scrollLeft,y:button.top-box.top-group.clientTop+group.scrollTop,w:button.width,h:button.height}))group.style.setProperty('--motion-tab-'+key,value+'px');
    group.style.setProperty('--motion-tab-opacity','1');
    if(!group.hasAttribute('data-motion-segment')){group.setAttribute('data-motion-segment','initial');requestAnimationFrame(()=>!disposed&&group.isConnected&&group.setAttribute('data-motion-segment','ready'))}
   });
  };
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(measure)};
  const observer=new MutationObserver(records=>{
   schedule();if(reduceMotion())return;
   for(const record of records)if(record.attributeName==='aria-selected'&&record.target.getAttribute('aria-selected')==='true'){
    const panel=document.getElementById(record.target.getAttribute('aria-controls'));
    panel?.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.2,.75,.25,1)'});
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-selected','aria-pressed']});
  document.fonts.ready.then(schedule);window.addEventListener('resize',schedule);schedule();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();window.removeEventListener('resize',schedule);for(const group of tracked)group.removeAttribute('data-motion-segment')};
 },[]);
}

export function usePageMotion(key){
 useEffect(()=>{
  if(reduceMotion())return;
  const page=document.querySelector('main.main');
  const animation=page?.animate([{opacity:.45,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.75,.25,1)'});
  return()=>animation?.cancel();
 },[key]);
}

function NumberText({value}){
 const unit=value.endsWith(' с'),body=unit?value.slice(0,-2):value;
 return <>{Array.from(body).map((char,i)=><span className="motion-number-glyph" key={i+'-'+char} style={{'--digit-delay':Math.min(i*9,72)+'ms'}}>{char}</span>)}{unit&&<span className="motion-number-unit"> с</span>}</>;
}

// Показываются только реальные значения до/после изменения, без вымышленных промежуточных сумм.
export function AnimatedValue({value}){
 const text=String(value),last=useRef(text),[previous,setPrevious]=useState(null);
 useLayoutEffect(()=>{
  if(last.current===text)return;
  const before=last.current;last.current=text;
  if(reduceMotion()){setPrevious(null);return}
  setPrevious(before);const timer=setTimeout(()=>setPrevious(null),320);
  return()=>clearTimeout(timer);
 },[text]);
 return <span className="motion-number" data-changing={previous!==null}><span className="motion-sr-only">{text}</span>{previous!==null&&<span className="motion-number-previous" aria-hidden="true"><NumberText value={previous}/></span>}<span className="motion-number-current" aria-hidden="true" key={text}><NumberText value={text}/></span></span>;
}
