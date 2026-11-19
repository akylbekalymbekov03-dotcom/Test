import {bishkekToday,displayDate} from './warehouse-model.js';
// По Бишкеку; в тестах исторического среза дату можно передать явно.
export const transferToday=displayDate(bishkekToday());
export const activeDrivers=['Смирнов Сергей','Асанов Азамат'];
// TODO: уточнить у аналитика справочник причин; этот пункт есть в макете.
export const transferReasons=['Болезнь экспедитора'];
export const transferable=(row,today=transferToday)=>row[1]===today&&row[10]==='Ожидает оплаты';
export function transferCandidates(rows,driver,today=transferToday){return rows.filter(row=>transferable(row,today)&&row[4]===driver)}
export function validateTransfer(rows,{ids,newDriver,reason,fromDriver},availableDrivers=activeDrivers,reasons=transferReasons,today=transferToday){
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new Error('Выберите накладные для передачи');
  const chosen=rows.filter(row=>ids.includes(row[0]));
  if(chosen.length!==ids.length||chosen.some(row=>!transferable(row,today)||(fromDriver&&row[4]!==fromDriver)))throw new Error('Можно передать только сегодняшние накладные «Ожидает оплаты»');
  if(!availableDrivers.includes(newDriver)||chosen.some(row=>row[4]===newDriver))throw new Error('Выберите другого активного экспедитора');
  if(!reasons.includes(reason))throw new Error('Выберите причину замены');
  return chosen;
}
export function invoiceCount(n){return n%10===1&&n%100!==11?'накладную':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'накладные':'накладных'}
export function invoiceNoun(n){return n%10===1&&n%100!==11?'накладная':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'накладные':'накладных'}
