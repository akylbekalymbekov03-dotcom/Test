import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemoInvoices,createDemoExpenses,createDemoHotSales,createDemoMovements,demoDate} from './demo-period-data.js';
import {initialExpenses} from './expenses-model.js';
import {initialHotSales,hotSaleAmounts} from './hot-sales-model.js';
import {initialMovements,movementTotal} from './warehouse-model.js';
import {periodRange} from './list-utils.js';
import {invoiceAmounts} from './invoice-amounts.js';
import {transferCandidates,transferToday} from './transfer-invoices.js';

const today='2026-11-18',base=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url)));
test('Демоданные: каждый следующий период добавляет записи и меняет итог во всех четырёх разделах',()=>{
 const invoices=createDemoInvoices(base,today);
 const datasets=[
  [invoices.rows,r=>r[1].split('.').reverse().join('-'),r=>invoiceAmounts(r).payable],
  [createDemoExpenses(initialExpenses,today),r=>r.date,r=>r.amount],
  [createDemoHotSales(initialHotSales,today),r=>r.date,r=>hotSaleAmounts(r).original],
  [createDemoMovements(initialMovements,today),r=>r.date,movementTotal],
 ];
 for(const [rows,date,amount] of datasets){
  const periods=['День','3 дня','Неделя','2 недели','Месяц'].map(period=>{const [start,end]=periodRange(period,today),selected=rows.filter(r=>date(r)>=start&&date(r)<=end);return {count:selected.length,sum:selected.reduce((sum,row)=>sum+amount(row),0)}});
  assert.equal(periods[0].count,4);
  for(let i=1;i<periods.length;i++){assert.ok(periods[i].count>periods[i-1].count);assert.notEqual(periods[i].sum,periods[i-1].sum)}
  assert.ok(rows.some(r=>date(r)<periodRange('Месяц',today)[0]));
 }
});
test('Демоданные не меняют исходные снимки; товары, оплаты и остатки финансово согласованы',()=>{
 const before=JSON.stringify([base,initialExpenses,initialHotSales,initialMovements]);
 const invoices=createDemoInvoices(base,today);
 for(const row of invoices.rows.filter(r=>r[0]>=12000)){
  assert.equal(invoices.products[row[0]].reduce((sum,item)=>sum+item[2],0),row[7]);
  const a=invoiceAmounts(row);assert.ok(a.overpayment>=0);assert.ok(a.cash>=0);assert.ok(a.storeDebt>=0);
  assert.ok(invoices.history.some(e=>e.id===row[0]));
 }
 for(const rows of [invoices.rows,createDemoExpenses(initialExpenses,today),createDemoHotSales(initialHotSales,today),createDemoMovements(initialMovements,today)])assert.equal(new Set(rows.map(r=>Array.isArray(r)?r[0]:r.id)).size,rows.length);
 assert.equal(JSON.stringify([base,initialExpenses,initialHotSales,initialMovements]),before);
});
test('Демоданные смещаются вместе с сегодняшней датой и корректно переходят через границу года',()=>{
 assert.equal(demoDate('2027-01-02',3),'2026-12-30');
 assert.equal(demoDate('2028-03-01',1),'2028-02-29');
 const rows=createDemoInvoices(base,'2027-01-02').rows;
 assert.equal(rows[0][1],'02.01.2027');
 assert.equal(transferCandidates(rows,rows[0][4],'02.01.2027').some(r=>r[0]===rows[0][0]),true);
 const current=createDemoInvoices(base,transferToday.split('.').reverse().join('-')).rows;
 assert.equal(transferCandidates(current,current[0][4]).some(r=>r[0]===current[0][0]),true);
});
