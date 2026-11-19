import {invoiceAmounts,sumAmounts} from './invoice-amounts.js';
export const invoiceDate=row=>String(row[1]).split('.').reverse().join('-');
export function previousRange([from,to]){
 const start=new Date(from+'T12:00:00Z'),end=new Date(to+'T12:00:00Z');
 const length=Math.round((end-start)/86400000)+1;
 return [new Date(+start-length*86400000).toISOString().slice(0,10),new Date(+start-86400000).toISOString().slice(0,10)];
}
const plus=(a,b)=>(Math.round(a*100)+Math.round(b*100))/100;
export function dashboardTotals(rows){
 const total={count:rows.length,payable:sumAmounts(rows,'payable'),posted:sumAmounts(rows,'posted'),storeDebt:sumAmounts(rows,'storeDebt'),cash:sumAmounts(rows,'cash'),waiting:sumAmounts(rows,'waiting'),debt:sumAmounts(rows,'debt')};
 // Переплата по одной точке не погашает остатки других точек.
 total.covered=rows.reduce((sum,r)=>plus(sum,Math.min(invoiceAmounts(r).payable,invoiceAmounts(r).posted)),0);
 total.overpayment=Math.max(0,Math.round((total.posted-total.covered)*100)/100);
 total.cashOverpayment=rows.reduce((sum,r)=>plus(sum,Math.max(0,invoiceAmounts(r).cash-invoiceAmounts(r).debt)),0);
 total.percent=total.payable?Math.round(total.covered/total.payable*100):0;
 return total;
}
export function dashboardData(rows,expenses,range,driver=''){
 const inRange=date=>date>=range[0]&&date<=range[1];
 const selected=rows.filter(r=>inRange(invoiceDate(r))&&(!driver||r[4]===driver));
 const previous=previousRange(range),prior=rows.filter(r=>invoiceDate(r)>=previous[0]&&invoiceDate(r)<=previous[1]&&(!driver||r[4]===driver));
 const drivers=Object.entries(Object.groupBy(selected,r=>r[4])).map(([name,items])=>({name,rows:items,...dashboardTotals(items),cashCount:items.filter(r=>invoiceAmounts(r).cash>0).length})).sort((a,b)=>b.posted-a.posted);
 const parties=Object.values(Object.groupBy(selected,r=>JSON.stringify([r[2],r[3],r[5]]))).map(items=>({id:items[0][0],name:items[0][2],address:items[0][3],...dashboardTotals(items)})).filter(p=>p.storeDebt>0).sort((a,b)=>b.storeDebt-a.storeDebt);
 const daily=[];
 for(let date=new Date(range[0]+'T12:00:00Z'),end=new Date(range[1]+'T12:00:00Z');date<=end;date.setUTCDate(date.getUTCDate()+1)){
  const iso=date.toISOString().slice(0,10);daily.push({date:iso,...dashboardTotals(selected.filter(r=>invoiceDate(r)===iso))});
 }
 const pending=expenses.filter(e=>inRange(e.date)&&e.status==='Ожидает подтверждения').sort((a,b)=>a.date.localeCompare(b.date));
 return {selected,total:dashboardTotals(selected),previous:dashboardTotals(prior),drivers,parties,daily,pending};
}
export function comparison(current,previous){
 if(previous===0)return current===0?'Без изменений':'В прошлом периоде — 0';
 const delta=Math.round((current-previous)/previous*100);
 return delta===0?'Без изменений':`${delta>0?'↑':'↓'} ${Math.abs(delta)}% к прошлому периоду`;
}
