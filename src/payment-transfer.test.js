import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transferPayment,canTransferPayment} from './payment-transfer.js';
import {invoiceAmounts,sumAmounts} from './invoice-amounts.js';
import {counterpartyStatement} from './counterparty-model.js';

const snapshot=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url)));
const actor={name:'Асанова Айгерим',role:'СЕО',status:'Активен'};
const data={sourceId:10426,targetId:10419,reason:'Похожее название точки',expectedAmount:18750};
const timestamp='2026-11-18T03:12:00.000Z';
test('Перенос из макета: 18750 со счёта 10426 на 10419; переплата 1270, деньги и исходные суммы сохранены',()=>{
 const before=structuredClone(snapshot),result=transferPayment(before,data,actor,timestamp);
 const source=result.rows.find(r=>r[0]===10426),target=result.rows.find(r=>r[0]===10419);
 assert.equal(source[8],0);assert.equal(source[10],'Ожидает оплаты');assert.equal(source[12],0);assert.equal(invoiceAmounts(source).waiting,18750);
 assert.equal(target[8],18750);assert.equal(target[10],'Оплачен');assert.equal(target[9],1270);assert.equal(target[12],0);
 assert.equal(sumAmounts(before,'posted'),sumAmounts(result.rows,'posted'));
 assert.deepEqual(result.rows.map(r=>r[7]),before.map(r=>r[7]));assert.deepEqual(before,snapshot);
 assert.deepEqual(result.events.map(e=>e.id),[10426,10419]);assert.ok(result.events.every(e=>e.timestamp===timestamp&&e.author===actor.name&&e.amount===18750&&e.description.includes(data.reason)));
 assert.throws(()=>transferPayment(result.rows,data,actor,timestamp));
});
test('Частичная оплата и имеющиеся средства назначения складываются в тыйынах; наличные и владельцы не меняются',()=>{
 const rows=structuredClone(snapshot);rows.find(r=>r[0]===10426)[8]=.1;
 const target=rows.find(r=>r[0]===10419);target[7]=1;target[8]=.2;target[13]=.3;
 const result=transferPayment(rows,{...data,expectedAmount:.1},actor,timestamp),next=result.rows.find(r=>r[0]===10419);
 assert.equal(next[8],.3);assert.equal(next[10],'Долг');assert.equal(next[13],.3);assert.equal(next[4],target[4]);assert.equal(invoiceAmounts(next).storeDebt,.4);
});
test('Нельзя перенести неподтверждённые наличные, на себя, на свою точку, в отменённый счёт, без причины или с устаревшей суммой',()=>{
 const samePoint=structuredClone(snapshot);Object.assign(samePoint.find(r=>r[0]===10419),{2:'ОсОО «Береке»',3:'пр. Чуй, 118',5:10247});
 assert.throws(()=>transferPayment(samePoint,data,actor));
 for(const patch of [{sourceId:10427,expectedAmount:0},{targetId:10426},{targetId:10422},{targetId:10424},{targetId:'missing'},{reason:''},{expectedAmount:18749}])assert.throws(()=>transferPayment(snapshot,{...data,...patch},actor));
 for(const invalid of [{...actor,role:'Экспедитор'},{...actor,role:'Админ'},{...actor,status:'Заблокирован'}])assert.throws(()=>transferPayment(snapshot,data,invalid));
 assert.equal(canTransferPayment(snapshot.find(r=>r[0]===10427),'СЕО'),false);
});
test('Сверка отражает перенос в день операции по Бишкеку, прошлые периоды не переписываются',()=>{
 const result=transferPayment(snapshot,data,actor,'2026-11-17T21:12:00.000Z');
 for(const id of [10426,10419]){
  const source=snapshot.find(r=>r[0]===id),next=result.rows.find(r=>r[0]===id);
  const old=counterpartyStatement(source,snapshot,['2026-11-13','2026-11-17']);
  const past=counterpartyStatement(next,result.rows,['2026-11-13','2026-11-17'],[result.transfer]);
  assert.equal(past.closing,old.closing);assert.equal(past.paid,old.paid);
  const today=counterpartyStatement(next,result.rows,['2026-11-18','2026-11-18'],[result.transfer]);
  assert.equal(today.opening,old.closing);assert.equal(today.entries.length,1);
  assert.equal(today.closing,id===10426?18750:-1270);
 }
});
