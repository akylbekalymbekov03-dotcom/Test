import test from 'node:test';
import assert from 'node:assert/strict';
import {periodRange,invoiceMatchesSearch} from './list-utils.js';
test('Быстрый период включает сегодняшний день и нужное число дней',()=>{
 assert.deepEqual(periodRange('День'),['2026-11-13','2026-11-13']);
 assert.deepEqual(periodRange('3 дня'),['2026-11-11','2026-11-13']);
 assert.deepEqual(periodRange('Неделя'),['2026-11-07','2026-11-13']);
 assert.deepEqual(periodRange('2 недели'),['2026-10-31','2026-11-13']);
 assert.deepEqual(periodRange('Месяц'),['2026-10-15','2026-11-13']);
 assert.deepEqual(periodRange('Все'),['','']);
});
test('Поиск понимает видимые статусы, форматированные суммы, регистр и пробелы',()=>{
 const row=[10427,'13.11.2026','ИП Сайданов И.','ул. Токтогула, 92','Асанов Азамат',10246,'Наличные',45000,0,0,'Долг','',0,45000,''];
 const money=n=>n===45000?'45\u00a0000,00 с':'—';
 assert.ok(invoiceMatchesSearch(row,'наличные не сданы',money));
 assert.ok(invoiceMatchesSearch(row,'45 000,00',money));
 assert.ok(invoiceMatchesSearch(row,'АСАНОВ АЗАМАТ',money));
 assert.equal(invoiceMatchesSearch(row,'Смирнов',money),false);
});
