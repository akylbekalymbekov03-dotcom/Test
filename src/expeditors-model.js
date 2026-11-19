import {hotSalesDebt} from './hot-sales-model.js';
import {expeditorShortageDebt} from './warehouse-model.js';
import {invoiceAmounts} from './invoice-amounts.js';
import {normalizeSearch} from './list-utils.js';

export const expeditorStatuses=['Активен','Заблокирован','Уволен'];
export const tradePoints=['ОсОО «Ля Мезон»']; // TODO: подключить торговые точки АРМ.
export const expeditorName=e=>[e.lastName,e.firstName].filter(Boolean).join(' ');
export const expeditorFullName=e=>[e.lastName,e.firstName,e.middleName].filter(Boolean).join(' ');
export const expeditorAliases=e=>new Set([expeditorName(e),expeditorFullName(e),...(e.aliases||[])]);
export const ownsInvoice=(e,row)=>expeditorAliases(e).has(row[4]);
export const phoneDigits=value=>{const digits=String(value).replace(/\D/g,'');return digits.startsWith('996')&&(digits.length>9||String(value).trim().startsWith('+'))?digits.slice(3):digits};
export function formatPhone(value){const n=phoneDigits(value);return '+996'+(n?' '+[n.slice(0,3),n.slice(3,6),n.slice(6,9)].filter(Boolean).join(' '):'')}
export const dateBishkek=timestamp=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Bishkek',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(timestamp));
const names=[['Асанов','Азамат'],['Смирнов','Сергей'],['Ибраимов','Нурлан'],['Токтосунов','Бакыт'],['Калиева','Айгүл'],['Орозов','Эрмек'],['Абдраимова','Алина'],['Таалайбеков','Мирлан'],['Мамытова','Динара'],['Керимов','Бек']];
const phones=['555123456','555120240','555240810','700000123','777123456','999000111','555020450','700123456','777300200','555202000'];
// Телефон первого экспедитора взят из детальной и формы, а не противоречащей им строки списка.
export const initialExpeditors=names.map(([lastName,firstName],i)=>({
 id:'exp-'+(4831-i),number:String(4831-i),lastName,firstName,middleName:i===0?'Бакытович':'',phone:phones[i],shop:i===0?tradePoints[0]:'',board:i===0?'03A':'',
 status:i===2||i===7?'Заблокирован':i===4?'Уволен':'Активен',createdAt:i===0?'2026-11-12T09:00:00+06:00':null,firedAt:i===0?'2026-10-02T09:00:00+06:00':null,
 login:null,accessAt:null,accessDemo:false,accessRequests:[],aliases:[lastName+' '+firstName],hasOperations:i===0?true:null,
 baselineSupplies:i===0?1240000:null,baselineExpenses:i===0?28400:null,history:i===0?[
  {event:'Наличные не сданы в кассу',timestamp:'2026-11-13T20:00:00+06:00',author:'Система',invoiceId:10427,amount:45000,description:'По накладной №10427.',marker:'HistoryCashDot'},
  {event:'Статус: Уволен → Активен',timestamp:'2026-11-12T09:00:00+06:00',author:'Асанова А.',description:'Повторный приём. Дата увольнения 02.10.2026 сохранена.',marker:'HistoryMutedDot'},
 ]:[],
}));
// Правило переходов — ТЗ §4.3. Возврат из «Уволен» только в «Активен».
export function allowedExpeditorStatuses(previous){return previous?({
 'Активен':['Активен','Заблокирован','Уволен'],
 'Заблокирован':['Заблокирован','Активен','Уволен'],
 'Уволен':['Уволен','Активен'],
 }[previous]||[]):expeditorStatuses}
