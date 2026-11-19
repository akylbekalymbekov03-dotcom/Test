import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCompany,initialEmployees,companyErrors,saveCompany,assignEmployeeRole,canEditEmployee,roleAccess,profileHash,notificationKey,formatProfilePhone} from './profile-model.js';
import {readCabinetLocation} from './product-navigation.js';
test('Профиль: ИНН 14 цифр, телефон 9, почта с @; ошибочные реквизиты не сохраняются',()=>{
 assert.deepEqual(companyErrors(initialCompany),{});
 const draft={...initialCompany,inn:'1234567890',phone:'55512',email:'company.kg'};
 assert.deepEqual(Object.keys(companyErrors(draft)),['inn','phone','email']);
 assert.throws(()=>saveCompany(initialCompany,draft,'СЕО'));
 const next=saveCompany(initialCompany,{...initialCompany,name:'Подмена имени',inn:'00000000000001',phone:'700123456',email:'office@test.kg',address:'  Новый адрес  '},'СЕО');
 assert.equal(next.name,initialCompany.name);assert.equal(next.inn,'00000000000001');assert.equal(next.address,'Новый адрес');
 assert.equal(initialCompany.phone,'555123456');
});
test('Профиль: компанию меняет СЕО/доверенное, сотрудник не меняет её даже прямым вызовом',()=>{
 for(const role of ['СЕО','Доверенное лицо'])assert.doesNotThrow(()=>saveCompany(initialCompany,initialCompany,role));
 for(const role of ['Оператор','Бухгалтер','Кассир','Админ',''])assert.throws(()=>saveCompany(initialCompany,initialCompany,role));
});
test('Профиль: СЕО нельзя назначить или изменить; доверенное лицо назначает только СЕО',()=>{
 const ceo=initialEmployees[0],trusted=initialEmployees[1];
 assert.equal(canEditEmployee('СЕО',ceo),false);
 for(const role of ['СЕО','Доверенное лицо'])assert.throws(()=>assignEmployeeRole(initialEmployees,'ceo','Оператор',role));
 assert.throws(()=>assignEmployeeRole(initialEmployees,'unassigned','СЕО','СЕО'));
 assert.throws(()=>assignEmployeeRole(initialEmployees,'unassigned','Доверенное лицо','Доверенное лицо'));
 assert.equal(canEditEmployee('Доверенное лицо',trusted),false);
 assert.throws(()=>assignEmployeeRole(initialEmployees,'trusted','Оператор','Доверенное лицо'));
 assert.equal(assignEmployeeRole(initialEmployees,'unassigned','Доверенное лицо','СЕО').find(e=>e.id==='unassigned').role,'Доверенное лицо');
});
test('Профиль: роль сотрудника обновляется отдельно от данных МБизнеса, прав администратора себе не выдать',()=>{
 const updated=assignEmployeeRole(initialEmployees,'unassigned','Кассир','Доверенное лицо');
 assert.equal(updated.find(e=>e.id==='unassigned').role,'Кассир');
 assert.equal(initialEmployees.find(e=>e.id==='unassigned').role,'');
 assert.deepEqual(updated.find(e=>e.id==='cashier'),initialEmployees.find(e=>e.id==='cashier'));
 for(const role of ['Оператор','Бухгалтер','Кассир','Админ'])assert.throws(()=>assignEmployeeRole(initialEmployees,'operator','Кассир',role));
 assert.throws(()=>assignEmployeeRole(initialEmployees,'missing','Оператор','СЕО'));
 assert.throws(()=>assignEmployeeRole(initialEmployees,'operator','Админ','СЕО'));
 assert.equal(updated.filter(e=>e.role==='СЕО').length,1);
});
test('Профиль: карта бухгалтера из макета, уведомления независимы, URL восстанавливает форму и сотрудника',()=>{
 assert.equal(roleAccess('Бухгалтер').find(([name])=>name==='Расходы')[1],'Возмещение');
 assert.equal(roleAccess('Оператор').find(([name])=>name==='Расходы')[1],'Уточняется');
 assert.notEqual(notificationKey('ceo'),notificationKey('operator'));
 assert.equal(formatProfilePhone('555123456'),'+996 555 123 456');
 for(const route of [{mode:'view'},{mode:'edit'},{mode:'employee',id:'accountant'}])assert.deepEqual(readCabinetLocation(profileHash(route)),{section:'Профиль дистрибьютора',route});
});

test('Сотрудник: роль и статус сохраняются атомарно с прежними ограничениями доступа',async()=>{
 const {updateEmployee}=await import('./profile-model.js');
 const updated=updateEmployee(initialEmployees,'operator',{role:'Бухгалтер',status:'Заблокирован'},'СЕО');
 assert.equal(updated.find(e=>e.id==='operator').role,'Бухгалтер');assert.equal(updated.find(e=>e.id==='operator').status,'Заблокирован');
 assert.equal(initialEmployees.find(e=>e.id==='operator').status,'Активен');
 const unassigned=updateEmployee(initialEmployees,'unassigned',{role:'',status:'Заблокирован'},'Доверенное лицо');assert.equal(unassigned.find(e=>e.id==='unassigned').role,'');
 assert.throws(()=>updateEmployee(initialEmployees,'operator',{role:'Админ',status:'Заблокирован'},'СЕО'));
 assert.throws(()=>updateEmployee(initialEmployees,'operator',{role:'Оператор',status:'Неизвестный'},'СЕО'));
 for(const actor of ['Оператор','Кассир','Бухгалтер','Админ'])assert.throws(()=>updateEmployee(initialEmployees,'operator',{role:'Оператор',status:'Уволен'},actor));
 assert.throws(()=>updateEmployee(initialEmployees,'ceo',{role:'СЕО',status:'Заблокирован'},'СЕО'));
 assert.throws(()=>updateEmployee(initialEmployees,'trusted',{role:'Доверенное лицо',status:'Уволен'},'Доверенное лицо'));
});
