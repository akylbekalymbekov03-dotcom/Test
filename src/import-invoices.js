import {readSheet} from 'read-excel-file/browser';
import {normalizeInvoiceRow} from './invoice-amounts.js';

// TODO: уточнить у аналитика формат УС, обязательные поля и поведение при дублях.
// Временный адаптер демо: заголовки совпадают с колонками отчёта.
export async function importInvoices(file, columns, existingRows) {
  const table = await readSheet(file);
  if (table.length < 2) throw new Error('В файле нет накладных. Выберите файл с заполненными строками.');
  const header = table[0].map(v => String(v ?? '').trim());
  const indices = columns.map(name => header.indexOf(name));
  const required = [0, 1, 2, 3, 4, 5, 7];
  if (required.some(i => indices[i] < 0)) throw new Error('Не найдены нужные колонки. Для демо используйте заголовки из отчёта «Поставки».');
  const seen = new Set(existingRows.map(r => String(r[0])));
  const result = [];
  for (const [offset, source] of table.slice(1).entries()) {
    if (source.every(v => v == null || v === '')) continue;
    const get = i => indices[i] < 0 ? null : source[indices[i]];
    const text = i => String(get(i) ?? '').trim();
    if (required.some(i => get(i) == null || get(i) === '')) throw new Error(`Строка ${offset + 2}: заполните номер, дату, контрагента, адрес, экспедитора, SUB код и сумму.`);
    const id = text(0);
    if (seen.has(id)) throw new Error(`Накладная № ${id} уже есть. Проверьте файл и выберите другой.`);
    seen.add(id);
    const rawDate = get(1);
    const date = rawDate instanceof Date ? new Intl.DateTimeFormat('ru-RU', {timeZone:'UTC'}).format(rawDate) : text(1);
    const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
    const check = parts && new Date(Date.UTC(+parts[3], +parts[2]-1, +parts[1]));
    if (!parts || check.getUTCDate() !== +parts[1] || check.getUTCMonth() !== +parts[2]-1) throw new Error(`Строка ${offset+2}: укажите дату в формате ДД.ММ.ГГГГ.`);
    const number = i => {
      const v = get(i);
      if (v == null || v === '' || v === '—') return 0;
      const parsed = typeof v === 'number' ? v : Number(String(v).replace(/\s/g,'').replace(/с$/,'').replace(',','.'));
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Строка ${offset+2}: проверьте сумму в колонке «${columns[i]}».`);
      return parsed;
    };
    const amount = number(7), posted = number(8), cash = number(13);
    if (amount <= 0) throw new Error(`Строка ${offset+2}: сумма должна быть больше 0.`);
    let status = text(10) || 'Ожидает оплаты';
    if (['Наличные не сданы','Долг магазина'].includes(status)) status = 'Долг';
    if (!['Ожидает оплаты','Долг','Возврат','Отменен','Оплачен'].includes(status)) throw new Error(`Строка ${offset+2}: неизвестный статус.`);
    if (!['','—','Наличные','Безналичные'].includes(text(6))) throw new Error(`Строка ${offset+2}: проверьте тип оплаты.`);
    result.push(normalizeInvoiceRow([id,date,text(2),text(3),text(4),text(5),text(6)||'—',amount,posted,0,status,text(11),0,cash,text(14)]));
  }
  if (!result.length) throw new Error('В файле нет накладных. Выберите другой файл.');
  return result;
}
