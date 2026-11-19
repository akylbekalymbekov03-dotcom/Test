import React from 'react';

const tones={
 'Активен':['#d8f999','#032e15'],'Уволен':['#ffe2e2','#e7000b'],'Заблокирован':['#ffe2e2','#e7000b'],'Деактивирован':['white','#42413d'],
 'Ожидает оплаты':['white','#0b0b0a'],'Оплачен':['#d8f999','#032e15'],'Долг':['#ffe2e2','#e7000b'],'Долг магазина':['#ffe2e2','#e7000b'],'Наличные не сданы':['#ffd6a7','#441306'],'Возврат':['#bedbff','#162456'],'Отменен':['white','#0b0b0a'],
 'Ожидает подтверждения':['white','#0b0b0a'],'Подтвержден':['#bedbff','#162456'],'Отказан':['#ffe2e2','#b91c1c'],'Возмещен':['#d8f999','#032e15'],
 'Принято':['#d8f999','#032e15'],'Частично принято':['#ffd6a7','#441306'],'Отклонено':['#ffe2e2','#e7000b'],
};
const pattern=new RegExp('(?<![\\p{L}\\p{N}])('+Object.keys(tones).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}])','gu');
export function HistoryStatusText({children,renderStatus}){
 if(typeof children!=='string')return children;
 const parts=children.split(pattern);
 return <>{parts.map((part,i)=>{
  if(!tones[part])return <React.Fragment key={i}>{part}</React.Fragment>;
  if(renderStatus)return <React.Fragment key={i}>{renderStatus(part)}</React.Fragment>;
  const [background,color]=tones[part];
  return <span key={i} style={{display:'inline-flex',verticalAlign:'baseline',whiteSpace:'nowrap',borderRadius:26,padding:'2px 8px',fontSize:12,fontWeight:500,lineHeight:'16px',background:background==='white'?'var(--neutral-status-background, white)':background,color}}>{part}</span>;
 })}</>;
}
