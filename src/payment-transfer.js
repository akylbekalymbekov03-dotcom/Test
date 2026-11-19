import {invoiceAmounts,normalizeInvoiceRow} from './invoice-amounts.js';
import {sameCounterparty} from './counterparty-model.js';

const cents=n=>Math.round(Number(n||0)*100);
const closed=row=>['Возврат','Отменен'].includes(row[10]);
// Figma 371:36983: переносится вся внесённая оплата, сумма счёта не меняется.
// Несданные наличные не являются внесённой оплатой и остаются у прежнего экспедитора.
export const paymentTransferReasons=['Похожее название точки'];
export const canTransferPayment=(row,role)=>Boolean(row&&!closed(row)&&invoiceAmounts(row).posted>0&&['СЕО','Доверенное лицо','Бухгалтер','Оператор','Кассир'].includes(role));
export function paymentTargets(rows,source){return rows.filter(row=>String(row[0])!==String(source[0])&&!closed(row)&&!sameCounterparty(source,row))}
const paymentStatus=row=>cents(row[8])>=cents(row[7])?'Оплачен':cents(row[8])+cents(row[13])>0?'Долг':'Ожидает оплаты';
const statusLabel=row=>row[10]==='Долг'?(invoiceAmounts(row).storeDebt>0?'Долг магазина':'Наличные не сданы'):row[10];
const format=n=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' с';
export function transferPayment(rows,{sourceId,targetId,reason,expectedAmount},actor,timestamp=new Date().toISOString()){
 const source=rows.find(row=>String(row[0])===String(sourceId)),target=rows.find(row=>String(row[0])===String(targetId));
 if(!actor||actor.status!=='Активен'||!canTransferPayment(source,actor.role))throw new Error('Нет доступной оплаты для переноса или права на эту операцию.');
 if(!target||!paymentTargets(rows,source).includes(target))throw new Error('Выберите счёт другой точки, который не отменён и не возвращён.');
 if(!paymentTransferReasons.includes(reason))throw new Error('Выберите причину переноса.');
 const amount=invoiceAmounts(source).posted;
 if(expectedAmount!==amount)throw new Error('Сумма оплаты изменилась. Откройте перенос заново.');
 if(!Number.isFinite(new Date(timestamp).getTime()))throw new Error('Не удалось определить время операции.');
 const from=[...source],to=[...target];from[8]=0;to[8]=(cents(target[8])+cents(amount))/100;
 from[10]=paymentStatus(from);to[10]=paymentStatus(to);
 if(!cents(from[13]))from[6]='—';
 if(!target[6]||target[6]==='—')to[6]=source[6];
 // TODO: уточнить у аналитика API отдельных платежей и нескольких каналов в одном счёте.
 const transfer={sourceId:source[0],targetId:target[0],amount,channel:source[6],reason,timestamp,author:actor.name};
 const description=(before,after,detail)=>`${statusLabel(before)} → ${statusLabel(after)}. ${detail} Причина: ${reason}`;
 const base={timestamp,event:'Оплата перенесена',author:actor.name,amount,marker:'PaymentTransferHistoryDot',reasonCode:reason};
 const events=[
  {...base,id:source[0],description:description(source,from,`${format(amount)} ушли на счёт ${target[0]}.`)},
  {...base,id:target[0],description:description(target,to,`${format(amount)} поступили со счёта ${source[0]}.`)},
 ];
 return {rows:rows.map(row=>row===source?normalizeInvoiceRow(from):row===target?normalizeInvoiceRow(to):row),events,transfer};
}
