import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProducts} from './products-model.js';
import {expeditorAmounts,saveExpeditor,initialExpeditors} from './expeditors-model.js';
import {initialMovements,productLine,blankLine,validateMovement,saveMovement,movementTotal,discrepancyTotal,lineDifference,decideDiscrepancy,bishkekToday,matchesMovement,warehouseHash,shortageBalance,expeditorShortageDebt,acceptShortageCash} from './warehouse-model.js';
import {readCabinetLocation} from './product-navigation.js';
const today='2026-11-17',options={today,timestamp:'2026-11-17T12:00:00Z'};
const draft=()=>({date:today,driverId:'exp-4830',comment:' Тест ',lines:[productLine(initialProducts[0],'line1')]});
const errors=d=>validateMovement(d,initialProducts,initialExpeditors,undefined,today);
test('Склад: дата по Бишкеку, задняя и несуществующая дата запрещены, активный экспедитор обязателен',()=>{
 assert.equal(bishkekToday(new Date('2026-11-16T19:00:00Z')),today);
 assert.ok(errors({...draft(),date:'2026-11-16'}).date);
 assert.ok(errors({...draft(),date:'2026-11-31'}).date);
 assert.ok(errors({...draft(),driverId:'exp-4829'}).driverId);
 assert.deepEqual(errors(draft()),{});
});
test('Склад: пустые позиции, неактивный/повторный товар, нулевое и бесконечное количество не сохраняются',()=>{
 assert.ok(errors({...draft(),lines:[]}).lines);
 assert.ok(errors({...draft(),lines:[blankLine('empty')]} )['product-empty']);
 assert.ok(errors({...draft(),lines:[productLine(initialProducts[6],'inactive')]} )['product-inactive']);
 assert.ok(errors({...draft(),lines:[productLine(initialProducts[0],'a'),productLine(initialProducts[0],'b')]} )['product-b']);
 for(const value of [0,-1,'',Infinity,'abc'])assert.ok(errors({...draft(),lines:[{...draft().lines[0],quantity:value}]})['quantity-line1']);
});
test('Склад: номер присваивается последовательно, цена/штрихкод берутся из справочника, фактическое равно выданному',()=>{
 const d=draft();d.lines[0]={...d.lines[0],price:1,barcode:'подмена',actual:0,quantity:2};
 const first=saveMovement(initialMovements,d,initialProducts,initialExpeditors,options);
 assert.equal(first.number,60029);assert.equal(first.status,'Ожидает подтверждения');
 assert.equal(first.lines[0].price,145);assert.equal(first.lines[0].barcode,'4860001012345');assert.equal(first.lines[0].actual,2);assert.equal(movementTotal(first),290);
 const second=saveMovement([first,...initialMovements],draft(),initialProducts,initialExpeditors,options);assert.equal(second.number,60030);
 assert.equal(first.comment,'Тест');assert.equal(first.history.length,1);
});
test('Склад: только ожидающее перемещение редактируется, исторический снимок позиции сохраняется',()=>{
 const old=initialMovements[0];const updated=saveMovement(initialMovements,{...old,comment:'Изменено'},initialProducts,initialExpeditors,options);
 assert.equal(updated.number,old.number);assert.equal(updated.lines[0].price,82);assert.equal(updated.date,old.date);assert.equal(updated.history.length,1);
 assert.throws(()=>saveMovement(initialMovements,initialMovements[1],initialProducts,initialExpeditors,options),/просмотра/);
});
test('Склад: фактическая сумма 3068, недостача 164, дробное расхождение не округляется до целых/тыйынов',()=>{
 const m=initialMovements[2];assert.equal(movementTotal(m),3068);assert.equal(discrepancyTotal(m),164);
 assert.equal(lineDifference({quantity:2,actual:3}),0);assert.equal(lineDifference({quantity:1,actual:.875}),.125);
});
test('Склад: отклонение требует причину, решения сохраняют количества, отклонение принимает перемещение и создаёт долг',()=>{
 const m=initialMovements[2];assert.throws(()=>decideDiscrepancy(m,'rejected','  '),/причину/);
 for(const decision of ['confirmed','rejected']){
  const next=decideDiscrepancy(m,decision,'Проверено');assert.equal(next.status,decision==='rejected'?'Принято':'Частично принято');assert.equal(next.lines[0].actual,22);assert.equal(movementTotal(next),3068);
  assert.equal(next.discrepancy.state,decision);assert.equal(next.history[0].description,'Проверено');assert.equal(next.discrepancy.author,'Асанова Айгерим');
  assert.throws(()=>decideDiscrepancy(next,'confirmed'),/рассмотрено/);
 }
 assert.equal(m.discrepancy.state,'pending');
});
test('Склад: поиск по номеру, видимой сумме и причине; URL каждого экрана восстанавливается',()=>{
 const money=n=>n.toFixed(2).replace('.',',')+' с';
 for(const query of ['60026','СМИРНОВ','3068,00','Недопоставка'])assert.ok(matchesMovement(initialMovements[2],query,initialExpeditors,money));
 for(const mode of ['list','create','view','edit','discrepancy']){
  const route={mode,...(['view','edit','discrepancy'].includes(mode)?{id:'60026'}:{})};assert.deepEqual(readCabinetLocation(warehouseHash(route)),{section:'Склад',route});
 }
 assert.deepEqual(readCabinetLocation('#warehouse/%broken'),{section:'Склад',route:{mode:'list'}});
});

