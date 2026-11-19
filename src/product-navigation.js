export function readCabinetLocation(hash){
 const parts=String(hash||'').replace(/^#\/?/,'').split('/').filter(Boolean);
 if(!parts.length||parts[0]==='summary')return {section:'Сводка',route:{mode:'list'}};
 if(parts[0]==='counterparties'){try{return {section:'Контрагент',route:{mode:'view',id:decodeURIComponent(parts[1]||'')}}}catch{return {section:'Поставки',route:{mode:'list'}}}}
 if(parts[0]==='profile'){
  let id;try{id=parts[2]?decodeURIComponent(parts[2]):undefined}catch{}
  return {section:'Профиль дистрибьютора',route:parts[1]==='edit'?{mode:'edit'}:parts[1]==='employees'&&id?{mode:'employee',id}:{mode:'view'}};
 }
 if(parts[0]==='classifiers'){return {section:'Классификаторы',route:{mode:'list',tab:['tnved','units','currencies','violations','expenseTypes','transferReasons','markets'].includes(parts[1])?parts[1]:'tnved'}}}
 if(parts[0]==='hot-sales'){
  if(!parts[1])return {section:'Горячие продажи',route:{mode:'list'}};
  try{return {section:'Горячие продажи',route:{mode:'view',id:decodeURIComponent(parts[1])}}}catch{return {section:'Горячие продажи',route:{mode:'list'}}}
 }
 if(parts[0]==='expenses'){
  if(!parts[1])return {section:'Расходы',route:{mode:'list'}};
  try{return {section:'Расходы',route:{mode:'view',id:decodeURIComponent(parts[1])}}}catch{return {section:'Расходы',route:{mode:'list'}}}
 }
 if(parts[0]==='warehouse'){
  if(parts[1]==='new')return {section:'Склад',route:{mode:'create'}};
  if(!parts[1])return {section:'Склад',route:{mode:'list'}};
  try{return {section:'Склад',route:{mode:parts[2]==='edit'?'edit':parts[2]==='discrepancy'?'discrepancy':'view',id:decodeURIComponent(parts[1])}}}catch{return {section:'Склад',route:{mode:'list'}}}
 }
 if(parts[0]==='expeditors'){
  if(parts[1]==='new')return {section:'Экспедиторы',route:{mode:'create'}};
  if(!parts[1])return {section:'Экспедиторы',route:{mode:'list'}};
  try{return {section:'Экспедиторы',route:{mode:parts[2]==='edit'?'edit':'view',id:decodeURIComponent(parts[1])}}}catch{return {section:'Экспедиторы',route:{mode:'list'}}}
 }
 if(parts[0]!=='products'){
  let invoiceId=null;
  try{invoiceId=parts[0]==='deliveries'&&parts[1]?decodeURIComponent(parts[1]):/^\d+$/.test(parts[0]||'')?parts[0]:null}catch{}
  return {section:'Поставки',route:{mode:'list'},invoiceId};
 }
 if(parts[1]==='new')return {section:'Товары',route:{mode:'create'}};
 if(!parts[1])return {section:'Товары',route:{mode:'list'}};
 try{return {section:'Товары',route:{mode:parts[2]==='edit'?'edit':'view',id:decodeURIComponent(parts[1])}}}catch{return {section:'Товары',route:{mode:'list'}}}
}
export function productHash(route){
 if(route.mode==='list')return '#products';
 if(route.mode==='create')return '#products/new';
 return '#products/'+encodeURIComponent(route.id)+(route.mode==='edit'?'/edit':'');
}
export function productParent(route){return route.mode==='edit'?{mode:'view',id:route.id}:{mode:'list'}}
export function productScreenTitle(route,product){
 return route.mode==='create'?'Создание товара':route.mode==='edit'?'Редактирование товара':route.mode==='view'?product?.name||'О товаре':'Товары';
}

export function expeditorHash(route){return productHash(route).replace(/^#products/,'#expeditors')}
