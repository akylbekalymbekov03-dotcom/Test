// Истории демонстрационных накладных из Figma 275:104425.
const event=(day,time,title,author,extra={})=>({timestamp:`2026-11-${day}T${time}:00+06:00`,event:title,author,...extra});
const loaded=(day,time,amount,marker='HistoryMutedDot')=>event(day,time,'Накладная загружена','Асанова А.',{amount,marker});
export const invoiceHistory={
 10428:[loaded('13','09:10',12443,'HistoryDot')],
 10427:[
   event('13','20:00','Наличные не сданы в кассу','Система',{amount:45000,marker:'HistoryCashDot'}),
   event('13','14:05','Оплачено наличными','Асанов А.',{amount:45000,marker:'HistoryMutedDot'}),
   loaded('13','09:10',45000),
 ],
 10426:[event('13','11:30','Оплачено по QR','Смирнов С.',{amount:18750,marker:'HistoryDot'}),loaded('13','09:10',18750)],
 10423:[
   // В макете написано «учтена», но операции зачёта в данных нет.
   event('12','15:40','Оплачено по QR','Смирнов С.',{amount:23000,description:'Переплата 200,00 с засчитается магазину в следующий раз.',marker:'HistoryDot'}),
   loaded('12','09:00',22800),
 ],
 10424:[event('12','16:00','Оформлен возврат','Асанова А.',{description:'Все товары возвращены, долг снят.',marker:'HistoryDot'}),loaded('12','09:00',16500)],
 10422:[event('12','10:15','Накладная отменена','Асанова А.',{description:'Долг снят.',marker:'HistoryDot'}),loaded('12','09:00',6300)],
 10421:[
   event('14','09:30','Комментарий','Асанова А.',{description:'«Наличные ожидают приёма кассой»',marker:'HistoryDot'}),
   event('13','20:00','Наличные не сданы в кассу','Система',{amount:20000,marker:'HistoryCashDot'}),
   event('12','18:41','Статус','Система',{from:'Ожидает оплаты',to:'Долг магазина',marker:'HistoryMutedDot'}),
   event('12','18:40','Оплачено наличными','Смирнов С.',{amount:20000,marker:'HistoryMutedDot'}),
   loaded('12','16:10',31200,'HistoryMutedDot2'),
 ],
};
export function historyForInvoice(id,localEvents=[]){
 return [...localEvents.filter(e=>String(e.id)===String(id)),...(invoiceHistory[id]||[])].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
}
