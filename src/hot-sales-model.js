import {normalizeSearch} from './list-utils.js';
const cents=value=>Math.round(Number(value||0)*100);
const rows=[
 [45038,'2026-11-15','exp-4830',3232,'cash',false,2],
 [45037,'2026-11-15','exp-4831',45000,'cash',true,3],
 [45036,'2026-11-15','exp-4830',18750,'cash',false,4],
 [45035,'2026-11-14','exp-4831',8200,'noncash',true,2],
 [45034,'2026-11-14','exp-4830',26300,'cash',true,4],
 [45033,'2026-11-14','exp-4831',31000,'cash',false,6],
 [45032,'2026-11-13','exp-4830',17550,'noncash',true,3],
 [45031,'2026-11-13','exp-4831',9400,'cash',false,5],
 [45030,'2026-11-13','exp-4830',14800,'noncash',true,4],
 [45029,'2026-11-12','exp-4831',22100,'cash',true,2],
];
// Канонические данные №45038 — детальная Figma 116:14756, а не противоречащая ей строка списка.
export const initialHotSales=rows.map(([number,date,driverId,original,method,paid,positions])=>({id:String(number),number,date,driverId,original,method,positions,comment:'',cashPosted:paid&&method==='cash'?original:0,nonCashPosted:paid&&method==='noncash'?original:0,history:[],
 lines:number===45038?[
  {id:'milk',name:'Молоко 3,2%',barcode:'4601234567890',unit:'шт',price:82,quantity:24},
  {id:'kefir',name:'Кефир 2,5%',barcode:'4609876543210',unit:'шт',price:79,quantity:16},
 ]:null}));
export const hotSaleDriver=(sale,drivers)=>{const driver=drivers.find(d=>d.id===sale.driverId);return driver?[driver.lastName,driver.firstName].join(' '):'—'};
export const hotSaleDate=date=>date.split('-').reverse().join('.');
export const hotSaleLineAmount=line=>cents(line.price*line.quantity)/100;
export function hotSaleAmounts(sale){
 const original=sale.lines?sale.lines.reduce((sum,line)=>sum+cents(hotSaleLineAmount(line)),0):cents(sale.original);
 const posted=cents(sale.cashPosted)+cents(sale.nonCashPosted),debt=Math.max(0,original-posted);
 return {original:original/100,posted:posted/100,debt:debt/100,cash:sale.method==='cash'?debt/100:0,overpayment:Math.max(0,posted-original)/100,status:debt>0?'Долг (Наличные)':'Оплачен'};
}
export const hotSaleStatusLabel=sale=>hotSaleAmounts(sale).debt>0?'Наличные не сданы':'Оплачен';
export const canSettleHotSale=sale=>sale.method==='cash'&&hotSaleAmounts(sale).debt>0;
export function acceptHotSalePayment(sale,cash,noncash=0,{timestamp=new Date().toISOString(),author='Асанова Айгерим'}={}){
 if(!canSettleHotSale(sale))throw new Error('По этой продаже нет наличного долга к погашению.');
 if([cash,noncash].some(value=>!Number.isFinite(value)||value<0||!Number.isSafeInteger(cents(value))||value!==cents(value)/100)||!Number.isSafeInteger(cents(cash)+cents(noncash)+cents(sale.cashPosted)+cents(sale.nonCashPosted))||cents(cash)+cents(noncash)<=0)throw new Error('Укажите положительную сумму с точностью до тыйына.');
 const amount=(cents(cash)+cents(noncash))/100;
 const next={...sale,cashPosted:(cents(sale.cashPosted)+cents(cash))/100,nonCashPosted:(cents(sale.nonCashPosted)+cents(noncash))/100};
 const display=value=>value===0?'—':new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+' с';
 next.history=[{event:'Оплата горячей продажи принята кассой',timestamp,author,amount,cashPart:cash,nonCashPart:noncash,description:'Продажа №'+sale.number+'. Наличными: '+display(cash)+'; безналично: '+display(noncash)+'.'},...sale.history];
 return next;
}
export const hotSalesDebt=(sales,driverId)=>sales.filter(s=>s.driverId===driverId).reduce((sum,s)=>sum+cents(hotSaleAmounts(s).cash),0)/100;
export function hotSaleInvoiceRow(sale,drivers){const a=hotSaleAmounts(sale);return [sale.number,hotSaleDate(sale.date),'—','—',hotSaleDriver(sale,drivers),'—',sale.method==='cash'?'Наличные':'QR',a.original,a.posted,a.overpayment,a.debt>0?'Долг':'Оплачен',sale.comment,0,a.cash,'—'];}
export function hotSaleMatches(sale,query,drivers,money){const a=hotSaleAmounts(sale);return normalizeSearch([sale.number,hotSaleDate(sale.date),hotSaleDriver(sale,drivers),a.original,money(a.original),sale.method==='cash'?'Наличные Наличная':'QR Безналичная',a.status,hotSaleStatusLabel(sale),sale.lines?.length??sale.positions,sale.comment].join(' ')).includes(normalizeSearch(query));}
export const hotSaleHash=route=>route.mode==='view'?'#hot-sales/'+encodeURIComponent(route.id):'#hot-sales';
