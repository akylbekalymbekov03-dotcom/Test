import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transferCandidates,validateTransfer} from './transfer-invoices.js';
const rows=JSON.parse(readFileSync(new URL('../public/data/invoices.json',import.meta.url)));
const request={ids:[10428,10425],fromDriver:'Смирнов Сергей',newDriver:'Асанов Азамат',reason:'Болезнь экспедитора'};
test('Список передачи содержит только сегодняшние неоплаченные накладные выбранного экспедитора',()=>{
  assert.deepEqual(transferCandidates(rows,'Смирнов Сергей','13.11.2026').map(r=>r[0]),[10428,10425,10419]);
  assert.deepEqual(transferCandidates(rows,'Асанов Азамат','13.11.2026'),[]);
});
test('Передаются только явно выбранные накладные, исходные данные и прошлые долги не меняются',()=>{
  const before=JSON.stringify(rows);
  assert.deepEqual(validateTransfer(rows,request,undefined,undefined,'13.11.2026').map(r=>r[0]),[10428,10425]);
  assert.equal(JSON.stringify(rows),before);
});
test('Нельзя передать старые, оплаченные, чужие или повторные накладные, выбрать себя или пропустить причину',()=>{
  for(const patch of [{ids:[]},{ids:[10428,10428]},{ids:[10427]},{ids:[10426]},{ids:[10421]},{ids:[99999]},{fromDriver:'Асанов Азамат'},{newDriver:'Смирнов Сергей'},{newDriver:'Неактивный'},{reason:''}]){
    assert.throws(()=>validateTransfer(rows,{...request,...patch},undefined,undefined,'13.11.2026'));
  }
});
