import {normalizeInvoiceRow} from './invoice-amounts.js';

// Дополнительные синтетические записи для демонстрации периодов. Снимки Figma не меняем.
export const demoDayOffsets=[0,0,0,0,1,2,3,5,6,8,10,13,17,21,27,35];
export function demoDate(today,daysAgo){
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-daysAgo);
 return date.toISOString().slice(0,10);
}
const money=n=>Math.round(n*100)/100;
const at=(date,time='09:00')=>date+'T'+time+':00+06:00';
const author='Асанова Айгерим';

export function createDemoInvoices(base,today){
 if(!base.length)return {rows:[],history:[],products:{}};
 const products={},history=[];
 const scenarios=['waiting','paid','cash','partial','paid','waiting','return','cash','partial','paid','cancelled','cash','partial','paid','waiting','paid'];
 const extra=demoDayOffsets.map((days,i)=>{
  const row=[...base[i%base.length]],id=12001+i,date=demoDate(today,days),scenario=scenarios[i];
  const items=[['Вода 0,5 л',24+i*6,60],['Сок яблочный 1 л',12+i*3,90],['Лимонад 1 л',6+i*2,100]].map(([name,quantity,price])=>[name,quantity,quantity*price]);
  const original=items.reduce((sum,item)=>sum+item[2],0);
  row[0]=id;row[1]=date.split('-').reverse().join('.');row[6]='—';row[7]=original;row[8]=0;row[9]=0;row[10]='Ожидает оплаты';row[11]='';row[12]=0;row[13]=0;row[14]='';
  if(scenario==='paid'){row[6]='Безналичные';row[8]=original+(i%3===1?200:0);row[10]='Оплачен'}
  if(scenario==='cash'){row[6]='Наличные';row[13]=original;row[10]='Долг';row[11]='Оплачено наличными; ожидает приёма кассой'}
  if(scenario==='partial'){row[6]='Наличные';row[8]=money(original*.35);row[13]=money(original*.25);row[10]='Долг';row[11]='Частичная оплата; остаток магазин оплатит при следующей доставке'}
  if(scenario==='return'){row[10]='Возврат';row[14]='Все товары возвращены';row[11]='Магазин отказался от поставки, долг снят'}
  if(scenario==='cancelled'){row[10]='Отменен';row[11]='Повторная накладная отменена офисом'}
  if(scenario==='waiting')row[11]=i%2?'Перед доставкой позвонить администратору':'Доставка до 18:00';
  products[id]=items;
  history.push({id,timestamp:at(date,'08:10'),event:'Накладная загружена',author,amount:original,marker:'HistoryMutedDot'});
  if(row[8]>0)history.push({id,timestamp:at(date,'09:20'),event:scenario==='paid'?'Оплачено по QR':'Наличные приняты кассой',author,amount:row[8],marker:'HistoryDot'});
  if(row[13]>0)history.push({id,timestamp:at(date,'09:10'),event:'Оплачено наличными',author:row[4],amount:row[13],description:'Ожидает приёма кассой.',marker:'HistoryCashDot'});
  if(['return','cancelled'].includes(scenario))history.push({id,timestamp:at(date,'09:30'),event:scenario==='return'?'Оформлен возврат':'Накладная отменена',author,description:row[11],marker:'HistoryDot'});
  return normalizeInvoiceRow(row);
 });
 return {rows:[...extra,...base],history,products};
}

