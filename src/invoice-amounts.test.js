import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceAmounts, normalizeInvoiceRow, sumAmounts, acceptInvoiceCash} from './invoice-amounts.js';

const invoice = (amount, posted, cash, status) => [1,'13.11.2026','Магазин','','',1,'',amount,posted,999,status,'',999,cash,''];

test('Ожидание оплаты не входит в долг магазина, сумма к оплате сохраняется', () => {
  const row = normalizeInvoiceRow(invoice(12443,0,0,'Ожидает оплаты'));
  assert.equal(row[12],0);
  assert.equal(invoiceAmounts(row).waiting,12443);
  assert.equal(invoiceAmounts(row).payable,12443);
  assert.equal(row[9],0);
  assert.equal(invoiceAmounts(row).debt,12443);
});
test('Полная оплата наличными до кассы остаётся долгом по накладной', () => {
  const a = invoiceAmounts(invoice(45000,0,45000,'Долг'));
  assert.equal(a.storeDebt,0);
  assert.equal(a.debt,45000);
  assert.equal(a.posted,0);
  assert.equal(a.cash,45000);
});
test('Частичная оплата до кассы: 11200 магазина + 20000 наличных = 31200 общего долга', () => {
  const a = invoiceAmounts(invoice(31200,0,20000,'Долг'));
  assert.equal(a.storeDebt,11200);
  assert.equal(a.debt,a.storeDebt+a.cash);
});
test('После приёма кассой наличные переходят во внесённую, долг магазина не меняется', () => {
  const a = invoiceAmounts(invoice(31200,20000,0,'Долг'));
  assert.equal(a.storeDebt,11200);
  assert.equal(a.debt,11200);
  assert.equal(a.posted,20000);
});
test('Переплата не становится отрицательным долгом', () => {
  const a = invoiceAmounts(invoice(22800,23000,0,'Оплачен'));
  assert.equal(a.overpayment,200);
  assert.equal(a.storeDebt,0);
  assert.equal(a.debt,0);
});
test('Возврат и отмена сохраняют исходную сумму, не входят в К оплате и не создают долг', () => {
  for (const status of ['Возврат','Отменен']) {
    const a = invoiceAmounts(invoice(16500,0,0,status));
    assert.equal(a.original,16500);
    assert.equal(a.payable,0);
    assert.equal(a.storeDebt,0);
    assert.equal(a.debt,0);
  }
});
test('Итоги суммируются в тыйынах, без ошибок дробной арифметики', () => {
  assert.equal(sumAmounts([invoice(.1,0,0,'Ожидает оплаты'),invoice(.2,0,0,'Ожидает оплаты')],'payable'),.3);
});
test('Сводка учитывает переплату отдельно и не теряет несданные наличные', () => {
  const rows = [invoice(12443,0,0,'Ожидает оплаты'),invoice(45000,0,45000,'Долг'),invoice(31200,0,20000,'Долг'),invoice(22800,23000,0,'Оплачен'),invoice(16500,0,0,'Возврат')];
  assert.equal(sumAmounts(rows,'debt'),sumAmounts(rows,'storeDebt')+sumAmounts(rows,'cash')+sumAmounts(rows,'waiting'));
  assert.equal(sumAmounts(rows,'payable')-sumAmounts(rows,'posted')+sumAmounts(rows,'overpayment'),sumAmounts(rows,'debt'));
});
test('Касса принимает часть наличных и сохраняет остаток у экспедитора', () => {
  const row = acceptInvoiceCash(invoice(31200,0,20000,'Долг'),5000);
  assert.equal(row[8],5000);
  assert.equal(row[13],15000);
  assert.equal(row[12],11200);
  assert.equal(row[10],'Долг');
});
test('Полная сдача наличных закрывает долг, превышение уходит в переплату', () => {
  const paid = acceptInvoiceCash(invoice(45000,0,45000,'Долг'),45000);
  assert.equal(paid[10],'Оплачен');
  assert.equal(invoiceAmounts(paid).debt,0);
  const overpaid = acceptInvoiceCash(invoice(45000,0,45000,'Долг'),46000);
  assert.equal(overpaid[9],1000);
  assert.equal(overpaid[13],0);
  assert.equal(overpaid[12],0);
});
test('Касса не принимает ноль, отрицательную сумму, дроби тыйына и документы без наличных', () => {
  for (const amount of [0,-1,.001,NaN]) assert.throws(()=>acceptInvoiceCash(invoice(45000,0,45000,'Долг'),amount));
  assert.throws(()=>acceptInvoiceCash(invoice(45000,0,0,'Долг'),1));
  assert.throws(()=>acceptInvoiceCash(invoice(45000,0,45000,'Возврат'),1));
});
test('25000 по №10421 закрывают 20000 наличных и 5000 долга магазина без переплаты', () => {
  const row = acceptInvoiceCash(invoice(31200,0,20000,'Долг'),25000);
  assert.equal(row[8],25000);
  assert.equal(row[13],0);
  assert.equal(row[12],6200);
  assert.equal(row[9],0);
  assert.equal(row[10],'Долг');
});
