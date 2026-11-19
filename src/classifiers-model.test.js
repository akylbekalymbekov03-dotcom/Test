import test from 'node:test';
import assert from 'node:assert/strict';
import {initialClassifiers,canManageClassifiers,saveClassifierRow,deleteClassifierRow,replaceClassifier,parseClassifierData,classifierChanged,productCatalog,saveMarket,marketPoints,reconcileMarketExpenses,classifierHash} from './classifiers-model.js';
import {initialExpenses} from './expenses-model.js';
import {initialExpeditors} from './expeditors-model.js';
import {readCabinetLocation} from './product-navigation.js';
const fresh=()=>structuredClone(initialClassifiers),options={role:'Админ',timestamp:'2026-11-17T10:00:00Z'};
test('Классификаторы: только админ веба, запрет изменения/загрузки/удаления для остальных',()=>{
 assert.ok(canManageClassifiers('Админ'));assert.equal(canManageClassifiers('СЕО'),false);assert.equal(canManageClassifiers('Админ',true),false);
 assert.throws(()=>saveClassifierRow(fresh(),'expenseTypes',{name:'Новый'},null,{role:'СЕО'}));
 assert.throws(()=>replaceClassifier(fresh(),'units',initialClassifiers.units,'units.json',{role:'Админ',mobile:true}));
 assert.throws(()=>deleteClassifierRow(fresh(),'tnved','0401201100',{role:'СЕО'}));
});
test('Классификаторы: код новой ручной статьи системный, дубль запрещён, редактирование и удаление в журнале',()=>{
 const c=saveClassifierRow(fresh(),'expenseTypes',{name:'Аренда машины'},null,options),entry=c.expenseTypes.at(-1);
 assert.equal(entry.code,'000000009');assert.equal(c.history[0].author,'Асанова Айгерим');
 assert.throws(()=>saveClassifierRow(c,'expenseTypes',{name:'Аренда машины'},null,options));
 const edit=saveClassifierRow(c,'expenseTypes',{...entry,name:'Аренда транспорта'},entry.code,options);assert.equal(edit.expenseTypes.at(-1).name,'Аренда транспорта');
 const deleted=deleteClassifierRow(edit,'expenseTypes',entry.code,options);assert.equal(deleted.expenseTypes.length,8);assert.equal(deleted.history.length,3);
 assert.throws(()=>deleteClassifierRow(fresh(),'currencies','417',options));
});
test('Классификаторы: JSON/таблица сохраняют ведущие нули, проверяют 10 цифр и атомарно запрещают дубли',()=>{
 const parsed=parseClassifierData([['Код ТН ВЭД','Наименование','Статус'],['0401201100','Тест','Активен']],'tnved');assert.equal(parsed[0].code,'0401201100');
 assert.equal(parseClassifierData([{code:'006',name:'м',fullName:'Метр',international:'MTR'}],'units')[0].code,'006');
 assert.throws(()=>replaceClassifier(fresh(),'tnved',[{...parsed[0],code:'123'}],'bad.json',options));
 assert.throws(()=>replaceClassifier(fresh(),'tnved',[parsed[0],parsed[0]],'bad.json',options));
 assert.equal(initialClassifiers.tnved.length,11);assert.throws(()=>replaceClassifier(fresh(),'tnved',[],'empty.json',options));
});
test('Классификаторы: загрузка заменяет всё, изменённые/удалённые/неактивные ссылки отмечаются, новый код активен в товарах',()=>{
 const c=fresh(),old=c.tnved[0],rows=[{...old,name:'Новое имя'}, {...c.tnved[1],status:'Деактивирован'}];
 const next=replaceClassifier(c,'tnved',rows,'new.json',options);
 assert.equal(next.tnved.length,2);assert.equal(next.uploads.tnved.filename,'new.json');assert.equal(next.history[0].event,'Классификатор загружен');
 for(const code of [old.code,c.tnved[1].code,'2202991900'])assert.ok(classifierChanged(next,'tnved',code));
 assert.equal(productCatalog(next).productCodes.length,1);assert.equal(c.tnved.length,11);
 const unit=saveClassifierRow(c,'units',{...c.units[0],name:'шт.'},'796',options);assert.ok(classifierChanged(unit,'units','Штука'));
});
const invoice=(id,date='13.11.2026',party='ОсОО «Ля Мезон»',address='ул. Киевская, 17')=>[id,date,party,address,'Смирнов Сергей','10245','Наличные',12443,0,0,'Ожидает оплаты','',12443,0,''];
test('Рынки: процент начисляется по накладной и не создаётся повторно после подтверждения расхода',()=>{
 const rows=[invoice(10428)],point=marketPoints(rows,initialExpenses)[0],c=saveMarket(fresh(),{name:'Тест',type:'Тачкисты',mode:'percent',rate:10,pointIds:[point.id],status:'Активен'},{...options,id:'test'});
 const next=reconcileMarketExpenses(initialExpenses,rows,c,initialExpeditors,options),auto=next[0];assert.equal(auto.amount,1244.3);assert.equal(auto.invoiceId,10428);assert.equal(auto.marketName,'Тест');assert.equal(auto.district,'Октябрьский');assert.equal(auto.driverId,'exp-4830');assert.equal(auto.history[0].author,'Система');
 const reviewed=next.map(e=>e.id===auto.id?{...e,status:'Подтвержден'}:e);assert.equal(reconcileMarketExpenses(reviewed,rows,c,initialExpeditors),reviewed);
});
test('Рынки: фиксированная ставка один раз на точку за день, разные точки и дни независимы',()=>{
 const rows=[invoice(10428),invoice(10429),invoice(10430,'14.11.2026'),invoice(10431,'13.11.2026','ОсОО «Береке»','пр. Чуй, 118')],points=marketPoints(rows,initialExpenses);
 const c=saveMarket(fresh(),{name:'Парковка тест',type:'Парковка',mode:'day',rate:100,pointIds:points.map(p=>p.id),status:'Активен'},{...options,id:'day'});
 const next=reconcileMarketExpenses(initialExpenses,rows,c,initialExpeditors,options);assert.equal(next.length-initialExpenses.length,3);assert.equal(next.filter(e=>e.marketName==='Парковка тест').reduce((s,e)=>s+e.amount,0),300);
 const inactive={...c,markets:c.markets.map(m=>({...m,status:'Деактивирован'}))};assert.equal(reconcileMarketExpenses(initialExpenses,rows,inactive,initialExpeditors),initialExpenses);
});
test('Рынки: некорректные ставки/тип/пустые точки запрещены, неизвестные районы и отменённые накладные не создают расход',()=>{
 const draft={name:'Тест',type:'Бензин',mode:'percent',rate:10,pointIds:['point'],status:'Активен'};
 for(const patch of [{rate:0},{rate:101},{type:'нет'},{pointIds:[]}])assert.throws(()=>saveMarket(fresh(),{...draft,...patch},options));
 const row=invoice(10428),point=marketPoints([row],initialExpenses)[0],c=saveMarket(fresh(),{...draft,pointIds:[point.id]},options);
 const canceled=[...row];canceled[10]='Отменен';assert.equal(reconcileMarketExpenses(initialExpenses,[canceled],c,initialExpeditors),initialExpenses);
 for(const tab of ['tnved','units','currencies','violations','expenseTypes','transferReasons','markets'])assert.deepEqual(readCabinetLocation(classifierHash({tab})),{section:'Классификаторы',route:{mode:'list',tab}});
});
