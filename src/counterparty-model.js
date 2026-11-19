import {invoiceAmounts} from './invoice-amounts.js';
const cents=n=>Math.round(Number(n||0)*100);
export const counterpartyHash=id=>'#counterparties/'+encodeURIComponent(id);
export const counterpartyTitle=row=>row?row[2]+' · '+row[3]:'Контрагент';
export const sameCounterparty=(a,b)=>String(a[5])===String(b[5])&&a[2]===b[2]&&a[3]===b[3];
const demoParty=row=>row[2]==='ИП Осмонова Д.'&&String(row[5])==='10252'&&row[3]==='ул. Жибек Жолу, 71';
export const counterpartyInn=row=>demoParty(row)?'11503198700456':'';
export function counterpartyEvents(source,rows,paymentTransfers=[]){
 // Исторический срез из Figma 358:34916. Это демонстрация, не добавленные в кабинет накладные.
 const historical=demoParty(source)?[
  {date:'2026-11-07',id:'opening',initial:true,document:'Остаток до начала учёта',supply:2400,paid:0,returned:0,channels:[]},
  {date:'2026-11-08',id:'10388',document:'Счёт 10388',supply:18600,paid:21500,returned:0,channels:['МБизнес']},
  {date:'2026-11-10',id:'10401',document:'Счёт 10401',supply:24300,paid:23000,returned:300,channels:['МБанк (личный)']},
 ]:[];
 const live=rows.filter(row=>sameCounterparty(source,row)&&row[10]!=='Отменен').map(row=>{
  const a=invoiceAmounts(row),returned=row[10]==='Возврат'?a.original:0;
  // Баланс магазина учитывает переданные водителю деньги. Долг водителя перед кассой остаётся в поставках.
  const outgoing=paymentTransfers.filter(t=>String(t.sourceId)===String(row[0])),incoming=paymentTransfers.filter(t=>String(t.targetId)===String(row[0]));
  const originalPosted=(cents(a.posted)+outgoing.reduce((sum,t)=>sum+cents(t.amount),0)-incoming.reduce((sum,t)=>sum+cents(t.amount),0))/100;
  const channel=outgoing[0]?.channel||row[6];
  const channels=[];if(originalPosted>0)channels.push(channel==='Наличные'?'Наличные (приняты кассой)':channel==='—'?'Канал не указан':channel);if(a.cash>0)channels.push('Наличные (у экспедитора)');
  // TODO: уточнить у аналитика даты отдельных оплат/возвратов: текущий API демо содержит только дату накладной.
  return {id:String(row[0]),date:row[1].split('.').reverse().join('-'),document:'Счёт '+row[0],supply:a.original,paid:originalPosted+a.cash,returned,channels,invoiceId:row[0]};
 });
 const corrections=paymentTransfers.flatMap((transfer,i)=>{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bishkek',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(transfer.timestamp));
  const base={date,supply:0,returned:0,channels:[transfer.channel],timestamp:transfer.timestamp};
  return [['out',transfer.sourceId,-transfer.amount],['in',transfer.targetId,transfer.amount]].flatMap(([direction,id,paid])=>{
   const invoice=rows.find(row=>String(row[0])===String(id));
   return invoice&&sameCounterparty(source,invoice)?[{...base,id:'transfer-'+i+'-'+direction,document:(direction==='out'?'Перенос со счёта ':'Перенос на счёт ')+id,paid,invoiceId:id}]:[];
  });
 });
 return [...historical.filter(e=>!live.some(l=>l.id===e.id)),...live,...corrections].sort((a,b)=>a.date.localeCompare(b.date)||(a.timestamp||'').localeCompare(b.timestamp||'')||a.id.localeCompare(b.id,undefined,{numeric:true}));
}
export function counterpartyStatement(source,rows,range,paymentTransfers=[]){
 const events=counterpartyEvents(source,rows,paymentTransfers),[start,end]=range;let balance=0,opening=0,supply=0,paid=0,returned=0;const entries=[];
 for(const event of events){if(end&&event.date>end)continue;const delta=cents(event.supply)-cents(event.paid)-cents(event.returned);balance+=delta;if(event.initial||start&&event.date<start){opening=balance;continue} supply+=cents(event.supply);paid+=cents(event.paid);returned+=cents(event.returned);entries.push({...event,balance:balance/100})}
 return {opening:opening/100,supply:supply/100,paid:paid/100,returned:returned/100,closing:balance/100,entries};
}
export function statementExport(statement,range){
 const headings=['Дата','Документ','Поставка, сом','Оплата, сом','Канал оплаты','Возврат, сом','Долг, сом','Переплата, сом'];
 const balanceCells=n=>[Math.max(0,n),Math.max(0,-n)];
 return [headings,[range[0],'Остаток с прошлого периода',0,0,'',0,...balanceCells(statement.opening)],...statement.entries.map(e=>[e.date,e.document,e.supply,e.paid,e.channels.join(', '),e.returned,...balanceCells(e.balance)])];
}