export function createDemoExpenses(base,today){
 if(!base.length)return [];
 const extra=demoDayOffsets.map((days,i)=>{
  const source=base[i%base.length],date=demoDate(today,days),status=['Ожидает подтверждения','Подтвержден','Возмещен','Отказан'][i%4],number=52001+i;
  const row={...structuredClone(source),id:String(number),number,date,amount:i%2?250+i*85:950+i*145,status,comment:i%2?'Парковка на торговой точке':'Заправка перед выездом на маршрут',approvedBy:null,approvedAt:null,rejectedBy:null,rejectedAt:null,reimbursedBy:null,reimbursedAt:null,reason:'',history:[]};
  row.history.push({timestamp:at(date,'08:20'),event:'Расход добавлен',author:'Экспедитор',amount:row.amount,description:row.comment});
  if(['Подтвержден','Возмещен'].includes(status)){row.approvedBy=author;row.approvedAt=at(date,'09:10');row.history.unshift({timestamp:row.approvedAt,event:'Расход подтверждён',author,amount:row.amount})}
  if(status==='Возмещен'){row.reimbursedBy=author;row.reimbursedAt=at(date,'09:30');row.history.unshift({timestamp:row.reimbursedAt,event:'Расход возмещён',author,amount:row.amount})}
  if(status==='Отказан'){row.rejectedBy=author;row.rejectedAt=at(date,'09:10');row.reason='Нет подтверждающего документа';row.history.unshift({timestamp:row.rejectedAt,event:'В расходе отказано',author,amount:row.amount,description:row.reason})}
  return row;
 });
 return [...extra,...structuredClone(base)];
}

export function createDemoHotSales(base,today){
 if(!base.length)return [];
 const extra=demoDayOffsets.map((days,i)=>{
  const source=structuredClone(base[i%base.length]),number=47001+i,date=demoDate(today,days);
  const lines=[{id:'milk',name:'Молоко 3,2%',barcode:'4601234567890',unit:'шт',price:82,quantity:12+i*2},{id:'kefir',name:'Кефир 2,5%',barcode:'4609876543210',unit:'шт',price:79,quantity:8+i}];
  const original=lines.reduce((sum,line)=>sum+line.price*line.quantity,0),method=i%3===1?'noncash':'cash',paid=method==='noncash'||i%4===2;
  return {...source,id:String(number),number,date,lines,original,positions:lines.length,method,cashPosted:paid&&method==='cash'?original:0,nonCashPosted:method==='noncash'?original:0,comment:i%2?'Продажа на маршруте':'Дополнительный заказ магазина',history:[{timestamp:at(date,'08:40'),event:'Горячая продажа создана',author:'Экспедитор',amount:original},...(paid?[{timestamp:at(date,'09:15'),event:method==='cash'?'Оплата горячей продажи принята кассой':'Оплачено по QR',author,amount:original}]:[])].sort((a,b)=>b.timestamp.localeCompare(a.timestamp))};
 });
 return [...extra,...structuredClone(base)];
}

export function createDemoMovements(base,today){
 if(!base.length)return [];
 const extra=demoDayOffsets.map((days,i)=>{
  const source=structuredClone(base[i%base.length]),number=62001+i,date=demoDate(today,days),status=['Ожидает подтверждения','Принято','Частично принято','Отклонено'][i%4];
  const lines=[{id:'milk',productId:null,name:'Молоко 3,2%',barcode:'4601234567890',unit:'шт',price:82,quantity:24+i*2,actual:24+i*2,reason:null},{id:'kefir',productId:null,name:'Кефир 2,5%',barcode:'4609876543210',unit:'шт',price:79,quantity:16+i,actual:16+i,reason:null}];
  if(status==='Частично принято'){lines[0].actual-=2;lines[0].reason={code:'000000002',name:'Недопоставка товара'}}
  const snapshotTotal=lines.reduce((sum,line)=>sum+line.price*line.quantity,0);
  const discrepancy=status==='Частично принято'?{number:72001+i,date,state:i%3?'pending':'confirmed',expeditorComment:'Не хватило 2 шт. молока при пересчёте',reviewer:author,comment:i%3?'':'Недопоставка подтверждена',author:i%3?null:author,timestamp:i%3?null:at(date,'09:20')}:null;
  return {...source,id:String(number),number,date,status,lines,snapshotTotal,discrepancy,comment:status==='Отклонено'?'Привезли не тот товар':i%2?'Утренний маршрут':'Дополнительная выдача на маршрут',history:[{timestamp:at(date,'08:00'),event:'Перемещение создано',author,amount:snapshotTotal},...(status==='Ожидает подтверждения'?[]:[{timestamp:at(date,'09:00'),event:'Статус: Ожидает подтверждения → '+status,author:'Экспедитор',amount:lines.reduce((sum,line)=>sum+line.price*line.actual,0)}])].sort((a,b)=>b.timestamp.localeCompare(a.timestamp))};
 });
 return [...extra,...structuredClone(base)];
}
