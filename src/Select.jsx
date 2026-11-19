import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {HistoryStatusText} from './HistoryStatusText';
import './status-select.css';

function plainText(value){return React.Children.toArray(value).map(c=>React.isValidElement(c)?plainText(c.props.children):String(c)).join('');}
function readOptions(children,group,groupDisabled=false){
 return React.Children.toArray(children).flatMap(option=>{
  if(!React.isValidElement(option))return [];
  if(option.type===React.Fragment)return readOptions(option.props.children,group,groupDisabled);
  if(option.type==='optgroup')return readOptions(option.props.children,option.props.label,Boolean(option.props.disabled));
  if(option.type!=='option')return [];
  return [{value:String(option.props.value??plainText(option.props.children)),label:option.props.children,text:plainText(option.props.children),disabled:groupDisabled||Boolean(option.props.disabled),group}];
 });
}

// Общий Select кабинета: одинаковое меню в macOS, Windows и мобильном браузере.
export function Select({children,value,defaultValue,onChange,className='',style,disabled,onKeyDown,statusOptions=false,...props}){
 const options=readOptions(children),[internal,setInternal]=useState(defaultValue),current=value??internal??options[0]?.value;
 const selected=options.findIndex(o=>o.value===String(current)),[open,setOpen]=useState(false),[active,setActive]=useState(Math.max(0,selected)),[position,setPosition]=useState(null);
 const trigger=useRef(null),popup=useRef(null),typeahead=useRef({text:'',time:0}),id=useId();
 const available=options.map((o,i)=>!o.disabled?i:null).filter(i=>i!==null);
 const initial=()=>available.includes(selected)?selected:available[0]??0;
 const close=()=>setOpen(false);
 const show=()=>{setActive(initial());setPosition(null);setOpen(true)};
 const choose=index=>{const option=options[index];if(!option||option.disabled)return;setInternal(option.value);onChange?.({target:{value:option.value,name:props.name},currentTarget:{value:option.value,name:props.name}});close();trigger.current?.focus({preventScroll:true})};
 useEffect(()=>{if(disabled)setOpen(false)},[disabled]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   const r=trigger.current?.getBoundingClientRect();if(!r)return;
   const vw=document.documentElement.clientWidth,vh=window.innerHeight,width=Math.min(Math.max(r.width,144),vw-24),height=Math.min(popup.current?.scrollHeight||options.length*32+8,320);
   const below=vh-r.bottom-16,above=r.top-16,down=below>=Math.min(height,160)||below>=above,maxHeight=Math.max(32,Math.min(320,down?below:above));
   setPosition({width,left:Math.max(12,Math.min(r.left,vw-width-12)),top:down?r.bottom+4:Math.max(12,r.top-Math.min(height,maxHeight)-4),maxHeight});
  };
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  const outside=e=>{if(!trigger.current?.contains(e.target)&&!popup.current?.contains(e.target))close()};document.addEventListener('pointerdown',outside);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside)};
 },[open,options.length]);
 useEffect(()=>{if(open)popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'})},[active,open]);
 const keys=e=>{
  onKeyDown?.(e);if(e.defaultPrevented)return;
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close();return}
  if(e.key==='Tab'){close();return}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();if(!open){show();return}if(!available.length)return;
   setActive(e.key==='Home'?available[0]:e.key==='End'?available.at(-1):available[(Math.max(0,available.indexOf(active))+(e.key==='ArrowDown'?1:-1)+available.length)%available.length]);
  }else if((e.key==='Enter'||e.key===' ')&&open){e.preventDefault();choose(active)}
  else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){
   e.preventDefault();const now=Date.now(),last=typeahead.current,query=now-last.time>700?e.key:last.text+e.key;typeahead.current={text:query,time:now};
   const ordered=[...available.filter(i=>i>active),...available.filter(i=>i<=active)],match=ordered.find(i=>options[i].text.toLocaleLowerCase('ru').startsWith(query.toLocaleLowerCase('ru')));
   if(match!=null){if(!open){setPosition(null);setOpen(true)}setActive(match)}
  }
 };
 const render=label=>statusOptions?<HistoryStatusText>{label}</HistoryStatusText>:label;
 return <><button {...props} ref={trigger} type="button" role="combobox" className={className+' ui-select status-select-trigger'} style={style} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?id+'-'+active:undefined} onKeyDown={keys} onClick={()=>open?close():show()}><span className="status-select-value" title={options[selected]?.text??''}>{render(options[selected]?.label??'Выберите значение')}</span><img className="status-select-arrow" src="/assets/ChevronDown.svg" alt=""/></button>{open&&createPortal(<div ref={popup} id={id} role="listbox" aria-label={props['aria-label']||'Выбор значения'} className="status-select-popup" style={{...position,visibility:position?'visible':'hidden'}}>{options.map((option,i)=><React.Fragment key={option.value+'-'+i}>{option.group&&option.group!==options[i-1]?.group&&<div className="select-group-label" role="presentation">{option.group}</div>}<button type="button" role="option" tabIndex={-1} id={id+'-'+i} aria-selected={i===selected} disabled={option.disabled} data-active={i===active} onMouseEnter={()=>!option.disabled&&setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}><span>{render(option.label)}</span>{i===selected&&<img src="/assets/ColumnCheck.svg" alt=""/>}</button></React.Fragment>)}</div>,document.body)}</>;
}
