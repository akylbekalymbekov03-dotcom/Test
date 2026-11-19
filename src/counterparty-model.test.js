import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {counterpartyStatement,statementExport,sameCounterparty,counterpartyHash} from './counterparty-model.js';
import {acceptInvoiceCash} from './invoice-amounts.js';
import {readCabinetLocation} from './product-navigation.js';
const rows=JSON.parse(fs.readFileSync(new URL('../public/data/invoices.json',import.meta.url))),source=rows.find(r=>r[0]===10421);
test('Сверка: пример Figma 2400 + 74100 − 64500 − 300 = 11700',()=>{
 const s=counterpartyStatement(source,rows,['2026-11-07','2026-11-13']);
 assert.deepEqual([s.opening,s.supply,s.paid,s.returned,s.closing],[2400,74100,64500,300,11700]);
 assert.deepEqual(s.entries.map(e=>e.balance),[-500,500,11700]);
 const output=statementExport(s,['2026-11-07','2026-11-13']);assert.equal(output[2][6],0);assert.equal(output[2][7],500);
 assert.equal(rows.find(r=>r[0]===10421)[8],0);
});
test('Сверка: границы периода переносят остаток; начальный остаток не увеличивает оборот',()=>{
 const day=counterpartyStatement(source,rows,['2026-11-17','2026-11-17']);assert.equal(day.opening,11700);assert.equal(day.closing,11700);assert.equal(day.entries.length,0);
 const week=counterpartyStatement(source,rows,['2026-11-11','2026-11-17']);assert.equal(week.opening,500);assert.equal(week.supply,31200);assert.equal(week.closing,11700);
 const month=counterpartyStatement(source,rows,['2026-10-19','2026-11-17']);assert.equal(month.opening,2400);assert.equal(month.supply,74100);assert.equal(month.closing,11700);
});
test('Сверка: приём наличных кассой не учитывается второй оплатой магазина',()=>{
 const changed=rows.map(r=>r===source?acceptInvoiceCash(r,20000):r);
 const before=counterpartyStatement(source,rows,['2026-11-07','2026-11-13']),after=counterpartyStatement(source,changed,['2026-11-07','2026-11-13']);
 assert.equal(after.closing,before.closing);assert.equal(after.paid,before.paid);assert.deepEqual(after.entries.at(-1).channels,['Наличные (приняты кассой)']);
});
test('Сверка: чужие точки не смешиваются; возврат снимает долг, отмена исключается',()=>{
 const s=rows[0],returned=[...s];returned[10]='Возврат';assert.equal(counterpartyStatement(s,[returned],['2026-11-01','2026-11-17']).closing,0);
 const cancelled=[...s];cancelled[10]='Отменен';assert.equal(counterpartyStatement(s,[cancelled],['2026-11-01','2026-11-17']).entries.length,0);
 const other=[...s];other[3]='Другой адрес';assert.equal(sameCounterparty(s,other),false);
 assert.equal(counterpartyStatement(s,[...rows,other],['2026-11-01','2026-11-17']).closing,12443);
 assert.deepEqual(readCabinetLocation(counterpartyHash(10421)),{section:'Контрагент',route:{mode:'view',id:'10421'}});
});
