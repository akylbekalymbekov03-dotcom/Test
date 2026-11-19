import {normalizeSearch} from './list-utils.js';
import {mainBarcode} from './products-model.js';

export const movementStatuses=['Ожидает подтверждения','Принято','Частично принято','Отклонено'];
export const bishkekToday=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bishkek',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const displayDate=iso=>iso?.split('-').reverse().join('.')||'—';
export const roundMoney=value=>Math.round((value+Number.EPSILON)*100)/100;
export const lineDifference=line=>Math.max(0,Number(line.quantity)-Number(line.actual));
export const lineAmount=(line,received=false)=>{const quantity=Number(received?line.actual:line.quantity);return Number.isFinite(quantity)?roundMoney(line.price*quantity):0};
export const movementTotal=movement=>movement.lines?roundMoney(movement.lines.reduce((sum,line)=>sum+lineAmount(line,movement.status==='Частично принято'||movement.discrepancy?.state==='rejected'),0)):movement.snapshotTotal;
export const discrepancyLines=movement=>(movement.lines||[]).filter(line=>lineDifference(line)>0);
export const discrepancyTotal=movement=>roundMoney(discrepancyLines(movement).reduce((sum,line)=>sum+roundMoney(lineDifference(line)*line.price),0));
export function movementComment(movement){
 const d=movement.discrepancy;
 if(!d||d.state==='pending')return movement.comment||'';
 const decision='Расхождение №'+d.number+(d.state==='confirmed'?' подтверждено':' отклонено')+(d.comment?': «'+d.comment+'».':'.');
 return [movement.comment,decision].filter(Boolean).join(' ');
}
export const movementDriver=(movement,expeditors)=>{const e=expeditors.find(e=>e.id===movement.driverId);return e?[e.lastName,e.firstName].join(' '):movement.driverName||'—'};
export const lineStatus=(movement,line)=>movement.status==='Частично принято'?(lineDifference(line)?'Частично принято':'Принято'):movement.status;
export function productLine(product,id){return {id,productId:product.id,name:product.name,barcode:mainBarcode(product),unit:product.unit,price:product.price,quantity:1,actual:1,reason:null};}
export const blankLine=id=>({id,productId:'',name:'',barcode:'',unit:'',price:0,quantity:'',actual:0,reason:null});

// Исторические позиции из Figma: снимок товара на момент выдачи, а не новый справочник.
const historicalLines=()=>[
 {id:'milk',productId:null,name:'Молоко 3,2%',barcode:'4601234567890',unit:'шт',price:82,quantity:24,actual:24,reason:null},
 {id:'kefir',productId:null,name:'Кефир 2,5%',barcode:'4609876543210',unit:'шт',price:79,quantity:16,actual:16,reason:null},
];
// Состояния одного документа из макета распределены по строкам списка для просмотра всех сценариев.
// Полные позиции остальных исторических документов в макете не даны: lines=null.
const listRows=[
 [60028,'2026-11-13','exp-4830',12443,0], [60027,'2026-11-13','exp-4831',45000,1],
 [60026,'2026-11-12','exp-4830',18750,2], [60025,'2026-11-12','exp-4831',8200,3],
 [60024,'2026-11-12','exp-4830',26300,1], [60023,'2026-11-11','exp-4831',31000,0],
 [60022,'2026-11-11','exp-4830',17550,2], [60021,'2026-11-11','exp-4831',9400,1],
 [60020,'2026-11-10','exp-4830',14800,3], [60019,'2026-11-10','exp-4831',22100,0],
];
export const initialMovements=listRows.map(([number,date,driverId,snapshotTotal,status],i)=>{
 const withLines=i<4||i===6,lines=withLines?historicalLines():null;
 if(status===2&&lines){lines[0].actual=22;lines[0].reason={code:'000000002',name:'Недопоставка товара'};}
 const discrepancy=status===2?{number:i===2?70011:70010,date,state:i===2?'pending':'confirmed',expeditorComment:'Не хватило 2 шт. молока при пересчёте',reviewer:'Асанова Айгерим',comment:i===2?'':'Недопоставка товара: 2 шт.',author:i===2?null:'Асанова Айгерим',timestamp:i===2?null:date+'T14:30:00+06:00'}:null;
 return {id:String(number),number,date,driverId,snapshotTotal,status:movementStatuses[status],lines,discrepancy,comment:status===3?'Экспедитор отклонил перемещение: «Привезли не тот товар». Остаток не изменился.':'',history:[]};
});

