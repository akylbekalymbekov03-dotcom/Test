export const initialCompany={name:'ОсОО «Ала-Тоо Трейд»',inn:'01204201610123',phone:'555123456',email:'info@alatoo-trade.kg',address:'ул. Киевская, 17'};
export const initialEmployees=[
 ['ceo','Асанова Айгерим','21203199001234','СЕО','a.asanova@alatoo-trade.kg','Активен'],
 ['trusted','Токтогулов Бакыт','20506198500321','Доверенное лицо','b.toktogulov@alatoo-trade.kg','Активен'],
 ['accountant','Иманалиева Жылдыз','11408199200455','Бухгалтер','zh.imanalieva@alatoo-trade.kg','Активен'],
 ['operator','Осмонов Нурлан','20312199500789','Оператор','n.osmonov@alatoo-trade.kg','Активен'],
 ['unassigned','Садыкова Айпери','10101199800112','','a.sadykova@alatoo-trade.kg','Активен'],
 ['cashier','Кадыров Эмиль','20909199000654','Кассир','e.kadyrov@alatoo-trade.kg','Заблокирован'],
 ['dismissed','Ли Виктор','21111198700987','Оператор','v.li@alatoo-trade.kg','Уволен'],
].map(([id,name,inn,role,email,status])=>({id,name,inn,role,email,status}));
export const staffRoles=['Доверенное лицо','Бухгалтер','Оператор','Кассир'];
export const canEditCompany=role=>['СЕО','Доверенное лицо'].includes(role);
export const canEditEmployee=(actorRole,employee)=>Boolean(canEditCompany(actorRole)&&employee&&employee.role!=='СЕО'&&(employee.role!=='Доверенное лицо'||actorRole==='СЕО'));
export function companyErrors(draft){
 const errors={};
 if(!/^\d{14}$/.test(draft.inn))errors.inn='ИНН — 14 цифр, введено '+draft.inn.length;
 if(!/^\d{9}$/.test(draft.phone))errors.phone='После +996 нужно 9 цифр';
 if(!draft.email.includes('@'))errors.email='Не хватает @ — например, info@company.kg';
 return errors;
}
export function saveCompany(current,draft,actorRole){
 if(!canEditCompany(actorRole))throw new Error('Редактировать компанию может СЕО или доверенное лицо.');
 const errors=companyErrors(draft);if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
 // Наименование приходит из МБизнеса. Поля вне формы не перезаписываем.
 return {...current,inn:draft.inn,phone:draft.phone,email:draft.email.trim(),address:draft.address.trim()};
}
export function assignEmployeeRole(employees,id,role,actorRole){
 const employee=employees.find(e=>e.id===id);
 if(!canEditEmployee(actorRole,employee))throw new Error('У вас нет права менять роль этого сотрудника.');
 if(!staffRoles.includes(role))throw new Error('Выберите роль из списка.');
 if(role==='Доверенное лицо'&&actorRole!=='СЕО')throw new Error('Доверенное лицо назначает только СЕО.');
 return employees.map(e=>e.id===id?{...e,role}:e);
}
export const employeeStatuses=['Активен','Заблокирован','Уволен'];
export function updateEmployee(employees,id,{role,status},actorRole){
 const current=employees.find(e=>e.id===id);
 if(!canEditEmployee(actorRole,current))throw new Error('У вас нет права редактировать этого сотрудника.');
 if(!employeeStatuses.includes(status))throw new Error('Выберите статус из списка.');
 const updated=role===current.role?employees:assignEmployeeRole(employees,id,role,actorRole);
 return updated.map(e=>e.id===id?{...e,status}:e);
}
export const profileSections=['Поставки','Горячие продажи','Расходы','Склад','Экспедиторы','Товары','Профиль'];
export function roleAccess(role){
 if(['СЕО','Доверенное лицо'].includes(role))return profileSections.map(name=>[name,'Полный доступ']);
 // Единственная подробная карта в предоставленном макете — Бухгалтер.
 if(role==='Бухгалтер')return profileSections.map((name,i)=>[name,['Просмотр','Просмотр','Возмещение','Нет доступа','Нет доступа','Просмотр','Свои уведомления'][i]]);
 // TODO: уточнить у аналитика матрицу оператора и кассира, docs/05-open-questions.md.
 return profileSections.map(name=>[name,name==='Профиль'?'Свои уведомления':'Уточняется']);
}
export function profileHash(route={mode:'view'}){return route.mode==='edit'?'#profile/edit':route.mode==='employee'?'#profile/employees/'+encodeURIComponent(route.id):'#profile'}
export function notificationKey(id){return 'mkassa:notifications:01204201610123:'+id}
export function formatProfilePhone(phone){return '+996 '+phone.replace(/^(\d{3})(\d{3})(\d{3})$/,'$1 $2 $3')}
