export const isoDate=date=>date.toISOString().slice(0,10);
export function periodRange(period,today='2026-11-13') {
  if(period==='Все')return ['',''];
  const days={'День':1,'3 дня':3,'Неделя':7,'2 недели':14,'Месяц':30}[period];
  if(!days)throw new Error('Неизвестный период');
  const first=new Date(today+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-days+1);
  return [isoDate(first),today];
}
export function normalizeSearch(text){return String(text).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s/g,'');}
export function statusLabel(row){return row[10]==='Долг'?(row[12]>0?'Долг магазина':'Наличные не сданы'):row[10];}
export function invoiceMatchesSearch(row,query,money){
  const display=row.map((v,i)=>i===10?statusLabel(row):[7,8,9,12,13].includes(i)?money(v):v).join(' ');
  return normalizeSearch(display+' '+row.join(' ')).includes(normalizeSearch(query));
}
