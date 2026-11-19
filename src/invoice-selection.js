import {transferable} from './transfer-invoices.js';
import {canAcceptCash} from './batch-cash.js';
// Выбор строки не даёт права заменять экспедитора или оформлять возврат.
export const canSelectInvoice=row=>row[10]==='Ожидает оплаты'||canAcceptCash(row);
export function invoiceSelectionActions(rows,ids,today){
 const selected=rows.filter(r=>ids.includes(r[0])),complete=ids.length>0&&selected.length===ids.length;
 return {transfer:complete&&selected.every(r=>transferable(r,today)),cash:complete&&selected.every(canAcceptCash)};
}