export function validateMovement(draft,products,expeditors,previous,today=bishkekToday()){
 const errors={};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!Number.isFinite(Date.parse(draft.date))||new Date(draft.date+'T12:00:00Z').toISOString().slice(0,10)!==draft.date||draft.date<today&&draft.date!==previous?.date)errors.date='Выберите сегодняшнюю или будущую дату.';
 if(!expeditors.some(e=>e.id===draft.driverId&&e.status==='Активен'))errors.driverId='Выберите активного экспедитора.';
 if(!draft.lines?.length)errors.lines='Добавьте хотя бы один товар.';
 const used=new Set();
 for(const line of draft.lines||[]){
  const before=previous?.lines?.find(l=>l.id===line.id);
  const retainedHistorical=before&&before.productId==null&&line.productId==null&&['name','barcode','unit','price'].every(key=>line[key]===before[key]);
  if(!retainedHistorical&&!products.some(p=>p.id===line.productId&&p.status==='Активен'))errors['product-'+line.id]='Выберите активный товар.';
  if(line.productId&&used.has(line.productId))errors['product-'+line.id]='Товар уже добавлен в перемещение.';
  used.add(line.productId);
  if(line.quantity===''||!Number.isFinite(Number(line.quantity))||Number(line.quantity)<=0||!Number.isFinite(lineAmount(line)))errors['quantity-'+line.id]='Укажите корректное количество больше нуля.';
 }
 return errors;
}
export function saveMovement(movements,draft,products,expeditors,{today=bishkekToday(),timestamp=new Date().toISOString()}={}){
 const previous=movements.find(m=>m.id===draft.id);
 if(previous&&previous.status!=='Ожидает подтверждения')throw new Error('Это перемещение доступно только для просмотра.');
 if(previous&&!previous.lines)throw new Error('Позиции этого документа не загружены.');
 const errors=validateMovement(draft,products,expeditors,previous,today);
 if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
 const number=previous?.number||Math.max(60000,...movements.map(m=>m.number))+1;
 const lines=draft.lines.map(line=>{
  const product=products.find(p=>p.id===line.productId),snapshot=product?productLine(product,line.id):previous.lines.find(l=>l.id===line.id);
  return {...snapshot,quantity:Number(line.quantity),actual:Number(line.quantity),reason:null};
 });
 return {id:String(number),number,date:draft.date,driverId:draft.driverId,comment:draft.comment.trim(),status:'Ожидает подтверждения',lines,discrepancy:null,
  history:[{event:previous?'Перемещение изменено':'Перемещение создано',timestamp,author:'Асанова Айгерим',description:'Выдано позиций: '+lines.length+'.',amount:roundMoney(lines.reduce((s,l)=>s+lineAmount(l),0))},...(previous?.history||[])]};
}
export function decideDiscrepancy(movement,decision,comment='',timestamp=new Date().toISOString()){
 if(!['confirmed','rejected'].includes(decision)||movement.status!=='Частично принято'||movement.discrepancy?.state!=='pending')throw new Error('Расхождение уже рассмотрено или недоступно.');
 if(decision==='rejected'&&!comment.trim())throw new Error('Введите причину отклонения.');
 const amount=discrepancyTotal(movement);
 return {...movement,status:decision==='rejected'?'Принято':'Частично принято',discrepancy:{...movement.discrepancy,state:decision,comment:comment.trim(),timestamp,author:'Асанова Айгерим'},
  ...(decision==='rejected'?{shortage:{amount,paid:0,receipts:[]}}:{}),
  history:[{event:decision==='confirmed'?'Расхождение подтверждено':'Расхождение отклонено',timestamp,author:'Асанова Айгерим',description:comment.trim()||'Расхождение №'+movement.discrepancy.number,amount},...(decision==='rejected'?[{event:'Недостача записана на экспедитора',timestamp,author:'Асанова Айгерим',amount,description:'Перемещение №'+movement.number+'. Расхождение №'+movement.discrepancy.number+'.'}]:[]),...(movement.history||[])]};
}
export const shortageBalance=movement=>Math.max(0,roundMoney((movement.shortage?.amount||0)-(movement.shortage?.paid||0)));
export const expeditorShortageDebt=(movements,driverId)=>roundMoney(movements.filter(m=>m.driverId===driverId).reduce((sum,m)=>sum+shortageBalance(m),0));
export function acceptShortageCash(movement,amount,timestamp=new Date().toISOString()){
 const balance=shortageBalance(movement),value=Number(amount);
 if(!movement.shortage||movement.discrepancy?.state!=='rejected'||!Number.isFinite(value)||value<=0||roundMoney(value)!==value||value>balance)throw new Error('Укажите сумму больше нуля, не превышающую остаток долга, с точностью до тыйына.');
 const event={event:'Недостача погашена через кассу',timestamp,author:'Асанова Айгерим',amount:value,description:'Перемещение №'+movement.number+'. Расхождение №'+movement.discrepancy.number+'.'};
 return {...movement,shortage:{...movement.shortage,paid:roundMoney(movement.shortage.paid+value),receipts:[event,...movement.shortage.receipts]},history:[event,...movement.history]};
}
export function matchesMovement(movement,query,expeditors,money){
 const text=[movement.number,displayDate(movement.date),movementDriver(movement,expeditors),money(movementTotal(movement)),movementTotal(movement),movement.status,movementComment(movement),
 ...(discrepancyLines(movement).map(l=>l.reason?.name||'')),movement.discrepancy?'Расхождение '+movement.discrepancy.number:''].join(' ');
 return normalizeSearch(text).includes(normalizeSearch(query));
}
export function warehouseHash(route){
 if(route.mode==='list')return '#warehouse';
 if(route.mode==='create')return '#warehouse/new';
 return '#warehouse/'+encodeURIComponent(route.id)+(route.mode==='edit'?'/edit':route.mode==='discrepancy'?'/discrepancy':'');
}