export function validateExpeditor(draft,existing,previous){
 const errors={};
 if(!previous&&!tradePoints.includes(draft.shop))errors.shop='Выберите торговую точку.';
 if(previous&&draft.shop!==previous.shop)errors.shop='Торговую точку нельзя изменить.';
 if(!draft.lastName.trim())errors.lastName='Введите фамилию.';
 if(!draft.firstName.trim())errors.firstName='Введите имя.';
 if(!/^\d{9}$/.test(draft.phone))errors.phone='Введите 9 цифр после +996.';
 if(!/^[A-Za-z0-9]{2,10}$/.test(draft.board))errors.board='Укажите 2–10 символов: цифры и латиница.';
 if(!draft.number.trim())errors.number='Введите уникальный номер.';
 else if(existing.some(e=>e.id!==draft.id&&e.number===draft.number.trim()))errors.number='Этот уникальный номер уже используется.';
 if(!allowedExpeditorStatuses(previous?.status).includes(draft.status))errors.status='Этот переход статуса недоступен.';
 return errors;
}
export function expeditorAmounts(e,rows=[],snapshot=[],movements=[],expenses=null,hotSales=[]){
 const owned=rows.filter(r=>ownsInvoice(e,r)),before=snapshot.filter(r=>ownsInvoice(e,r));
 const sum=(list,fn)=>list.reduce((total,r)=>total+Math.round(fn(r)*100),0)/100;
 const suppliesKnown=sum(owned,r=>invoiceAmounts(r).original);
 return {
  supplies:e.baselineSupplies==null?owned.length||e.hasOperations===false?suppliesKnown:null:Math.max(0,Math.round((e.baselineSupplies+suppliesKnown-sum(before,r=>invoiceAmounts(r).original))*100)/100),
  shortageDebt:expeditorShortageDebt(movements,e.id),debt:Math.round((sum(owned,r=>invoiceAmounts(r).debt)+expeditorShortageDebt(movements,e.id)+hotSalesDebt(hotSales,e.id))*100)/100,cash:Math.round((sum(owned,r=>invoiceAmounts(r).cash)+hotSalesDebt(hotSales,e.id))*100)/100,expenses:e.baselineExpenses??(expenses?.some(row=>row.driverId===e.id)?expenses.filter(row=>row.driverId===e.id).reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100:e.hasOperations===false?0:null),
 };
}
export const canDeleteExpeditor=(e,rows)=>e.hasOperations===false&&!rows.some(r=>ownsInvoice(e,r));
export function saveExpeditor(existing,draft,rows,{confirmedDebt=false,movements=[],hotSales=[],timestamp=new Date().toISOString()}={}){
 const previous=existing.find(e=>e.id===draft.id),errors=validateExpeditor(draft,existing,previous);
 if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
 if(previous&&previous.status!=='Уволен'&&draft.status==='Уволен'&&expeditorAmounts(previous,rows,[],movements,null,hotSales).debt>0&&!confirmedDebt)throw new Error('Подтвердите увольнение с долгом.');
 const next={...draft,lastName:draft.lastName.trim(),firstName:draft.firstName.trim(),middleName:draft.middleName.trim(),number:draft.number.trim(),phone:phoneDigits(draft.phone),
  createdAt:previous?previous.createdAt:timestamp,firedAt:previous?.firedAt||null,hasOperations:previous?previous.hasOperations:false};
 if(previous?.status!=='Уволен'&&next.status==='Уволен')next.firedAt=timestamp;
 next.aliases=[...new Set([...(previous?.aliases||[]),...(previous?[expeditorName(previous),expeditorFullName(previous)]:[]),expeditorName(next),expeditorFullName(next)])];
 const labels={shop:'Торговая точка',lastName:'Фамилия',firstName:'Имя',middleName:'Отчество',phone:'Телефон',board:'Борт',number:'Уникальный номер',status:'Статус'};
 const changes=previous?Object.entries(labels).filter(([key])=>previous[key]!==next[key]).map(([key,label])=>({field:label,from:previous[key]||'—',to:next[key]||'—'})):[];
 next.history=[...(!previous?[{event:'Экспедитор добавлен',timestamp,author:'Асанова Айгерим',changes:[]}]:changes.length?[{event:previous.status!==next.status?'Статус: '+previous.status+' → '+next.status:'Данные изменены',timestamp,author:'Асанова Айгерим',description:previous.status==='Уволен'&&next.status==='Активен'?'Повторный приём. Дата увольнения сохранена.':next.status==='Уволен'?'Прежние долги сохранены за экспедитором.':undefined,changes}]:[]),...(previous?.history||[])];
 return next;
}
export function deleteExpeditor(existing,id,rows){
 const item=existing.find(e=>e.id===id);
 if(!item||!canDeleteExpeditor(item,rows))throw new Error('По экспедитору были операции или нет данных об их отсутствии. Можно заблокировать или уволить.');
 return existing.filter(e=>e.id!==id);
}
// Локальная демонстрация интерфейса: фактическая отправка SMS не выполняется.
// Лимит 3 за 15 минут взят из tasks/01 и требует подтверждения серверного контракта.
export function accessCooldown(e,now=Date.now()){
 const recent=(e.accessRequests||[]).filter(t=>now-t<15*60*1000);
 return recent.length>=3?Math.max(0,Math.ceil((Math.min(...recent)+15*60*1000-now)/1000)):0;
}
export function prepareDemoAccess(e,now=Date.now()){
 if(accessCooldown(e,now)>0)throw new Error('Лимит отправок. Попробуйте позже.');
 const timestamp=new Date(now).toISOString();
 return {...e,accessDemo:true,accessAt:timestamp,accessRequests:[...(e.accessRequests||[]).filter(t=>now-t<15*60*1000),now],
 history:[{event:'Доступ подготовлен (демо)',timestamp,author:'Асанова Айгерим',description:'Демонстрация отправки доступа. SMS не отправлялось.'},...(e.history||[])]};
}
export const activeExpeditorNames=items=>items.filter(e=>e.status==='Активен').map(expeditorName);
export const matchesExpeditor=(e,query)=>normalizeSearch([e.number,expeditorFullName(e),formatPhone(e.phone),e.status].join(' ')).includes(normalizeSearch(query));
