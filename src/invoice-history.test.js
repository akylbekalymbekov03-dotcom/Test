import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {historyForInvoice} from './invoice-history.js';
const rows=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url)));
test('Истории статусов содержат загрузку с реальной исходной суммой и оплату без подмены наличных кассой',()=>{
 for(const id of [10428,10427,10426,10423,10424,10422]){
   const row=rows.find(r=>r[0]===id),events=historyForInvoice(id);
   assert.equal(events.find(e=>e.event==='Накладная загружена').amount,row[7]);
   assert.ok(events.every(e=>Number.isFinite(new Date(e.timestamp).getTime())));
 }
 assert.equal(historyForInvoice(10427).find(e=>e.event==='Оплачено наличными').amount,45000);
 assert.equal(historyForInvoice(10427).some(e=>e.event==='Наличные приняты кассой'),false);
 assert.equal(historyForInvoice(10423).find(e=>e.event==='Оплачено по QR').amount,23000);
});
test('Новые события добавляются только в свою накладную в порядке времени, исходная история сохраняется',()=>{
 const local=[{id:10428,event:'Замена экспедитора',timestamp:'2026-11-16T10:00:00+06:00'},{id:10427,event:'Наличные приняты кассой',timestamp:'2026-11-16T11:00:00+06:00'}];
 const first=historyForInvoice(10428,local);
 assert.equal(first.length,2);assert.equal(first[0].event,'Замена экспедитора');assert.equal(first[1].event,'Накладная загружена');
 assert.equal(historyForInvoice(10426,local).length,2);
 assert.deepEqual(historyForInvoice('новая'),[]);
 assert.equal(local.length,2);
});
