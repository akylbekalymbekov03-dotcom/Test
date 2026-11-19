import React from 'react';
import {warehouseHash} from './warehouse-model.js';
export function WarehouseBreadcrumbs({route,onRoute,Icon}){
 const items=[{label:'Склад',route:{mode:'list'}}];
 if(route.id)items.push({label:'Перемещение '+route.id,route:{mode:'view',id:route.id}});
 if(route.mode==='create')items.push({label:'Создать перемещение'});
 if(route.mode==='edit')items.push({label:'Редактирование'});
 if(route.mode==='discrepancy')items.push({label:'Расхождение при приёмке'});
 return <nav aria-label="Хлебные крошки" style={{flex:1,minWidth:0}}><ol className="wh-breadcrumbs">{items.map((item,i)=><li key={i}>{i>0&&<Icon name="ChevronRight"/>}{i===items.length-1?<span aria-current="page">{item.label}</span>:<a href={warehouseHash(item.route)} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onRoute(item.route,{parent:true})}}}>{item.label}</a>}</li>)}</ol></nav>;
}

