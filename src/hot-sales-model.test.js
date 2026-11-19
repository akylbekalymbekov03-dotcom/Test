import test from 'node:test';
import assert from 'node:assert/strict';
import {initialHotSales,hotSaleAmounts,acceptHotSalePayment,hotSalesDebt,hotSaleInvoiceRow,hotSaleHash,hotSaleMatches} from './hot-sales-model.js';
import {initialExpeditors,expeditorAmounts,saveExpeditor} from './expeditors-model.js';
import {readCabinetLocation} from './product-navigation.js';
const options={timestamp:'2026-11-17T09:00:00Z',author:'Асанова Айгерим'},sale=initialHotSales[0];
test('Горячая продажа: единые данные списка/детальной/кассы, 24×82+16×79=3232',()=>{
 const a=hotSaleAmounts(sale);assert.equal(a.original,3232);assert.equal(a.cash,3232);assert.equal(a.status,'Долг (Наличные)');
 const row=hotSaleInvoiceRow(sale,initialExpeditors);assert.equal(row[7],3232);assert.equal(row[13],3232);assert.equal(row[4],'Смирнов Сергей');
});
test('Горячая продажа: частичная/полная сдача, повторное погашение и расчёт QR запрещены',()=>{
 const partial=acceptHotSalePayment(sale,1000,0,options);assert.equal(hotSaleAmounts(partial).cash,2232);assert.equal(hotSaleAmounts(partial).status,'Долг (Наличные)');
 const paid=acceptHotSalePayment(partial,2232,0,options);assert.equal(hotSaleAmounts(paid).cash,0);assert.equal(hotSaleAmounts(paid).status,'Оплачен');assert.equal(paid.history.length,2);
 assert.equal(sale.cashPosted,0);assert.throws(()=>acceptHotSalePayment(paid,1));assert.throws(()=>acceptHotSalePayment(initialHotSales[3],1));
});
test('Горячая продажа: смешанная оплата и положительная переплата без отрицательного долга',()=>{
 const next=acceptHotSalePayment(sale,2000,1300,options),a=hotSaleAmounts(next);
 assert.equal(a.posted,3300);assert.equal(a.debt,0);assert.equal(a.overpayment,68);assert.equal(next.cashPosted,2000);assert.equal(next.nonCashPosted,1300);
 assert.equal(next.history[0].cashPart,2000);assert.equal(next.history[0].nonCashPart,1300);
 assert.equal(hotSaleAmounts(acceptHotSalePayment(sale,0,3232)).status,'Оплачен');
});
test('Горячая продажа: ноль, отрицательные, дробные тыйыны и бесконечность не принимаются',()=>{
 for(const [cash,other] of [[0,0],[-1,2],[2,-1],[1.001,0],[1,0.001],[Infinity,0],[NaN,0],[1e308,0]])assert.throws(()=>acceptHotSalePayment(sale,cash,other));
});
test('Горячая продажа: долг/наличные экспедитора уменьшаются на сумму приёма, накладные не затронуты',()=>{
 const e=initialExpeditors[1],before=expeditorAmounts(e,[],[],[],null,[sale]),paid=acceptHotSalePayment(sale,1000),after=expeditorAmounts(e,[],[],[],null,[paid]);
 assert.equal(before.debt,3232);assert.equal(before.cash,3232);assert.equal(after.debt,2232);assert.equal(after.cash,2232);
 assert.equal(hotSalesDebt([sale],'exp-4831'),0);
 const draft={...e,board:'QA01',status:'Уволен'};assert.throws(()=>saveExpeditor([e],draft,[],{hotSales:[sale]}),/Подтвердите увольнение/);
});
test('Горячие продажи: поиск по отображаемым значениям и прямые ссылки',()=>{
 const money=n=>n.toFixed(2).replace('.',',')+' с';
 for(const query of ['45038','3232,00','Наличные не сданы','СМИРНОВ','15.11.2026'])assert.ok(hotSaleMatches(sale,query,initialExpeditors,money));
 for(const route of [{mode:'list'},{mode:'view',id:'45038'}])assert.deepEqual(readCabinetLocation(hotSaleHash(route)),{section:'Горячие продажи',route});
 assert.deepEqual(readCabinetLocation('#hot-sales/%broken'),{section:'Горячие продажи',route:{mode:'list'}});
});