test('Недостача: только отклонение начисляет 164, принятые количества и сумма 3068 сохраняются',()=>{
 const m=initialMovements[2],rejected=decideDiscrepancy(m,'rejected','Проверено'),confirmed=decideDiscrepancy(m,'confirmed');
 assert.equal(shortageBalance(rejected),164);assert.equal(shortageBalance(confirmed),0);
 assert.equal(expeditorShortageDebt([rejected],m.driverId),164);assert.equal(expeditorShortageDebt([rejected],'exp-4831'),0);
 assert.equal(expeditorAmounts(initialExpeditors[1],[],[],[rejected]).debt,164);
 assert.equal(expeditorAmounts(initialExpeditors[1],[],[],[rejected]).cash,0);
 assert.equal(rejected.history.filter(e=>e.event==='Недостача записана на экспедитора').length,1);
});
test('Касса недостачи: частичное/полное погашение, отрицательная сумма/превышение/повтор запрещены',()=>{
 const m=decideDiscrepancy(initialMovements[2],'rejected','Проверено');
 for(const amount of [0,-1,165,Infinity,NaN,1.001])assert.throws(()=>acceptShortageCash(m,amount));
 const partial=acceptShortageCash(m,100);assert.equal(shortageBalance(partial),64);assert.equal(partial.shortage.receipts.length,1);assert.equal(m.shortage.paid,0);
 const paid=acceptShortageCash(partial,64);assert.equal(shortageBalance(paid),0);assert.equal(paid.status,'Принято');assert.equal(movementTotal(paid),3068);assert.equal(paid.lines[0].actual,22);
 assert.equal(paid.shortage.receipts.length,2);assert.equal(expeditorAmounts(initialExpeditors[1],[],[],[paid]).debt,0);
 assert.throws(()=>acceptShortageCash(paid,1));assert.throws(()=>acceptShortageCash(initialMovements[0],1));
});
test('Долг недостачи защищает увольнение и не перераспределяется на другие документы',()=>{
 const one=decideDiscrepancy(initialMovements[2],'rejected','Проверено');
 const two={...structuredClone(one),id:'60030',number:60030};
 assert.equal(expeditorShortageDebt([one,two],one.driverId),328);
 assert.equal(expeditorShortageDebt([acceptShortageCash(one,164),two],one.driverId),164);
 const e={...initialExpeditors[1],board:'QA01'},fired={...e,status:'Уволен'};
 assert.throws(()=>saveExpeditor([e],fired,[],{movements:[one]}),/Подтвердите увольнение/);
 assert.equal(saveExpeditor([e],fired,[],{movements:[one],confirmedDebt:true}).status,'Уволен');
});
