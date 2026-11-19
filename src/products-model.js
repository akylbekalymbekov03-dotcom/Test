import {normalizeSearch} from './list-utils.js';
// Данные списка и первого товара — Figma 73:9628 / 296:38141.
const names=['Айран «Талас» 1 л','Молоко 2,5% 1 л','Сок яблочный 1 л','Вода питьевая 1,5 л','Кефир 1 л','Йогурт клубничный 250 г','Масло сливочное 180 г','Чай чёрный 100 г'];
const units=['Штука','Литр','Литр','Литр','Литр','Штука','Килограмм','Грамм'];
export const initialProducts=names.map((name,i)=>({id:'product-'+(i+1),name,unit:units[i],tnved:i===0?'2202991900':'',price:[145,98.5,160,35,112,42,280,95][i],ettn:'ETTN-'+String(i+1).padStart(4,'0'),status:i<6?'Активен':'Деактивирован',marked:false,barcodes:[{value:String(4860001012345+i),primary:true,active:true}],inUse:i===0?true:null,history:[]}));
// TODO: заменить демонстрационный срез полными справочниками API.
// Коды единиц: https://stat.gov.kg/ru/osnovnye-pravila-interpretacii-tn-ved/
// Для Рулона код в доступных данных отсутствует; не выдумываем.
export const productUnits=[{name:'Грамм',code:'163'},{name:'Килограмм',code:'166'},{name:'Метр',code:'006'},{name:'Квадратный метр',code:'055'},{name:'Рулон',code:''},{name:'Штука',code:'796'},{name:'Литр',code:'112'}];
// Код для демо взят из макета, не является актуальным полным классификатором.
// Наименование группы подтверждено пояснениями ЕЭК:
// https://eec.eaeunion.org/upload/files/catr/psn/tom_vi/гр%2022.pdf
export const productCodes=[{code:'2202991900',name:'Прочие безалкогольные напитки'}];
export const productColumns=['Наименование','Ед. измерения','Штрихкод / Артикул','ID товара ИС ЭТТН','Цена','Статус'];
export const mainBarcode=p=>p.barcodes.find(b=>b.primary&&b.active!==false)?.value||'';
export const productValues=p=>[p.name,p.unit,mainBarcode(p),p.ettn,p.price,p.status];
export const matchesProduct=(p,query)=>normalizeSearch(productValues(p).join(' ')+' '+p.price.toFixed(2).replace('.',',')).includes(normalizeSearch(query));
export const canDeleteProduct=p=>p.inUse===false;
export const deleteProductHint=p=>p.inUse===true?'Товар уже использовался. Можно только деактивировать.':'Нет данных об использовании товара. Удаление недоступно.';
export function findBarcode(value,products,ownId,foreignProducts=[]){
 const own=products.find(p=>p.id!==ownId&&p.barcodes.some(b=>b.active!==false&&b.value===value));
 if(own)return {blocked:true,name:own.name};
 const foreign=foreignProducts.find(p=>p.barcodes.some(b=>b.active!==false&&b.value===value));
 return foreign?{blocked:false,name:foreign.name}:null;
}
export function addProductBarcode(product,value,products,foreignProducts=[]){
 const code=String(value).trim();
 if(!code)throw new Error('Введите штрихкод или артикул.');
 if(product.barcodes.some(b=>b.active!==false&&b.value===code))throw new Error('Этот штрихкод уже добавлен к товару.');
 const match=findBarcode(code,products,product.id,foreignProducts);
 if(match?.blocked)throw new Error('Штрихкод уже есть у товара «'+match.name+'». Укажите другой.');
 return {...product,barcodes:[...product.barcodes,{value:code,primary:!product.barcodes.some(b=>b.active!==false),active:true}]};
}
export function removeProductBarcode(product,value){
 const barcode=product.barcodes.find(b=>b.value===value);
 if(barcode?.primary)throw new Error('Основной штрихкод удалить нельзя.');
 return {...product,barcodes:product.barcodes.filter(b=>b.value!==value)};
}
export function validateProduct(p,products,catalog){
 const units=catalog?.productUnits||productUnits,codes=catalog?.productCodes||productCodes;
 const errors={};
 if(!p.name.trim())errors.name='Введите наименование.';
 if(!units.some(u=>u.name===p.unit))errors.unit='Выберите единицу из списка.';
 if(!codes.some(c=>c.code===p.tnved))errors.tnved='Выберите код из классификатора.';
 if(p.price===''||!Number.isFinite(Number(p.price))||Number(p.price)<0||Math.round(Number(p.price)*100)/100!==Number(p.price))errors.price='Укажите цену от 0 с точностью до тыйына.';
 if(!['Активен','Деактивирован'].includes(p.status))errors.status='Выберите статус.';
 const active=p.barcodes.filter(b=>b.active!==false);
 if(active.length&&active.filter(b=>b.primary).length!==1)errors.barcodes='У товара должен быть один основной штрихкод.';
 const seen=new Set();
 for(const b of active){if(!b.value.trim()||seen.has(b.value)||findBarcode(b.value,products,p.id)?.blocked)errors.barcodes='Проверьте штрихкоды: значение уже используется.';seen.add(b.value)}
 return errors;
}
export function saveProduct(products,draft,timestamp=new Date().toISOString(),catalog){
 const errors=validateProduct(draft,products,catalog);
 if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
 const previous=products.find(p=>p.id===draft.id),id=previous?.id||draft.id;
 const next={...draft,id,name:draft.name.trim(),ettn:draft.ettn.trim(),price:Number(draft.price),inUse:previous?previous.inUse:false};
 const labels={name:'Наименование',unit:'Ед. измерения',tnved:'Код ТН ВЭД',price:'Цена',ettn:'ID товара ИС ЭТТН',marked:'Маркированный',status:'Статус',barcodes:'Штрихкоды'};
 const display=(key,value)=>key==='barcodes'?value.filter(b=>b.active!==false).map(b=>b.value).join(', ')||'—':typeof value==='boolean'?value?'Да':'Нет':String(value??'')||'—';
 const changes=previous?Object.keys(labels).filter(key=>JSON.stringify(previous[key])!==JSON.stringify(next[key])).map(key=>({field:labels[key],from:display(key,previous[key]),to:display(key,next[key])})):[];
 const history=previous?.history||[];
 next.history=!previous?[{event:'Товар создан',timestamp,author:'Асанова Айгерим',changes:[]},...history]:changes.length?[{event:'Товар изменён',timestamp,author:'Асанова Айгерим',changes},...history]:history;
 return next;
}
export function deleteProduct(products,id){
 const p=products.find(p=>p.id===id);
 if(!p||!canDeleteProduct(p))throw new Error(p?deleteProductHint(p):'Товар не найден.');
 return products.filter(p=>p.id!==id);
}
// TODO: уточнить формат Excel и политику повторного импорта.
// Демо: атомарное добавление; совпадающие внутри дистрибьютора штрихкоды отклоняются.
export function parseProductTable(table,existing,catalog){
 if(table.length<2)throw new Error('В файле нет товаров. Выберите файл с заполненными строками.');
 const headers=table[0].map(v=>String(v??'').trim()),index=name=>headers.indexOf(name);
 for(const name of ['Наименование','Ед. измерения','Цена','Код ТН ВЭД'])if(index(name)<0)throw new Error('Не найдена колонка «'+name+'». Проверьте файл.');
 const result=[];
 for(const [offset,row]of table.slice(1).entries()){
  if(row.every(v=>v==null||v===''))continue;
  const get=name=>index(name)<0?'':row[index(name)]??'',text=name=>String(get(name)).trim();
  const unitValue=text('Ед. измерения');
  const unit=(catalog?.productUnits||productUnits).find(u=>u.name.toLowerCase()===unitValue.toLowerCase()||(u.code&&Number(u.code)===Number(unitValue)))?.name||unitValue;
  const rawPrice=get('Цена');
  const price=typeof rawPrice==='number'?rawPrice:rawPrice===''?'':Number(String(rawPrice).replace(/\s/g,'').replace(/с$/,'').replace(',','.'));
  const barcode=text('Штрихкод / Артикул');
  const p={id:'import-'+crypto.randomUUID(),name:text('Наименование'),unit,tnved:text('Код ТН ВЭД'),price,ettn:text('ID товара ИС ЭТТН'),status:text('Статус')||'Активен',marked:['да','true','1'].includes(text('Маркированный').toLowerCase()),barcodes:barcode?[{value:barcode,primary:true,active:true}]:[],history:[],inUse:false};
  try{result.push(saveProduct([...existing,...result],p,undefined,catalog))}catch(error){throw new Error('Строка '+(offset+2)+': '+error.message)}
 }
 if(!result.length)throw new Error('В файле нет товаров.');
 return result;
}
