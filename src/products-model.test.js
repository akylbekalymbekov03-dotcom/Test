import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProducts,mainBarcode,findBarcode,addProductBarcode,removeProductBarcode,validateProduct,saveProduct,deleteProduct,matchesProduct,parseProductTable} from './products-model.js';
const make=()=>({id:'new-product',name:'Тестовый товар',unit:'Штука',tnved:'2202991900',price:150,ettn:'',marked:false,status:'Активен',barcodes:[],history:[],inUse:false});
test('Первый штрихкод становится основным, второй не заменяет его, основной удалить нельзя',()=>{
 const first=addProductBarcode(make(),'00123',initialProducts),second=addProductBarcode(first,'00456',initialProducts);
 assert.equal(mainBarcode(second),'00123');assert.equal(second.barcodes.filter(b=>b.primary).length,1);
 assert.throws(()=>removeProductBarcode(second,'00123'));
 assert.equal(removeProductBarcode(second,'00456').barcodes.length,1);
 assert.equal(first.barcodes.length,1);
});
test('Штрихкоды уникальны внутри дистрибьютора; чужие совпадения предупреждают, неактивные не проверяются',()=>{
 const barcode=mainBarcode(initialProducts[0]);
 assert.throws(()=>addProductBarcode(make(),barcode,initialProducts));
 assert.equal(findBarcode(barcode,initialProducts,'new')?.blocked,true);
 assert.equal(findBarcode(barcode,[],null,initialProducts)?.blocked,false);
 assert.doesNotThrow(()=>addProductBarcode(make(),barcode,[],initialProducts));
 const inactive=[{...initialProducts[0],barcodes:[{value:barcode,active:false}]}];
 assert.equal(findBarcode(barcode,inactive,'new'),null);
});
test('Сохранение сохраняет признак оборота и историю, деактивация не даёт удалить использованный товар',()=>{
 const old=initialProducts[0],draft={...old,status:'Деактивирован',inUse:false};
 const saved=saveProduct(initialProducts,draft,'2026-11-17T10:00:00+06:00');
 assert.equal(saved.inUse,true);assert.equal(saved.history[0].changes.find(c=>c.field==='Статус')?.to,'Деактивирован');
 assert.throws(()=>deleteProduct([saved],saved.id));
 assert.equal(saveProduct([saved],saved).history.length,1);
 const created=saveProduct(initialProducts,make());
 assert.equal(created.inUse,false);assert.equal(created.history[0].event,'Товар создан');
 assert.deepEqual(deleteProduct([created],created.id),[]);
});
test('Форма принимает только значения классификаторов и цену с точностью до тыйына',()=>{
 assert.deepEqual(validateProduct(make(),initialProducts),{});
 for(const patch of [{name:' '},{unit:'Любая'},{tnved:'1234567890'},{price:-1},{price:1.001},{price:NaN},{status:'Удалён'}])assert.ok(Object.keys(validateProduct({...make(),...patch},initialProducts)).length);
 assert.deepEqual(validateProduct({...make(),price:0},initialProducts),{});
 assert.ok(matchesProduct(initialProducts[1],'98,50'));
 assert.ok(matchesProduct(initialProducts[0],'4860001012345'));
 assert.ok(matchesProduct(initialProducts[0],'ETTN-0001'));
});
test('Импорт атомарный: дубли и ошибочные строки не меняют справочник, коды штрихкодов сохраняют нули',()=>{
 const columns=['Наименование','Ед. измерения','Штрихкод / Артикул','Цена','Код ТН ВЭД'];
 const row=['Новый товар','796','0000123','12,50','2202991900'];
 const before=JSON.stringify(initialProducts);
 const imported=parseProductTable([columns,row],initialProducts);
 assert.equal(imported[0].unit,'Штука');assert.equal(imported[0].price,12.5);assert.equal(mainBarcode(imported[0]),'0000123');
 assert.throws(()=>parseProductTable([columns,row,row],initialProducts));
 assert.throws(()=>parseProductTable([columns,[...row.slice(0,4),'не код']],initialProducts));
 assert.equal(JSON.stringify(initialProducts),before);
});
