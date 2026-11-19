import test from 'node:test';
import assert from 'node:assert/strict';
import {readCabinetLocation,productHash,expeditorHash} from './product-navigation.js';
test('Прямые ссылки поставок восстанавливают ID, список и старые числовые ссылки',()=>{
 assert.equal(readCabinetLocation('#deliveries/10428').invoiceId,'10428');
 assert.equal(readCabinetLocation('#10428').invoiceId,'10428');
 assert.equal(readCabinetLocation('#deliveries').invoiceId,null);
 assert.equal(readCabinetLocation('#deliveries/%broken').invoiceId,null);
});
test('Маршруты товаров не становятся поставкой, ID с пробелом корректно кодируется и восстанавливается',()=>{
 for(const mode of ['list','create','view','edit']){
   const route={mode,...(['view','edit'].includes(mode)?{id:'товар 01'}:{})},parsed=readCabinetLocation(productHash(route));
   assert.equal(parsed.section,'Товары');assert.deepEqual(parsed.route,route);
 }
 assert.deepEqual(readCabinetLocation('#products/%broken').route,{mode:'list'});
});

test('Маршруты экспедиторов восстанавливают список, создание, карточку и редактирование',()=>{
 for(const mode of ['list','create','view','edit']){
  const route={mode,...(['view','edit'].includes(mode)?{id:'exp 4831'}:{})};
  assert.deepEqual(readCabinetLocation(expeditorHash(route)),{section:'Экспедиторы',route});
 }
 assert.deepEqual(readCabinetLocation('#expeditors/%broken'),{section:'Экспедиторы',route:{mode:'list'}});
});

test('Сводка открывается по прямой ссылке',()=>{
 assert.deepEqual(readCabinetLocation('#summary'),{section:'Сводка',route:{mode:'list'}});
});

test('Стартовый экран после входа — сводка',()=>{
 for(const hash of ['', '#', '#/'])assert.deepEqual(readCabinetLocation(hash),{section:'Сводка',route:{mode:'list'}});
});
