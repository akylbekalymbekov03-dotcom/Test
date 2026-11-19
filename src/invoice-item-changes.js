import {normalizeInvoiceRow} from './invoice-amounts.js';

export const itemChangeReasons={lost:'Утеря товара',damaged:'Повреждение товара',returned:'Возврат товара'};
const cents=n=>Math.round(Number(n)*100);
export const changedQuantity=change=>Object.keys(itemChangeReasons).reduce((sum,key)=>sum+Number(change?.[key]||0),0);
export function invoiceChangedCount(row,items,changes){
 if(changes&&Object.keys(changes).length)return Object.values(changes).reduce((sum,c)=>sum+changedQuantity(c),0);
 if(row[10]==='Возврат'&&items)return items.reduce((sum,item)=>sum+item[1],0);
 return typeof row[14]==='number'?row[14]:0;
}
export function itemChangeAmount(item,change){return Math.round(cents(item[2])*changedQuantity(change)/item[1])/100;}
export const invoiceChangeAmount=(items,changes={})=>items.reduce((sum,item,index)=>sum+cents(itemChangeAmount(item,changes[index])),0)/100;
export function itemChangeSummary(changes={}){
 const totals=Object.fromEntries(Object.keys(itemChangeReasons).map(key=>[key,Object.values(changes).reduce((sum,c)=>sum+Number(c[key]||0),0)]));
 return [['returned','Возвраты'],['lost','Утерянные'],['damaged','Повреждённые']].filter(([key])=>totals[key]>0).map(([key,label])=>label+': '+totals[key]).join(' · ');
}
export function updateInvoiceItemChange(row,items,changes,index,reason,quantity){
 if(['Возврат','Отменен'].includes(row[10]))throw new Error('По закрытой накладной нельзя менять товары.');
 const item=items?.[index];
 if(!item||!Object.hasOwn(itemChangeReasons,reason))throw new Error('Выберите товар и причину изменения.');
 if(!Number.isFinite(quantity)||quantity<0||!Number.isInteger(quantity))throw new Error('Введите целое количество, не меньше нуля.');
 const nextChanges={...changes,[index]:{...changes[index],[reason]:quantity}};
 if(changedQuantity(nextChanges[index])>item[1])throw new Error('Общее количество возвратов, утерянных и повреждённых не может превышать количество в накладной.');
 const before=invoiceChangeAmount(items,changes),after=invoiceChangeAmount(items,nextChanges),next=[...row];
 next[7]=Math.max(0,cents(row[7])+cents(before)-cents(after))/100;
 // Уточнение заказчика: изменения уменьшают оплату и долг, фактические оплаты сохраняются.
 if(cents(next[8])>=cents(next[7]))next[10]='Оплачен';
 else next[10]=Number(next[8])>0||Number(next[13])>0?'Долг':'Ожидает оплаты';
 next[14]=Object.values(nextChanges).reduce((sum,change)=>sum+changedQuantity(change),0);
 return {row:normalizeInvoiceRow(next),changes:nextChanges,before,after,delta:(cents(after)-cents(before))/100};
}
