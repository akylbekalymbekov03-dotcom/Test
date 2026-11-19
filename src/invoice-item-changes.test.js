import test from 'node:test';
import assert from 'node:assert/strict';
import {updateInvoiceItemChange,invoiceChangeAmount} from './invoice-item-changes.js';
const items=[['Вода',10,600],['Сок',3,100]];
const row=[12001,'18.11.2026','Магазин','Адрес','Экспедитор','12345','—',700,0,0,'Ожидает оплаты','',0,0,''];
test('Частичный возврат уменьшает оплату, повторное редактирование заменяет количество',()=>{
 const first=updateInvoiceItemChange(row,items,{},0,'returned',2);
 assert.equal(first.row[7],580);assert.equal(first.row[12],0);assert.equal(first.row[14],2);
 const next=updateInvoiceItemChange(first.row,items,first.changes,0,'returned',3);
 assert.equal(next.row[7],520);assert.equal(next.after,180);
 const removed=updateInvoiceItemChange(next.row,items,next.changes,0,'returned',0);
 assert.equal(removed.row[7],700);assert.equal(removed.row[14],0);
});
test('Утеря и повреждение вместе не превышают исходное количество',()=>{
 const first=updateInvoiceItemChange(row,items,{},0,'lost',6);
 assert.throws(()=>updateInvoiceItemChange(first.row,items,first.changes,0,'damaged',5),/превышать/);
 const next=updateInvoiceItemChange(first.row,items,first.changes,0,'damaged',4);
 assert.equal(next.row[7],100);
 for(const q of [-1,1.5,NaN,Infinity])assert.throws(()=>updateInvoiceItemChange(row,items,{},0,'lost',q));
});
test('Оплаты и наличные сохраняются; превышение оплаты становится положительной переплатой',()=>{
 const paid=[...row];paid[8]=650;paid[10]='Оплачен';
 const result=updateInvoiceItemChange(paid,items,{},0,'damaged',2);
 assert.equal(result.row[7],580);assert.equal(result.row[8],650);assert.equal(result.row[9],70);assert.equal(result.row[10],'Оплачен');assert.equal(result.row[12],0);
 const cash=[...row];cash[10]='Долг';cash[13]=300;
 const next=updateInvoiceItemChange(cash,items,{},0,'lost',2);
 assert.equal(next.row[13],300);assert.equal(next.row[12],280);
});
test('Округление до тыйына при неделимой цене и полном списании',()=>{
 assert.equal(invoiceChangeAmount(items,{1:{returned:1,lost:1,damaged:1}}),100);
 const result=updateInvoiceItemChange(row,items,{},1,'returned',1);
 assert.equal(result.row[7],666.67);
 assert.throws(()=>updateInvoiceItemChange([...row.slice(0,10),'Возврат',...row.slice(11)],items,{},0,'returned',1),/закрытой/);
});
