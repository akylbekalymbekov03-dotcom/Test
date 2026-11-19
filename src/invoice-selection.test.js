import test from 'node:test';
import assert from 'node:assert/strict';
import {canSelectInvoice,invoiceSelectionActions} from './invoice-selection.js';
const row=(id,status,date,cash,driver='Сергей')=>[id,date,'','',driver,0,'',100,0,0,status,'',0,cash];
const today='18.11.2026';
test('Несданные наличные можно выбрать независимо от даты, но нельзя передать другому экспедитору',()=>{
 for(const date of [today,'13.11.2026','05.11.2026']){
 const r=row(1,'Долг',date,100);assert.equal(canSelectInvoice(r,today),true);assert.deepEqual(invoiceSelectionActions([r],[1],today),{transfer:false,cash:true});
 }
});
test('Ожидание выбирается за любую дату; передача доступна только сегодня',()=>{
 for(const date of [today,'16.11.2026','13.11.2026']){const r=row(1,'Ожидает оплаты',date,0);assert.equal(canSelectInvoice(r),true);assert.equal(invoiceSelectionActions([r],[1],today).transfer,date===today)}
 for(const r of [row(3,'Долг',today,0),row(4,'Оплачен',today,0),row(5,'Возврат',today,100),row(6,'Отменен',today,100)])assert.equal(canSelectInvoice(r,today),false);
});
test('Кнопка кассы работает для выбранных наличных разных экспедиторов; смешанный выбор запрещён',()=>{
 const rows=[row(1,'Ожидает оплаты',today,0),row(2,'Долг','13.11.2026',100),row(3,'Долг',today,100,'Азамат')];
 assert.deepEqual(invoiceSelectionActions(rows,[1],today),{transfer:true,cash:false});
 assert.deepEqual(invoiceSelectionActions(rows,[2,3],today),{transfer:false,cash:true});
 for(const ids of [[1,2],[],[999]])assert.deepEqual(invoiceSelectionActions(rows,ids,today),{transfer:false,cash:false});
});
