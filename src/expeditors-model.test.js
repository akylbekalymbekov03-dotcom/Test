import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialExpeditors,expeditorName,allowedExpeditorStatuses,validateExpeditor,saveExpeditor,deleteExpeditor,expeditorAmounts,prepareDemoAccess,accessCooldown,activeExpeditorNames,phoneDigits,formatPhone} from './expeditors-model.js';
import {acceptInvoiceCash} from './invoice-amounts.js';
import {validateTransfer} from './transfer-invoices.js';
const rows=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url)));
const first=initialExpeditors[0];
const draft=()=>({...structuredClone(first),id:'new',number:'9999',lastName:'Тестов',firstName:'Новый',middleName:'',status:'Активен',hasOperations:false,baselineSupplies:null,baselineExpenses:0,createdAt:null,firedAt:null,history:[]});
test('Обязательные поля, девять цифр телефона, латинский борт и уникальный номер проверяются моделью',()=>{
 assert.deepEqual(validateExpeditor(draft(),initialExpeditors),{});
 for(const patch of [{firstName:''},{lastName:' '},{shop:''},{phone:'123'},{phone:'1234567890'},{board:'A-'},{board:'А123'},{board:'12345678901'},{number:first.number},{status:'Неизвестный'}])assert.ok(Object.keys(validateExpeditor({...draft(),...patch},initialExpeditors)).length);
 assert.equal(phoneDigits('996123456'),'996123456');
 assert.equal(phoneDigits('+996 996 123 456'),'996123456');
 assert.equal(formatPhone('555123456'),'+996 555 123 456');
});
test('Торговую точку нельзя менять, переход Уволен → Заблокирован запрещён',()=>{
 assert.ok(validateExpeditor({...first,shop:'Другая точка'},initialExpeditors,first).shop);
 assert.deepEqual(allowedExpeditorStatuses('Уволен'),['Уволен','Активен']);
 assert.ok(validateExpeditor({...first,status:'Заблокирован'},initialExpeditors,{...first,status:'Уволен'}).status);
});
test('Увольнение требует подтверждения долга; повторный приём сохраняет дату увольнения и историю',()=>{
 const at='2026-11-17T10:00:00+06:00',before=JSON.stringify(rows);
 assert.throws(()=>saveExpeditor(initialExpeditors,{...first,status:'Уволен'},rows));
 const fired=saveExpeditor(initialExpeditors,{...first,status:'Уволен'},rows,{confirmedDebt:true,timestamp:at});
 assert.equal(fired.firedAt,at);assert.equal(expeditorAmounts(fired,rows,rows).debt,45000);
 const active=saveExpeditor([fired],{...fired,status:'Активен'},rows,{timestamp:'2026-11-18T10:00:00+06:00'});
 assert.equal(active.firedAt,at);assert.equal(active.createdAt,first.createdAt);
 assert.equal(active.history.length,first.history.length+2);
 assert.equal(JSON.stringify(rows),before);
});
test('Суммы за весь период учитывают передачу и кассу без дублирования, переименование не теряет накладные',()=>{
 assert.equal(expeditorAmounts(first,rows,rows).supplies,1240000);
 const paid=rows.map(r=>r[0]===10427?acceptInvoiceCash(r,15000):r);
 assert.equal(expeditorAmounts(first,paid,rows).cash,30000);
 assert.equal(expeditorAmounts(first,paid,rows).debt,30000);
 const moved=rows.map(r=>r[0]===10428?Object.assign([...r],{4:expeditorName(first)}):r);
 assert.equal(expeditorAmounts(first,moved,rows).supplies,1252443);
 const renamed=saveExpeditor(initialExpeditors,{...first,lastName:'АсановНовый'},rows);
 assert.equal(expeditorAmounts(renamed,rows,rows).cash,45000);
});
test('Удаление только без операций, созданного экспедитора с назначенной накладной удалить нельзя',()=>{
 const added=saveExpeditor(initialExpeditors,draft(),[]);
 assert.equal(deleteExpeditor([added],added.id,[]).length,0);
 assert.throws(()=>deleteExpeditor(initialExpeditors,first.id,rows));
 const assigned=rows.map(r=>r[0]===10428?Object.assign([...r],{4:expeditorName(added)}):r);
 assert.throws(()=>deleteExpeditor([added],added.id,assigned));
 assert.throws(()=>deleteExpeditor([{...added,hasOperations:true}],added.id,[]));
});
test('Заблокированный получатель исключается из замены, долг остаётся у прежнего экспедитора',()=>{
 const blocked=initialExpeditors.map(e=>e.id===first.id?{...e,status:'Заблокирован'}:e);
 const names=activeExpeditorNames(blocked);
 assert.ok(!names.includes(expeditorName(first)));
 assert.throws(()=>validateTransfer(rows,{ids:[10428],newDriver:expeditorName(first),reason:'Болезнь экспедитора'},names));
 assert.equal(expeditorAmounts(blocked[0],rows,rows).debt,45000);
});
test('Лимит демонстрации доступа: три за 15 минут, срок разблокировки идёт от первой попытки',()=>{
 const now=Date.parse('2026-11-17T10:00:00+06:00');
 let e=prepareDemoAccess(first,now);e=prepareDemoAccess(e,now+1000);e=prepareDemoAccess(e,now+2000);
 assert.equal(accessCooldown(e,now+2000),898);
 assert.throws(()=>prepareDemoAccess(e,now+3000));
 assert.equal(accessCooldown(e,now+15*60*1000),0);
 assert.equal(e.accessDemo,true);assert.equal(first.accessRequests.length,0);assert.equal(e.history.length,first.history.length+3);
});
