import {normalizeSearch} from './list-utils.js';
import {productUnits,productCodes} from './products-model.js';
export const classifierTabs=[['tnved','ТН ВЭД'],['units','Единицы измерения'],['currencies','Валюты'],['violations','Статьи нарушений'],['expenseTypes','Типы расходов'],['transferReasons','Причины замены'],['markets','Рынки и ставки']];
const codes=['0401201100','0401401000','0403209100','0406105000','2009711000','2202100000','1905310000','1806321000','0901210000','0902300000'];
const names=['Молоко 1–3%','Сливки 6–10%','Кефир, айран','Творог','Сок яблочный','Вода с сахаром','Печенье сладкое','Шоколад с начинкой','Кофе жареный','Чай чёрный'];
const fullNames=['Молоко и сливки, несгущённые, без сахара, жирностью более 1, но не более 3 мас.%','Молоко и сливки, несгущённые, без сахара, жирностью более 6, но не более 10 мас.%','Пахта, свернувшиеся молоко и сливки, кефир и прочие ферментированные продукты','Сыры свежие (невыдержанные), включая творог','Сок яблочный, несброженный, без добавления спирта, плотностью не более 1,33 г/см³','Воды, включая минеральные и газированные, с добавлением сахара или ароматизаторов','Печенье сладкое с добавлением подслащивающих веществ','Шоколад и прочие готовые продукты с какао, в брикетах, с начинкой','Кофе жареный с кофеином, в зёрнах или молотый','Чай чёрный (ферментированный) в упаковках не более 3 кг'];
const numbered=names=>names.map((name,i)=>({code:String(i+1).padStart(9,'0'),name}));
export const violationNames=['Отсутствие аннотации','Недопоставка товара','Нетоварный вид','Несоответствие сроков годности товара','Отсутствие сроков годности','Недолив, течь (брак) при транспортировке','Попытка хищения товара','Несоответствие количества (веса) товара в упаковке (таре)','Нарушения условий перевозки товара (температурный режим)','Пересортица','Недовоз','Отсутствует информация о нанесении кода на товар (ГНС)','Код не найден (ГНС)','Просроченный сертификат соответствия','Несоответствие Штрих-Кода','Товар без сопроводительного документа'];
const units=[['796','шт','Штука','PCE'],['163','г','Грамм','GRM'],['166','кг','Килограмм','KGM'],['112','л','Литр','LTR'],['006','м','Метр','MTR'],['055','м²','Квадратный метр','MTK'],['736','рул','Рулон','RO'],['778','упак','Упаковка','NMP'],['704','набор','Набор','SET'],['113','м³','Кубический метр','MTQ']].map(([code,name,fullName,international])=>({code,name,fullName,international}));
export const initialClassifiers={
 tnved:[...codes.map((code,i)=>({code,name:names[i],fullName:fullNames[i],unit:[0,1,2,4,5].includes(i)?'Литр':'Килограмм',date:i===7?'2024-07-01':'2022-01-01',status:[6,9].includes(i)?'Деактивирован':'Активен'})),...productCodes.map(r=>({...r,fullName:r.name,unit:'',date:'',status:'Активен'}))],units,
 currencies:[{code:'417',name:'Сом',symbol:'СОМ',rate:1,quantity:1}],violations:numbered(violationNames),expenseTypes:numbered(['Бензин','Парковка','Мойка автомобиля','Ремонт автомобиля','Шиномонтаж','Тачкисты','Питание в рейсе','Прочее']),transferReasons:numbered(['Болезнь экспедитора','Отпуск','Поломка автомобиля','Перераспределение маршрута','Увольнение экспедитора','Прочее']),
 markets:[['market-1','Аламединский рынок','Тачкисты','percent',10,12,'Активен'],['market-2','Аламединский рынок','Парковка','day',100,0,'Активен'],['market-3','Орто-Сай','Тачкисты','percent',8,7,'Активен'],['market-4','Ош базар','Тачкисты','percent',10,9,'Активен'],['market-5','Дордой','Тачкисты','percent',12,0,'Деактивирован']].map(([id,name,type,mode,rate,unresolvedPointCount,status])=>({id,name,type,mode,rate,unresolvedPointCount,status,pointIds:[]})),
 changed:{tnved:[],units:[]},history:[],uploads:{tnved:{filename:'tnved_2026.xlsx',date:'2026-11-12'},units:{filename:'units.xlsx',date:'2026-11-05'}},
};
export const canManageClassifiers=(role,mobile=false)=>role==='Админ'&&!mobile;
export const classifierHash=route=>'#classifiers/'+(classifierTabs.some(([id])=>id===route.tab)?route.tab:'tnved');
export const classifierMatches=(row,query)=>normalizeSearch(Object.values(row).filter(v=>!Array.isArray(v)&&typeof v!=='object').join(' ')).includes(normalizeSearch(query));
const labelFor=kind=>classifierTabs.find(([id])=>id===kind)?.[1]||kind;
function requireAdmin(role,mobile){if(!canManageClassifiers(role,mobile))throw new Error('Классификаторы доступны только админу в полной версии кабинета.');}
const record=(catalog,kind,event,description,options)=>({...catalog,history:[{kind,event,description,timestamp:options.timestamp||new Date().toISOString(),author:options.author||'Асанова Айгерим'},...catalog.history]});
const keys=row=>[row.code,row.name,row.fullName].filter(Boolean);
function noteChanges(catalog,kind,before,after){if(!['tnved','units'].includes(kind))return catalog.changed;const altered=before.filter(old=>{const next=after.find(r=>r.code===old.code);return !next||JSON.stringify(old)!==JSON.stringify(next)}).flatMap(keys);return {...catalog.changed,[kind]:[...new Set([...catalog.changed[kind],...altered])]};}
export function classifierChanged(catalog,kind,value){if(!value||!catalog)return false;const row=catalog[kind]?.find(r=>r.code===value||r.name===value||r.fullName===value);return !row||row.status==='Деактивирован'||catalog.changed[kind]?.some(k=>k===value||row&&keys(row).includes(k));}
export function validateClassifierRow(catalog,kind,row,previousCode){
 const error={};
 if(!String(row.name||'').trim())error.name='Введите наименование.';
 if(kind!=='markets'&&!/^\d+$/.test(String(row.code||'')))error.code='Код должен состоять из цифр.';
 if(kind==='tnved'){
  if(!/^\d{10}$/.test(String(row.code||'')))error.code='Код ТН ВЭД должен содержать 10 цифр.';
  if(!['Активен','Деактивирован'].includes(row.status))error.status='Выберите статус.';
  if(row.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date))))error.date='Укажите корректную дату.';
 }
 if(kind==='units'&&!String(row.fullName||'').trim())error.fullName='Введите полное наименование.';
 if(kind!=='markets'&&catalog[kind].some(r=>r.code===row.code&&r.code!==previousCode))error.code='Этот код уже существует.';
 if(catalog[kind].some(r=>normalizeSearch(r.name)===normalizeSearch(row.name)&&r.code!==previousCode&&!['markets','tnved','units'].includes(kind)))error.name='Это наименование уже есть в справочнике.';
 return error;
}
export function saveClassifierRow(catalog,kind,draft,previousCode=null,{role='Админ',mobile=false,...options}={}){
 requireAdmin(role,mobile);if(!['tnved','units','violations','expenseTypes','transferReasons'].includes(kind))throw new Error('Этот справочник доступен только для просмотра.');
 const row={...draft,name:String(draft.name||'').trim(),code:previousCode==null&& !['tnved','units'].includes(kind)?String(Math.max(0,...catalog[kind].map(r=>Number(r.code)))+1).padStart(9,'0'):String(draft.code||'').trim()};
 const errors=validateClassifierRow(catalog,kind,row,previousCode);if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
 const exists=previousCode!=null;if(exists&&!catalog[kind].some(r=>r.code===previousCode))throw new Error('Запись не найдена.');
 const next=exists?catalog[kind].map(r=>r.code===previousCode?row:r):[...catalog[kind],row];
 return record({...catalog,[kind]:next,changed:noteChanges(catalog,kind,catalog[kind],next)},kind,exists?'Запись изменена':'Запись создана',labelFor(kind)+': '+row.code+' · '+row.name,options);
}
export function deleteClassifierRow(catalog,kind,id,{role='Админ',mobile=false,...options}={}){
 requireAdmin(role,mobile);if(kind==='currencies')throw new Error('Валюта СОМ обязательна.');
 const row=catalog[kind]?.find(r=>(r.id||r.code)===id);if(!row)throw new Error('Запись не найдена.');
 const next=catalog[kind].filter(r=>r!==row);return record({...catalog,[kind]:next,changed:noteChanges(catalog,kind,catalog[kind],next)},kind,'Запись удалена',labelFor(kind)+': '+row.name,options);
}
export function replaceClassifier(catalog,kind,rows,filename,{role='Админ',mobile=false,...options}={}){
 requireAdmin(role,mobile);if(!['tnved','units'].includes(kind))throw new Error('Загрузка этого справочника недоступна.');if(!rows.length)throw new Error('В файле нет записей.');
 const candidate={...catalog,[kind]:[]};for(const row of rows){const errors=validateClassifierRow(candidate,kind,row,null);if(Object.keys(errors).length)throw new Error('Код '+(row.code||'—')+': '+Object.values(errors)[0]);candidate[kind].push(row);}
 const timestamp=options.timestamp||new Date().toISOString(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bishkek',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
 return record({...catalog,[kind]:rows,changed:noteChanges(catalog,kind,catalog[kind],rows),uploads:{...catalog.uploads,[kind]:{filename,date}}},kind,'Классификатор загружен',filename+' · записей: '+rows.length,{...options,timestamp});
}
const headerKeys={code:['code','код','кодтнвэд'],name:['name','наименование'],fullName:['fullname','наименованиеполное','полноенаименование'],unit:['unit','едизмерения','единицаизмерения'],date:['date','датаначаладействия'],status:['status','статус'],international:['international','международноенаименование']};
export function parseClassifierData(data,kind){
 const columns=kind==='tnved'?['code','name','fullName','unit','date','status']:['code','name','fullName','international'];
 let rows=Array.isArray(data)?data:data?.items;if(!Array.isArray(rows))throw new Error('В файле должен быть список записей.');
 if(Array.isArray(rows[0])){const headers=rows[0].map(v=>normalizeSearch(String(v??'')).replace(/[.,_]/g,'')),indexes=Object.fromEntries(columns.map(key=>[key,headers.findIndex(h=>headerKeys[key].includes(h))]));if(indexes.code<0||indexes.name<0)throw new Error('В файле нужны колонки «Код» и «Наименование».');rows=rows.slice(1).filter(row=>row.some(v=>v!==null&&v!==undefined&&String(v).trim())).map(row=>Object.fromEntries(columns.map(key=>[key,indexes[key]>=0?row[indexes[key]]:''])));}
 return rows.map((row,i)=>{if(!row||typeof row!=='object')throw new Error('Проверьте строку '+(i+1));const value=Object.fromEntries(columns.map(key=>{const entry=Object.entries(row).find(([name])=>headerKeys[key].includes(normalizeSearch(name).replace(/[.,_]/g,'')));return [key,entry?.[1]??'']}));const result=Object.fromEntries(columns.map(key=>[key,value[key] instanceof Date?value[key].toISOString().slice(0,10):String(value[key]).trim()]));if(kind==='tnved'&&!result.status)result.status='Активен';if(/^\d{2}\.\d{2}\.\d{4}$/.test(result.date||''))result.date=result.date.split('.').reverse().join('-');return result;});
}
export function productCatalog(catalog){return {productCodes:catalog.tnved.filter(r=>r.status==='Активен').map(r=>({code:r.code,name:r.name})),productUnits:catalog.units.map(r=>({code:r.code,name:r.fullName||r.name}))};}
export function pointKey(row){return [row[2],row[3]].join('|');}
export function marketPoints(rows,expenses){return [...new Map(rows.map(row=>{const found=expenses.find(e=>normalizeSearch(e.address)===normalizeSearch(row[3]));return [pointKey(row),{id:pointKey(row),name:row[2],address:row[3],district:found?.district||''}]})).values()];}
export function saveMarket(catalog,draft,{role='Админ',mobile=false,...options}={}){
 requireAdmin(role,mobile);if(!draft.name?.trim())throw new Error('Введите название рынка.');if(!catalog.expenseTypes.some(t=>t.name===draft.type))throw new Error('Выберите тип расхода из справочника.');
 if(!['percent','day'].includes(draft.mode)||!Number.isFinite(Number(draft.rate))||Number(draft.rate)<=0||Math.round(Number(draft.rate)*100)/100!==Number(draft.rate)||draft.mode==='percent'&&Number(draft.rate)>100)throw new Error('Укажите корректную ставку больше нуля.');
 if(!draft.pointIds?.length)throw new Error('Выберите точки рынка.');if(!['Активен','Деактивирован'].includes(draft.status))throw new Error('Выберите статус.');
 const existing=catalog.markets.find(r=>r.id===draft.id),next={...draft,id:existing?.id||'market-'+(options.id||crypto.randomUUID()),name:draft.name.trim(),rate:Number(draft.rate),pointIds:[...new Set(draft.pointIds)],unresolvedPointCount:0};
 return record({...catalog,markets:existing?catalog.markets.map(r=>r.id===next.id?next:r):[...catalog.markets,next]},'markets',existing?'Рынок изменён':'Рынок добавлен',next.name+' · '+next.rate+(next.mode==='percent'?' % от накладной':' с за день'),options);
}
// Уточнение заказчика: фиксированная ставка один раз за день на точку.
// Если точку посетили разные экспедиторы, источник — первая накладная по дате/номеру.
// TODO: подтвердить у аналитика получателя расхода при нескольких экспедиторах в один день.
export function reconcileMarketExpenses(expenses,rows,catalog,drivers,{timestamp=new Date().toISOString()}={}){
 const existing=new Set(expenses.map(e=>e.generationKey).filter(Boolean)),created=[];let number=Math.max(5000,...expenses.map(e=>e.number));
 const points=marketPoints(rows,expenses),invoices=[...rows].sort((a,b)=>a[1].localeCompare(b[1])||Number(a[0])-Number(b[0]));
 for(const rule of catalog.markets.filter(r=>r.status==='Активен'&&catalog.expenseTypes.some(t=>t.name===r.type)))for(const row of invoices){
  const key=pointKey(row),point=points.find(p=>p.id===key);if(!rule.pointIds.includes(key)||!point?.district||['Возврат','Отменен'].includes(row[10]))continue;
  const date=row[1].split('.').reverse().join('-'),generationKey=rule.id+'|'+(rule.mode==='day'?key+'|'+date:String(row[0]));if(existing.has(generationKey))continue;
  const driver=drivers.find(d=>[d.lastName+' '+d.firstName,...(d.aliases||[])].includes(row[4]));if(!driver)continue;
  const amount=Math.round((rule.mode==='percent'?Number(row[7])*rule.rate/100:rule.rate)*100)/100;if(!Number.isFinite(amount)||amount<=0)continue;
  existing.add(generationKey);number++;created.push({id:String(number),number,date,driverId:driver.id,type:rule.type,amount,status:'Ожидает подтверждения',district:point.district,address:point.address,party:point.name,comment:rule.name+' · накладная №'+row[0],approvedBy:null,approvedAt:null,rejectedBy:null,rejectedAt:null,reimbursedBy:null,reimbursedAt:null,reason:'',history:[{event:'Расход создан автоматически',timestamp,author:'Система',amount,description:rule.name+' · накладная №'+row[0]}],generationKey,invoiceId:row[0],marketId:rule.id,marketName:rule.name});
 }
 return created.length?[...created,...expenses]:expenses;
}
