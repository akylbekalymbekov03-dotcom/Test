import test from 'node:test';
import assert from 'node:assert/strict';
import {stepsFor,eligibleTutorialSteps,hasSeenSearchTip,sharedSearchTipKey,resetTutorialProgress} from './tutorial-model.js';
test('Новый вход перезапускает все туториалы и сохраняет остальные данные',()=>{
 const prefix='mkassa:tour:v1:01204201610123:ceo:';
 const data=new Map([[prefix+'Сводка:list','done'],[prefix+'Товары:view','done'],[sharedSearchTipKey,'done'],['mkassa:first-steps:01204201610123:ceo','saved'],['other-user:tour','done']]);
 const storage={get length(){return data.size},key:index=>[...data.keys()][index],removeItem:key=>data.delete(key),getItem:key=>data.get(key)||null};
 resetTutorialProgress(storage);
 assert.deepEqual([...data.keys()],['mkassa:first-steps:01204201610123:ceo','other-user:tour']);
 assert.equal(hasSeenSearchTip(storage),false);
});
test('Подсказки: в списке горячих продаж нет приёма наличных, в деталях он привязан к кнопке расчёта',()=>{
 assert.equal(stepsFor('Горячие продажи','list').some(step=>step[1]==='Приём наличных'),false);
 const cash=stepsFor('Горячие продажи','view').find(step=>step[1]==='Приём наличных');
 assert.equal(cash[0],'[data-tour="hot-sale-cash"]');
});
test('Подсказки: отправка доступа только в карточке экспедитора, не у поиска',()=>{
 assert.equal(stepsFor('Экспедиторы','list').some(step=>step[0].includes('expeditor-access')),false);
 assert.equal(stepsFor('Экспедиторы','view').find(step=>step[1]==='Доступ в приложение')[0],'[data-tour="expeditor-access"]');
});
test('Поиск объясняется один раз для всего кабинета, остальные подсказки остаются',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null};
 assert.equal(hasSeenSearchTip(storage),false);
 assert.equal(eligibleTutorialSteps(stepsFor('Товары','list'),true).length,2);
 data.set(sharedSearchTipKey,'done');
 assert.equal(hasSeenSearchTip(storage),true);
 for(const section of ['Товары','Экспедиторы','Горячие продажи','Склад'])assert.equal(eligibleTutorialSteps(stepsFor(section,'list'),false).some(step=>step[3]==='search'),false);
 assert.equal(eligibleTutorialSteps(stepsFor('Товары','list'),false)[0][1],'Действия с товаром');
 data.clear();data.set('mkassa:tour:v1:01204201610123:ceo:Товары:list','done');
 assert.equal(hasSeenSearchTip(storage),false);
});
test('Общие подсказки поиска, фильтров и периода не повторяются в других разделах',()=>{
 for(const section of ['Сводка','Поставки','Контрагент','Расходы','Горячие продажи','Склад','Экспедиторы','Товары']){
  const remaining=eligibleTutorialSteps(stepsFor(section,'list'),false,false);
  assert.equal(remaining.some(step=>['search','period'].includes(step[3])),false,section);
  assert.equal(remaining.some(step=>step[1]==='Выберите статус'),false,section);
  assert.ok(remaining.length>0,section);
 }
});
