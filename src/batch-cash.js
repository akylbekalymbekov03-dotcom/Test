// Порядок распределения из флоу 259:41509: старые накладные сначала,
// при одной дате — по номеру. TODO: подтвердить у аналитика правило при равных датах.
export const canAcceptCash = row => row[13] > 0 && !['Возврат','Отменен'].includes(row[10]);
export function sortCashInvoices(rows) {
  return [...rows].sort((a,b)=>a[1].split('.').reverse().join('-').localeCompare(b[1].split('.').reverse().join('-')) || String(a[0]).localeCompare(String(b[0]),'ru',{numeric:true}));
}
export function planCashSettlement(rows, ids, amount) {
  const cents=Math.round(amount*100);
  if (!Number.isFinite(amount)||cents<=0||amount!==cents/100) throw new Error('Введите сумму больше 0 с точностью до тыйына.');
  const selected=new Set(ids.map(String));
  const invoices=sortCashInvoices(rows.filter(r=>selected.has(String(r[0]))));
  if(!selected.size||selected.size!==ids.length||invoices.length!==selected.size||invoices.some(r=>!canAcceptCash(r))) throw new Error('Выберите накладные с несданными наличными.');
  if(new Set(invoices.map(r=>r[4])).size!==1) throw new Error('Выберите накладные одного экспедитора.');
  const total=invoices.reduce((sum,r)=>sum+Math.round(r[13]*100),0);
  if(cents>total) throw new Error('Сумма больше наличных по выбранным накладным. Для переплаты откройте нужную накладную.');
  let remaining=cents;
  return invoices.map(row=>{
    const pending=Math.round(row[13]*100);
    const allocated=Math.min(remaining,pending);
    remaining-=allocated;
    return {id:row[0],amount:allocated/100,remainingCash:(pending-allocated)/100};
  });
}
