import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardData,dashboardTotals,previousRange,comparison} from './dashboard-model.js';
const row=(id,date,status,amount,posted,cash=0,party='Точка')=>[id,date,party,'Адрес','Асанов Азамат',1,'',amount,posted,0,status,'',0,cash];
test('Сводка: ожидание отдельно от долга магазина; переплата одной точки не закрывает другую',()=>{
 const data=dashboardTotals([row(1,'18.11.2026','Ожидает оплаты',100,0),row(2,'18.11.2026','Долг',100,20,30),row(3,'18.11.2026','Оплачен',100,150),row(4,'18.11.2026','Отменен',100,0)]);
 assert.equal(data.payable,300);assert.equal(data.posted,170);assert.equal(data.covered,120);assert.equal(data.percent,40);assert.equal(data.storeDebt,50);assert.equal(data.waiting,100);assert.equal(data.debt,data.storeDebt+data.waiting+data.cash);
 assert.equal(data.overpayment,50);
 assert.equal(data.payable,data.posted-data.overpayment+data.waiting+data.storeDebt+data.cash-data.cashOverpayment);
});
test('Сводка: текущий и предыдущий периоды не пересекаются, график и таблица сходятся с итогами',()=>{
 const rows=[row(1,'18.11.2026','Долг',100,20),row(2,'17.11.2026','Оплачен',50,50),row(3,'16.11.2026','Оплачен',80,80)];
 const data=dashboardData(rows,[],['2026-11-17','2026-11-18']);
 assert.equal(data.total.count,2);assert.equal(data.previous.count,1);assert.equal(data.daily.reduce((n,d)=>n+d.payable,0),data.total.payable);assert.equal(data.drivers.reduce((n,d)=>n+d.posted,0),data.total.posted);assert.equal(data.parties[0].storeDebt,80);
 assert.deepEqual(previousRange(['2027-01-01','2027-01-03']),['2026-12-29','2026-12-31']);
});
test('Сводка: фильтр экспедитора и пустые периоды без выдуманной динамики',()=>{
 const rows=[row(1,'18.11.2026','Долг',100,20)];
 assert.equal(dashboardData(rows,[],['2026-11-18','2026-11-18'],'Другой').total.count,0);
 assert.equal(dashboardTotals([]).percent,0);assert.equal(comparison(100,0),'В прошлом периоде — 0');assert.equal(comparison(0,0),'Без изменений');
});
