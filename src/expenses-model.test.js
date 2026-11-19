import test from 'node:test';
import assert from 'node:assert/strict';
import {initialExpenses,expenseActionAllowed,transitionExpenses,expenseTotals,expenseMatches,expenseHash} from './expenses-model.js';
import {readCabinetLocation} from './product-navigation.js';
import {initialExpeditors,expeditorAmounts} from './expeditors-model.js';
const options={timestamp:'2026-11-17T09:00:00Z',author:'Асанова Айгерим'};
test('Расходы: подтверждение/отказ только ожидающим, возмещение только подтверждённым; смешанный выбор запрещён',()=>{
 assert.ok(expenseActionAllowed(initialExpenses,['5001','5002'],'confirm'));
 assert.ok(expenseActionAllowed(initialExpenses,['5003','5007'],'reimburse'));
 for(const action of ['confirm','reject','reimburse']){
  for(const ids of [[],['5001','5003'],['5001','5001'],['unknown'],['5005'],['5006']])assert.equal(expenseActionAllowed(initialExpenses,ids,action),false);
 }
 assert.throws(()=>transitionExpenses(initialExpenses,['5001','5003'],'confirm'));
});
test('Расходы: массовая операция атомарная, подтверждение сохраняет автора/время/историю, поля расхода неизменны',()=>{
 const next=transitionExpenses(initialExpenses,['5001','5002'],'confirm','',options);
 assert.equal(next[0].status,'Подтвержден');assert.equal(next[1].status,'Подтвержден');assert.equal(next[2],initialExpenses[2]);
 assert.equal(initialExpenses[0].status,'Ожидает подтверждения');assert.equal(next[0].approvedBy,options.author);assert.equal(next[0].approvedAt,options.timestamp);
 for(const key of ['amount','date','address','party','type','driverId','comment'])assert.equal(next[0][key],initialExpenses[0][key]);
 assert.equal(next[0].history.length,1);assert.throws(()=>transitionExpenses(next,['5001'],'confirm'));
});
test('Расходы: отказ требует причину, отменённый расход нельзя пересмотреть',()=>{
 assert.throws(()=>transitionExpenses(initialExpenses,['5001'],'reject','  '));
 const next=transitionExpenses(initialExpenses,['5001'],'reject',' Нет документа. ',options);
 assert.equal(next[0].status,'Отказан');assert.equal(next[0].reason,'Нет документа.');assert.equal(next[0].rejectedBy,options.author);assert.equal(next[0].history[0].description,'Нет документа.');
 for(const action of ['confirm','reject','reimburse'])assert.throws(()=>transitionExpenses(next,['5001'],action,'Повтор'));
});
test('Расходы: возмещение сохраняет подтверждающего, фиксирует выплату ровно один раз',()=>{
 const next=transitionExpenses(initialExpenses,['5003'],'reimburse','',options),row=next.find(r=>r.id==='5003');
 assert.equal(row.status,'Возмещен');assert.equal(row.approvedAt,'2026-11-13T10:20:00+06:00');assert.equal(row.reimbursedBy,options.author);assert.equal(row.reimbursedAt,options.timestamp);
 assert.equal(row.history[0].amount,1850);assert.throws(()=>transitionExpenses(next,['5003'],'reimburse'));
});
test('Расходы: итоги считаются по реальным строкам, переход меняет категории без изменения общей суммы',()=>{
 const before=expenseTotals(initialExpenses);assert.equal(before.count,10);assert.equal(before['Ожидает подтверждения'],3300);assert.equal(before['Подтвержден'],3650);assert.equal(before['Возмещен'],2600);assert.equal(before['Отказан'],1500);
 const after=expenseTotals(transitionExpenses(initialExpenses,['5001'],'confirm','',options));assert.equal(after['Ожидает подтверждения'],2100);assert.equal(after['Подтвержден'],4850);
 const expeditor=expeditorAmounts(initialExpeditors[1],[],[],[],initialExpenses);assert.equal(expeditor.expenses,7950);assert.equal(expeditor.debt,0);assert.equal(expeditor.cash,0);
});
test('Расходы: поиск по всем полям и форматированной сумме, маршруты списка/сводки/ошибочного ID',()=>{
 const money=n=>n.toFixed(2).replace('.',',')+' с';
 for(const query of ['5001','КИЕВСКАЯ','1200,00','Ля Мезон','Октябрьский','Бензин','Смирнов'])assert.ok(expenseMatches(initialExpenses[0],query,initialExpeditors,money));
 for(const route of [{mode:'list'},{mode:'view',id:'5001'}])assert.deepEqual(readCabinetLocation(expenseHash(route)),{section:'Расходы',route});
 assert.deepEqual(readCabinetLocation('#expenses/%broken'),{section:'Расходы',route:{mode:'list'}});
});
