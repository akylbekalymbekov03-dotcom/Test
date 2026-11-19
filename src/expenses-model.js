import {normalizeSearch} from './list-utils.js';
export const expenseStatuses=['Ожидает подтверждения','Подтвержден','Возмещен','Отказан'];
// Демонстрационный срез справочника из макета. TODO: подключить справочник типов API.
export const expenseTypes=['Бензин','Парковка'];
const rows=[
 [5001,'2026-11-13','exp-4830','Бензин',1200,0,'Октябрьский','ул. Киевская, 17','Заправка','ОсОО «Ля Мезон»'],
 [5002,'2026-11-13','exp-4831','Парковка',500,0,'Первомайский','ул. Токтогула, 92','Парковка'],
 [5003,'2026-11-13','exp-4830','Бензин',1850,1,'Свердловский','пр. Чуй, 118','Заправка','ОсОО «Береке»'],
 [5004,'2026-11-12','exp-4831','Парковка',300,0,'Октябрьский','ул. Московская, 64',''],
 [5005,'2026-11-12','exp-4830','Бензин',2200,2,'Первомайский','ул. Ахунбаева, 21','Заправка'],
 [5006,'2026-11-12','exp-4831','Парковка',600,3,'Свердловский','ул. Ибраимова, 45',''],
 [5007,'2026-11-12','exp-4830','Бензин',1800,1,'Октябрьский','ул. Боконбаева, 8','Заправка'],
 [5008,'2026-11-12','exp-4831','Парковка',400,2,'Первомайский','ул. Жибек Жолу, 71',''],
 [5009,'2026-11-12','exp-4830','Бензин',900,3,'Свердловский','ул. Байтик Баатыра, 9','Заправка'],
 [5010,'2026-11-12','exp-4831','Парковка',1300,0,'Октябрьский','ул. Киевская, 38',''],
];
export const initialExpenses=rows.map(([number,date,driverId,type,amount,status,district,address,comment,party=''])=>({id:String(number),number,date,driverId,type,amount,status:expenseStatuses[status],district,address,comment,party,
 approvedBy:number===5003?'Асанова Айгерим':null,approvedAt:number===5003?'2026-11-13T10:20:00+06:00':null,
 rejectedBy:number===5006?'Асанова Айгерим':null,rejectedAt:number===5006?'2026-11-13T11:02:00+06:00':null,
 reason:number===5006?'Нет подтверждающего документа.':'',reimbursedBy:null,reimbursedAt:null,history:[]}));
export const expenseDriver=(row,drivers)=>{const driver=drivers.find(d=>d.id===row.driverId);return driver?[driver.lastName,driver.firstName].join(' '):'—'};
export const expenseDate=iso=>iso?.split('-').reverse().join('.')||'—';
export const expenseSelectable=row=>['Ожидает подтверждения','Подтвержден'].includes(row.status);
export function expenseActionAllowed(rows,ids,action){
 if(!ids.length||new Set(ids).size!==ids.length||!['confirm','reject','reimburse'].includes(action))return false;
 const selected=rows.filter(row=>ids.includes(row.id));
 return selected.length===ids.length&&selected.every(row=>row.status===(action==='reimburse'?'Подтвержден':'Ожидает подтверждения'));
}
export function transitionExpenses(rows,ids,action,reason='',{timestamp=new Date().toISOString(),author='Асанова Айгерим'}={}){
 if(!expenseActionAllowed(rows,ids,action))throw new Error(action==='reimburse'?'Возместить можно только подтверждённые расходы.':'Выберите только расходы, ожидающие подтверждения.');
 if(action==='reject'&&!reason.trim())throw new Error('Укажите причину отказа.');
 const statuses={confirm:'Подтвержден',reject:'Отказан',reimburse:'Возмещен'},events={confirm:'Расход подтверждён',reject:'В расходе отказано',reimburse:'Расход возмещён'};
 return rows.map(row=>!ids.includes(row.id)?row:{...row,status:statuses[action],
  ...(action==='confirm'?{approvedBy:author,approvedAt:timestamp}:action==='reject'?{rejectedBy:author,rejectedAt:timestamp,reason:reason.trim()}:{reimbursedBy:author,reimbursedAt:timestamp}),
  history:[{event:events[action],timestamp,author,amount:row.amount,description:action==='reject'?reason.trim():''},...row.history]});
}
export function expenseValues(row,drivers,money){return [String(row.number),expenseDate(row.date),expenseDriver(row,drivers),row.type,money(row.amount),row.status,row.district,row.address,row.party,row.comment,row.reason];}
export const expenseMatches=(row,query,drivers,money)=>normalizeSearch(expenseValues(row,drivers,money).join(' ')+' '+row.amount).includes(normalizeSearch(query));
export function expenseTotals(rows){return {count:rows.length,...Object.fromEntries(expenseStatuses.map(status=>[status,rows.filter(r=>r.status===status).reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100]))};}
export const expenseHash=route=>route.mode==='view'?'#expenses/'+encodeURIComponent(route.id):'#expenses';
