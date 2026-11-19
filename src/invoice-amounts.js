// Деньги считаем в тыйынах. Наличные до приёма кассой не входят во внесённую сумму.
const cents = value => Math.round(Number(value || 0) * 100);
export function invoiceAmounts(row) {
  const original = cents(row[7]);
  const posted = cents(row[8]);
  const cash = cents(row[13]);
  const closed = ['Возврат', 'Отменен'].includes(row[10]);
  const debt = closed ? 0 : Math.max(0, original - posted);
  return {
    original: original / 100,
    payable: closed ? 0 : original / 100,
    posted: posted / 100,
    cash: cash / 100,
    overpayment: Math.max(0, posted - original) / 100,
    debt: debt / 100,
    waiting: !closed && row[10] === 'Ожидает оплаты' ? Math.max(0, original - posted - cash) / 100 : 0,
    storeDebt: closed || row[10] === 'Ожидает оплаты' ? 0 : Math.max(0, original - posted - cash) / 100,
  };
}

// Производные колонки не берём из демоданных, файла или API: единый расчёт для всех представлений.
export function normalizeInvoiceRow(row) {
  const amounts = invoiceAmounts(row);
  const normalized = [...row];
  normalized[9] = amounts.overpayment;
  normalized[12] = amounts.storeDebt;
  return normalized;
}

export function sumAmounts(rows, key) {
  return rows.reduce((sum, row) => sum + cents(invoiceAmounts(row)[key]), 0) / 100;
}

// Локальное демо расчёта по ТЗ §4.4; сетевой кассовой операции здесь нет.
export function acceptInvoiceCash(row, amount) {
  const value = cents(amount);
  if (!Number.isFinite(amount) || value <= 0 || amount !== value / 100) throw new Error('Укажите сумму больше 0 с точностью до тыйына.');
  if (['Возврат','Отменен'].includes(row[10]) || cents(row[13]) <= 0) throw new Error('Нет наличных к приёму.');
  const next = [...row];
  next[8] = (cents(row[8]) + value) / 100;
  next[13] = Math.max(0, cents(row[13]) - value) / 100;
  next[10] = cents(next[8]) >= cents(next[7]) ? 'Оплачен' : 'Долг';
  return normalizeInvoiceRow(next);
}
