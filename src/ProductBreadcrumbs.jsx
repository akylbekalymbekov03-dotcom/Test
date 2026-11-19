import React from 'react';
import {productHash} from './product-navigation.js';

export function ProductBreadcrumbs({route,onNavigate,Icon,sectionLabel='Товары',detailLabel='Детали товара',createLabel='Создание товара',hashFor=productHash}){
 const items=[{label:sectionLabel,route:{mode:'list'}}];
 if(route.mode==='create')items.push({label:createLabel});
 if(route.mode==='view'||route.mode==='edit')items.push({label:detailLabel,route:{mode:'view',id:route.id}});
 if(route.mode==='edit')items.push({label:'Редактирование'});
 return <nav aria-label="Хлебные крошки" style={{flex:1,minWidth:0}}>
  <ol style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'4px 12px',listStyle:'none',padding:0,margin:0,lineHeight:'24px'}}>
   {items.map((item,i)=><li key={item.label} style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
    {i>0&&<span aria-hidden="true" style={{display:'flex',flexShrink:0}}><Icon name="ChevronRight"/></span>}
    {i===items.length-1?<span aria-current="page" style={{color:'#0b0b0a'}}>{item.label}</span>:<a href={hashFor(item.route)} onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onNavigate(item.route,{parent:true})}}} style={{color:'#42413d',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>{item.label}</a>}
   </li>)}
  </ol>
 </nav>;
}
