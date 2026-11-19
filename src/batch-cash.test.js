import test from 'node:test';
import assert from 'node:assert/strict';
import {planCashSettlement} from './batch-cash.js';
const row=(id,date,cash,driver='Смирнов Сергей')=>[id,date,'','',''+driver,0,'Наличные',cash,0,0,'Долг','',0,cash,''];
const rows=[row(10421,'12.11.2026',20000),row(10416,'11.11.2026',28000),row(10418,'12.11.2026',20000)];
test('65000 распределяются по флоу: 28000 + 20000 + 17000, остаток 3000 по №10421',()=>{
 assert.deepEqual(planCashSettlement(rows,[10421,10418,10416],65000),[{id:10416,amount:28000,remainingCash:0},{id:10418,amount:20000,remainingCash:0},{id:10421,amount:17000,remainingCash:3000}]);
});
test('Полная сдача 68000 закрывает все выбранные наличные',()=>{
 const plan=planCashSettlement(rows,[10416,10418,10421],68000);
 assert.equal(plan.reduce((sum,p)=>sum+p.amount,0),68000);
 assert.ok(plan.every(p=>p.remainingCash===0));
});
test('Исключённая накладная не получает оплату',()=>{
 assert.deepEqual(planCashSettlement(rows,[10421],10000),[{id:10421,amount:10000,remainingCash:10000}]);
});
test('Нет скрытого распределения переплаты, двойных документов или смешения экспедиторов',()=>{
 for(const amount of [0,-1,68000.01,NaN])assert.throws(()=>planCashSettlement(rows,[10416,10418,10421],amount));
 assert.throws(()=>planCashSettlement(rows,[],1));
 assert.throws(()=>planCashSettlement(rows,[10416,10416],1));
 assert.throws(()=>planCashSettlement([...rows,row(999,'11.11.2026',10,'Асанов Азамат')],[10416,999],1));
});
