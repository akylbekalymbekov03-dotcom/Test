import {Select} from './Select';
import {resetTutorialProgress} from './tutorial-model.js';
import {invoiceProducts} from './invoice-products.js';
import {updateInvoiceItemChange,itemChangeReasons,invoiceChangedCount} from './invoice-item-changes.js';
import {HistoryStatusText} from './HistoryStatusText';
import {canSelectInvoice,invoiceSelectionActions} from './invoice-selection.js';
import {createDemoInvoices,createDemoExpenses,createDemoHotSales,createDemoMovements} from './demo-period-data.js';
import {SummaryCard} from './SummaryCard';
import {useInterfaceMotion,usePageMotion} from './interface-motion';
import React, {useState, useEffect, useRef, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {onboardingKey,readOnboarding,onboardingProgress,onboardingFinished} from './onboarding-model.js';
import {ProfileMenu} from './ProfileMenu.jsx';
import {initialCompany,initialEmployees,profileHash} from './profile-model.js';
const Dashboard=lazy(()=>import('./Dashboard').then(m=>({default:m.Dashboard})));
const FirstSteps=lazy(()=>import('./FirstSteps').then(m=>({default:m.FirstSteps})));
const Tutorial=lazy(()=>import('./Tutorial').then(m=>({default:m.Tutorial})));
const CounterpartyPage=lazy(()=>import('./Counterparty').then(module=>({default:module.CounterpartyPage})));
const ProfilePage=lazy(()=>import('./Profile').then(module=>({default:module.ProfilePage})));
const ProductsPage=lazy(()=>import('./Products').then(module=>({default:module.ProductsPage})));
const ClassifiersPage=lazy(()=>import('./Classifiers').then(module=>({default:module.ClassifiersPage})));
import {initialClassifiers,classifierHash,marketPoints,reconcileMarketExpenses} from './classifiers-model.js';
const HotSalesPage=lazy(()=>import('./HotSales').then(module=>({default:module.HotSalesPage})));
import {initialHotSales,hotSaleHash} from './hot-sales-model.js';
const ExpensesPage=lazy(()=>import('./Expenses').then(module=>({default:module.ExpensesPage})));
import {initialExpenses,expenseHash} from './expenses-model.js';
const WarehousePage=lazy(()=>import('./Warehouse').then(module=>({default:module.WarehousePage})));
import {WarehouseBreadcrumbs} from './WarehouseBreadcrumbs';
import {initialMovements,warehouseHash,acceptShortageCash,bishkekToday} from './warehouse-model.js';
const ExpeditorsPage=lazy(()=>import('./Expeditors').then(module=>({default:module.ExpeditorsPage})));
import {initialExpeditors,activeExpeditorNames,expeditorName,ownsInvoice,prepareDemoAccess} from './expeditors-model.js';
import {ProductBreadcrumbs} from './ProductBreadcrumbs';
import {useMobile} from './use-mobile.js';
import {readCabinetLocation,productHash,expeditorHash} from './product-navigation.js';
import {initialProducts} from './products-model.js';
import writeXlsxFile from 'write-excel-file/browser';
import {WorkflowDialogs} from './WorkflowDialogs';
import {TransferDialog,SelectedTransferDialog} from './TransferDialog';
import {validateTransfer,invoiceNoun,transferable} from './transfer-invoices.js';
import {InvoiceDetails,CashDialog} from './InvoiceDetails';
import {PaymentTransferDialog} from './PaymentTransfer';
import {canTransferPayment,transferPayment} from './payment-transfer.js';
import {BatchCashDialog} from './BatchCashDialog';
import {planCashSettlement} from './batch-cash.js';
import {ColumnsPopover,RangeCalendar,ListState} from './ListControls';
import {periodRange,invoiceMatchesSearch} from './list-utils.js';
import {invoiceAmounts, normalizeInvoiceRow, sumAmounts, acceptInvoiceCash} from './invoice-amounts.js';

const C={bg:'#f3f2f0',white:'#fff',text:'#0b0b0a',muted:'#42413d',line:'#f7f6f4',field:'#f7f6f4',primary:'#161513'};
// По прямому запросу заказчика нулевая сумма в интерфейсе отображается прочерком.
const money=n=>Math.round(Number(n)*100)===0?'—':new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' с';
const columns=['Номер счёта','Дата','Контрагент','Адрес','Экспедитор','SUB код','Тип оплаты','Сумма к оплате','Внесённая сумма','Переплата','Статус','Комментарий','Долг магазина','Наличные у экспедитора','Утерянные/повреждённые/возвраты'];
const widths=[123,116,190,180,170,110,140,155,160,130,170,260,180,200,280];
const monetary=[7,8,9,12,13];
const statusFilters=['Ожидает оплаты','Долг магазина','Наличные не сданы','Оплачен','Возврат','Отменен'];
const matchesStatus=(r,s)=>s==='Долг магазина'?r[10]==='Долг'&&r[12]>0:s==='Наличные не сданы'?r[13]>0&&r[12]===0:r[10]===s;
// TODO: уточнить у аналитика состав изменений товара. Признак должен приходить от API.
const hasProductChanges=row=>Boolean(row[14]&&row[14]!=='—');

const styles=`
/* Уточнение заказчика: единое левое выравнивание во всех таблицах. */
.invoice-columns [data-badge-tone="neutral"],.invoice-columns [data-badge-tone="returned"],.invoice-columns [data-badge-tone="cancelled"]{background:white!important}
table th,table td,table td input:not([type=checkbox]){text-align:left!important}

.scroll.table-scroll{scrollbar-width:none!important}.scroll.table-scroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
.spinner{display:inline-flex;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

.filter-check{appearance:none;margin:0;border:1px solid #77756f;border-radius:4px;background:white;flex-shrink:0}.filter-check:checked{background:#161513 url('/assets/Check.svg') center/14px 14px no-repeat;border-color:#161513}.filter-select{appearance:none;background:#f7f6f4 url('/assets/ChevronDown.svg') right 8px center/16px 16px no-repeat!important;padding-right:32px!important}.table-scroll{scrollbar-width:none}.table-scroll::-webkit-scrollbar{display:none}.table-scroll th{position:sticky!important;top:0}.table-scroll td .clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:20px;max-height:40px}.table-scroll td .one-line{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.table-range{appearance:none;height:12px;margin:0;display:block;width:100%;background:#f3f2f0;border-radius:8px;cursor:ew-resize}.table-range::-webkit-slider-thumb{appearance:none;width:var(--thumb-width,100px);height:8px;border-radius:8px;background:#55534d}.table-range::-moz-range-thumb{width:var(--thumb-width,100px);height:8px;border:0;border-radius:8px;background:#55534d}

@font-face{font-family:Inter;src:url('/assets/Inter.ttf') format('truetype');font-weight:100 900;font-display:swap}@font-face{font-family:'JetBrains Mono';src:url('/assets/JetBrainsMono.ttf') format('truetype');font-weight:100 800;font-display:swap}
*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:${C.text};background:${C.bg};font-size:14px;-webkit-font-smoothing:antialiased}button,input,select{font:inherit;color:inherit}button{cursor:pointer}button,input,select{transition:background .18s,box-shadow .18s,transform .18s,border-color .18s}button:hover:not(:disabled){background:#eae8e4!important;box-shadow:0 2px 5px #1615130a}button:active:not(:disabled){transform:scale(.975)}button:disabled{opacity:.38;cursor:not-allowed}button:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:2px solid #6b6963;outline-offset:3px}input[type=checkbox]{margin:0;accent-color:${C.primary};width:16px;height:16px;cursor:pointer}input:disabled{cursor:not-allowed}a{color:#343cde}.primary>img[src="/assets/Banknote.svg"]{filter:brightness(0) invert(1)}.primary:hover:not(:disabled){background:#35332e!important;color:white}.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}h1,h2,p{margin:0}h1{font-size:24px;line-height:36px;letter-spacing:-.55px}h2{font-size:20px}label{cursor:pointer}.enter{animation:appear .42s both cubic-bezier(.2,.7,.2,1)}.row{animation:appear .35s both;cursor:pointer}.row:hover td{background:#f8f7f5!important}.row[data-selected=true] td{background:#f0efec!important}.row td{transition:background .16s}button.quick[aria-pressed=true]{background:#161513!important;color:white}.scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:#6b6963 #f3f2f0}.scroll::-webkit-scrollbar{height:12px}.scroll::-webkit-scrollbar-track{background:#f3f2f0;border-radius:8px}.scroll::-webkit-scrollbar-thumb{background:#55534d;border:3px solid #f3f2f0;border-radius:8px}.veil{animation:fade .18s both}.dialog{animation:appear .24s both}.drawer{animation:slide .28s both}.navitem:hover img{transform:translateX(2px)}.navitem img{transition:transform .2s}.toast{animation:toast-drop .3s cubic-bezier(.18,.82,.24,1) both}@keyframes toast-drop{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}.mobile-toggle{display:none!important}@keyframes appear{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes slide{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}@media(max-width:1050px){.page-actions{flex-wrap:wrap;justify-content:flex-end}.summary{grid-template-columns:repeat(3,1fr)!important}.sidebar{width:210px!important}.user-name{display:none!important}.user-button{width:auto!important}}@media(max-width:760px){.app{padding:8px!important;gap:8px!important}.sidebar{display:none!important}.sidebar.open{display:flex!important;position:fixed;z-index:20;inset:8px auto 8px 8px;width:256px!important;box-shadow:0 0 0 100vmax #0006}.mobile-toggle{display:inline-flex!important}.main{padding:16px!important}.topbar{padding:10px 16px!important}.page-heading{flex-wrap:wrap}.page-actions{justify-content:flex-start}.summary{grid-template-columns:repeat(2,1fr)!important}.search{width:100%!important}.filterbar{align-items:flex-start!important}.quickbar{flex-wrap:wrap}.footer{flex-wrap:wrap}.footer-spacer{display:none}.periods{flex-wrap:wrap}.periods>div:first-child{flex-wrap:wrap}.delivery-check,.delivery-web-column{display:none!important}.delivery-number{left:0!important}.detail-grid{grid-template-columns:1fr!important}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
const flex={display:'flex',alignItems:'center',gap:8};
function Icon({name}){return <img src={'/assets/'+name+'.svg'} alt="" style={{display:'block',flexShrink:0}}/>}
function Button({children,icon,primary=false,style,...props}){return <button className={primary?'primary':''} style={{...flex,justifyContent:'center',minHeight:36,border:'1px solid transparent',borderRadius:8,padding:'7px 10px',background:primary?C.primary:C.field,color:primary?'white':C.text,fontWeight:500,whiteSpace:'nowrap',...style}} {...props}>{icon&&<Icon name={icon}/>} {children}</button>}
// Цвета Mode из полной таблицы Figma 231:63512; бизнес-статусы остаются по ТЗ.
const badgeTones={neutral:{background:'#f7f6f4',color:'#0b0b0a'},cancelled:{background:'#f3f2f0',color:'#0b0b0a'},returned:{background:'#bedbff',color:'#162456'},paid:{background:'#d8f999',color:'#032e15'},cash:{background:'#ffd6a7',color:'#441306'},debt:{background:'rgba(231,0,11,0.1)',color:'#e7000b'}};
function Badge({row}){
 const isDebt=row[10]==='Долг';
 const tone=isDebt?(row[12]>0?'debt':'cash'):row[10]==='Оплачен'?'paid':row[10]==='Отменен'?'cancelled':row[10]==='Возврат'?'returned':'neutral';
 const label=isDebt?(row[12]>0?'Долг магазина':'Наличные не сданы'):row[10];
 return <span data-badge-tone={tone} style={{...badgeTones[tone],display:'inline-flex',alignItems:'center',minHeight:20,borderRadius:26,padding:'2px 8px',fontSize:12,fontWeight:500,lineHeight:'16px',whiteSpace:'nowrap'}}>{label}</span>;
}

const modalStack=[];let bodyOverflowBeforeModals='';
function Modal({title,children,onClose,drawer=false,compact=false,busy=false,width,alert=false,closeIcon='X'}){const ref=useRef(),dismissTimer=useRef(null),closeCallback=useRef(onClose);closeCallback.current=onClose;const [closing,setClosing]=useState(false);const dismiss=()=>{if(busy||dismissTimer.current)return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){closeCallback.current();return}setClosing(true);dismissTimer.current=setTimeout(()=>closeCallback.current(),160)};useEffect(()=>()=>clearTimeout(dismissTimer.current),[]);useEffect(()=>{const prev=document.activeElement,token=ref.current;if(!modalStack.length)bodyOverflowBeforeModals=document.body.style.overflow;modalStack.push(token);ref.current?.focus();const handler=e=>{if(modalStack.at(-1)!==token)return;if(e.key==='Escape'&&!busy)dismiss();if(e.key==='Tab'){const list=ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]');const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',handler);document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',handler);const index=modalStack.indexOf(token);if(index>=0)modalStack.splice(index,1);document.body.style.overflow=modalStack.length?'hidden':bodyOverflowBeforeModals;if(prev?.isConnected)prev.focus({preventScroll:true})}},[busy]);return createPortal(<div className={'veil'+(closing?' motion-closing':'')} onClickCapture={e=>{const button=e.target.closest('button');if(button&&!button.disabled&&/^(Отмена|Отменить)$/.test(button.textContent.trim())){e.preventDefault();e.stopPropagation();dismiss()}}} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)dismiss()}} style={{position:'fixed',inset:0,background:drawer?'#0000001a':'#16151355',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',zIndex:40,display:'flex',alignItems:drawer?'stretch':'center',justifyContent:drawer?'flex-end':'center',padding:drawer?0:20}}><section ref={ref} tabIndex={-1} role={alert?'alertdialog':'dialog'} aria-modal="true" aria-label={title} className={drawer?'drawer':'dialog'} style={{background:'white',borderRadius:drawer?0:16,padding:24,width:drawer?384:width||(compact?448:600),position:'relative',display:drawer?'flex':undefined,flexDirection:drawer?'column':undefined,maxWidth:'100%',maxHeight:'100%',overflow:'auto',boxShadow:'0 24px 80px #0002',outline:'none'}}><div style={{...flex,justifyContent:'space-between',marginBottom:24,flexShrink:0}}><h2 style={{fontSize:drawer||compact?18:20,lineHeight:drawer?'28px':undefined}}>{title}</h2>{!alert&&<Button aria-label="Закрыть" disabled={busy} style={drawer||compact?{position:'absolute',top:11,right:11,padding:0,minHeight:16,background:'transparent'}:{}} onClick={dismiss}><Icon name={closeIcon}/></Button>}</div>{children}</section></div>,document.body)}
function App({onLogout}){
 useInterfaceMotion();
 const mobile=useMobile();
 usePageMotion(window.location.hash);
 const [firstImport,setFirstImport]=useState(()=>{try{return Boolean(JSON.parse(localStorage.getItem('mkassa:first-steps:01204201610123:ceo')||'{}').invoices)}catch{return false}}),[productImportRequested,setProductImportRequested]=useState(false),[tutorialRequest,setTutorialRequest]=useState(0);

 const [onboardingSaved,setOnboardingSaved]=useState(readOnboarding);
 const [counterpartyRoute,setCounterpartyRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Контрагент'?readCabinetLocation(window.location.hash).route:{mode:'view'});
 const [company,setCompany]=useState(()=>({...initialCompany})),[employees,setEmployees]=useState(()=>structuredClone(initialEmployees));
 const [profileRoute,setProfileRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Профиль дистрибьютора'?readCabinetLocation(window.location.hash).route:{mode:'view'});
 const [appRole,setAppRole]=useState('СЕО'),[classifiers,setClassifiers]=useState(()=>{const data=structuredClone(initialClassifiers);if(import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='classifiers-empty')data.tnved=[];return data});
 const profileUser=employees.find(e=>e.role===appRole&&e.status==='Активен')||employees.find(e=>e.role===appRole)||employees[0];
 const [classifierRoute,setClassifierRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Классификаторы'?readCabinetLocation(window.location.hash).route:{mode:'list',tab:'tnved'});
 const [expeditors,setExpeditors]=useState(()=>import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='expeditors-empty'?[]:structuredClone(initialExpeditors));
 const [expeditorRoute,setExpeditorRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Экспедиторы'?readCabinetLocation(window.location.hash).route:{mode:'list'});
 const [movements,setMovements]=useState(()=>import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='warehouse-empty'?[]:createDemoMovements(initialMovements,bishkekToday()));
 const [warehouseRoute,setWarehouseRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Склад'?readCabinetLocation(window.location.hash).route:{mode:'list'});
 const [expenses,setExpenses]=useState(()=>import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='expenses-empty'?[]:createDemoExpenses(initialExpenses,bishkekToday()));
 const [expenseRoute,setExpenseRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Расходы'?readCabinetLocation(window.location.hash).route:{mode:'list'});
 const [hotSales,setHotSales]=useState(()=>import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='hot-sales-empty'?[]:createDemoHotSales(initialHotSales,bishkekToday()));
 const [hotSaleRoute,setHotSaleRoute]=useState(()=>readCabinetLocation(window.location.hash).section==='Горячие продажи'?readCabinetLocation(window.location.hash).route:{mode:'list'});
 const invoiceSnapshot=useRef([]);
 const [section,setSection]=useState(()=>readCabinetLocation(window.location.hash).section);
 useEffect(()=>setTutorialRequest(0),[section]);
 const [products,setProducts]=useState(()=>structuredClone(initialProducts)),[productRoute,setProductRoute]=useState(()=>readCabinetLocation(window.location.hash).route);
 const [rawRows,setRows]=useState([]);
 const [invoiceItemChanges,setInvoiceItemChanges]=useState({});
 const [demoInvoiceData,setDemoInvoiceData]=useState({history:[],products:{}});
 const firstSteps=onboardingProgress({drivers:expeditors,products,employees,imported:firstImport},onboardingSaved),onboardingComplete=onboardingFinished(firstSteps);
 useEffect(()=>{const next={...firstSteps,completed:onboardingComplete};setOnboardingSaved(next);try{localStorage.setItem(onboardingKey,JSON.stringify(next));if(onboardingComplete&&!onboardingSaved.completed){localStorage.removeItem('mkassa:tour:v1:01204201610123:ceo:Поставки:list');setTutorialRequest(n=>n+1)}}catch{}},[firstSteps.drivers,firstSteps.products,firstSteps.roles,firstSteps.invoices,firstSteps.passwords]);
 const [loadState,setLoadState]=useState('loading'),[exporting,setExporting]=useState(false);
 const columnsAnchor=useRef(null),calendarAnchor=useRef(null);
 const loadRows=async(retry=false,signal)=>{setLoadState('loading');try{const preview=import.meta.env.DEV?new URLSearchParams(window.location.search).get('preview'):'';if(preview==='list-loading'&&!retry)return;if(preview==='list-error'&&!retry)throw new Error('Preview');const response=await fetch('/data/invoices.json',{signal,cache:'no-store'});if(!response.ok)throw new Error('Load failed');const data=await response.json();if(!Array.isArray(data)||data.some(r=>!Array.isArray(r)||r.length!==15))throw new Error('Invalid snapshot');if(signal?.aborted)return;const demo=createDemoInvoices(data,bishkekToday());setDemoInvoiceData({history:demo.history,products:demo.products});if(!invoiceSnapshot.current.length)invoiceSnapshot.current=demo.rows;setRows(preview==='list-empty'&&!retry?[]:demo.rows);setLoadState('ready')}catch(error){if(error.name!=='AbortError')setLoadState('error')}};
 useEffect(()=>{const controller=new AbortController();loadRows(false,controller.signal);return()=>controller.abort()},[]);
 const rows=rawRows.map(row=>{const next=normalizeInvoiceRow(row),owner=expeditors.find(e=>ownsInvoice(e,row));if(owner)next[4]=expeditorName(owner);return next});
 const saveInvoiceItemChange=(id,index,reason,quantity)=>{
  const row=rows.find(r=>String(r[0])===String(id));
  if(!row)throw new Error('Накладная не найдена.');
  const items=demoInvoiceData.products[id]||invoiceProducts[id];
  const previous=invoiceItemChanges[id]||{},result=updateInvoiceItemChange(row,items,previous,index,reason,quantity);
  setRows(prev=>prev.map(r=>String(r[0])===String(id)?result.row:r));
  setInvoiceItemChanges(prev=>({...prev,[id]:result.changes}));
  setHistory(prev=>[...prev,{id,timestamp:new Date().toISOString(),author:profileUser.name||'Асанова Айгерим',event:itemChangeReasons[reason],amount:Math.abs(result.delta),description:items[index][0]+': '+(previous[index]?.[reason]||0)+' → '+quantity+'. Сумма к оплате: '+money(row[7])+' → '+money(result.row[7])+'.',reason:itemChangeReasons[reason]}]);
  setToast({title:'Изменения сохранены',description:'Товары и суммы накладной обновлены.'});
 };
 const activeDriverNames=activeExpeditorNames(expeditors);
 useEffect(()=>{setExpenses(prev=>reconcileMarketExpenses(prev,rawRows,classifiers,expeditors))},[rawRows,classifiers.markets,classifiers.expenseTypes,expeditors]);
 useEffect(()=>{setExpeditors(prev=>{let changed=false;const next=prev.map(e=>{if(e.hasOperations!==true&&(rawRows.some(r=>ownsInvoice(e,r))||movements.some(m=>m.driverId===e.id)||expenses.some(row=>row.driverId===e.id)||hotSales.some(s=>s.driverId===e.id))){changed=true;return {...e,hasOperations:true}}return e});return changed?next:prev})},[rawRows,movements,expenses,hotSales]);
 const [amountFilter,setAmountFilter]=useState('');
 const [history,setHistory]=useState([]),[workflowBusy,setWorkflowBusy]=useState(false);
 const [transferSelection,setTransferSelection]=useState([]);
 const [paymentTransfers,setPaymentTransfers]=useState([]),[paymentHistoryRequest,setPaymentHistoryRequest]=useState(null);
 const paymentTransferLock=useRef(false);
 const openPaymentTransfer=()=>{paymentTransferLock.current=false;setModal('payment-transfer')};
 const commitPaymentTransfer=data=>{
  if(paymentTransferLock.current)return;
  const result=transferPayment(rows,data,{...profileUser,role:appRole});
  paymentTransferLock.current=true;
  setRows(result.rows);setHistory(prev=>[...result.events,...prev]);setPaymentTransfers(prev=>[...prev,result.transfer]);
  setPaymentHistoryRequest({id:data.sourceId,timestamp:Date.now()});setModal(null);
  const target=result.rows.find(row=>String(row[0])===String(data.targetId));
  setToast({icon:'PaymentTransferSuccess',title:'Оплата перенесена',description:money(result.transfer.amount)+' — на счёт '+target[0]+', '+target[2]});
 };
 const closeWorkflow=()=>{if(!workflowBusy)setModal(null)};
 const startWorkflow=kind=>{if(['replace','return'].includes(kind)&&selected.length&&!invoiceSelectionActions(rows,selected).transfer){setToast('Для этого действия выберите только сегодняшние накладные «Ожидает оплаты»');return}if(kind==='return'&&!selected.length){setToast('Сначала выберите сегодняшние накладные «Ожидает оплаты»');return}if(kind==='replace')setTransferSelection(selected);setModal(kind)};
 const commitWorkflow=(kind,data={})=>{
   let allowed;
   if(kind==='replace'){try{allowed=validateTransfer(rows,data,activeDriverNames,classifiers.transferReasons.map(r=>r.name))}catch(error){setToast(error.message);return}}
   else{allowed=rows.filter(r=>selected.includes(r[0])&&transferable(r));
   if(!allowed.length||allowed.length!==selected.length){setToast('Выберите сегодняшние накладные «Ожидает оплаты»');return}}
   const ids=new Set(allowed.map(r=>r[0]));
   const timestamp=new Date().toISOString();
   setRows(prev=>prev.map(r=>{if(!ids.has(r[0]))return r;const next=[...r];if(kind==='replace')next[4]=data.newDriver;else{next[10]='Возврат';next[12]=0;next[13]=0;next[14]='Все товары возвращены';}return next}));
   setHistory(prev=>[...allowed.map(r=>({id:r[0],event:kind==='replace'?'Замена экспедитора':'Оформлен возврат',timestamp,author:'Асанова Айгерим',from:kind==='replace'?r[4]:undefined,to:kind==='replace'?data.newDriver:undefined,description:kind==='return'?'Все товары возвращены, долг снят.':undefined,reason:data.reason||''})),...prev]);
   setSelected([]);setModal(null);setToast(kind==='replace'?{title:transferSelection.length?`Экспедитор заменён: ${allowed.length} ${invoiceNoun(allowed.length)}`:`Передано накладных: ${allowed.length} · ${data.newDriver}`}:{title:`Возврат оформлен: ${allowed.length} ${invoiceNoun(allowed.length)}`});
 };
 const onImported=incoming=>{if(!firstImport)try{localStorage.removeItem('mkassa:tour:v1:01204201610123:ceo:Поставки:list')}catch{}setFirstImport(true);setLoadState('ready');setRows(prev=>[...incoming,...prev]);setModal(null);setSelected([]);setPage(1);setHistory(prev=>[...incoming.map(r=>({id:r[0],event:'Накладная загружена',timestamp:new Date().toISOString(),author:'Асанова Айгерим',amount:r[7]})),...prev]);setToast({title:`Загружено накладных: ${incoming.length}`})};

 const scrollRef=useRef(null);
 const listPosition=useRef({top:0,left:0});
 const [scroll,setScroll]=useState({left:0,max:1,thumb:100});
 const [extra,setExtra]=useState({changes:'',address:'',party:''}),[draftExtra,setDraftExtra]=useState({changes:'',address:'',party:''});
 const [query,setQuery]=useState(''),[period,setPeriod]=useState('День'),[selected,setSelected]=useState([]),[hidden,setHidden]=useState([]),[modal,setModal]=useState(null),[detail,setDetail]=useState(()=>{const id=readCabinetLocation(window.location.hash).invoiceId;return id?[id]:null}),[toast,setToast]=useState(''),[nav,setNav]=useState(false),[page,setPage]=useState(1),[limit,setLimit]=useState(10),[statuses,setStatuses]=useState([]),[draft,setDraft]=useState([]),[driver,setDriver]=useState(''),[draftDriver,setDraftDriver]=useState(''),[range,setRange]=useState(()=>periodRange('День',bishkekToday()));
 const navigateSummary=()=>{if(window.location.hash!=='#summary')window.history.pushState({cabinetParent:window.location.hash},'','#summary');setSection('Сводка');setModal(null);setNav(false)};
 const navigateDeliveries=(id=null,options={})=>{
   const hash=id==null?'#deliveries':'#deliveries/'+encodeURIComponent(id);
   if(window.location.hash!==hash){
     if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
     window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
   }
   setSection('Поставки');setDetail(id==null?null:[String(id)]);setModal(null);
 };
 const openDriverDeliveries=(name,dates,selectedPeriod)=>{
   setDriver(name);setStatuses([]);setAmountFilter('');setQuery('');setExtra({changes:'',address:'',party:''});
   setRange([...dates]);setPeriod(selectedPeriod);setSelected([]);setPage(1);listPosition.current={top:0,left:0};
   navigateDeliveries();
 };
 const navigateExpeditors=(next,options={})=>{
   const hash=expeditorHash(next);
   if(window.location.hash===hash){setSection('Экспедиторы');setExpeditorRoute(next);return}
   if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
   window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
   setSection('Экспедиторы');setExpeditorRoute(next);setModal(null);
 };
 const navigateWarehouse=(next,options={})=>{
   const hash=warehouseHash(next);
   if(window.location.hash===hash){setSection('Склад');setWarehouseRoute(next);return}
   if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
   window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
   setSection('Склад');setWarehouseRoute(next);setModal(null);
 };
 const navigateExpenses=(next,options={})=>{
  const hash=expenseHash(next);
  if(window.location.hash===hash){setSection('Расходы');setExpenseRoute(next);return}
  if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
  window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
  setSection('Расходы');setExpenseRoute(next);setModal(null);
 };
 const navigateHotSales=(next,options={})=>{
  const hash=hotSaleHash(next);
  if(window.location.hash===hash){setSection('Горячие продажи');setHotSaleRoute(next);return}
  if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
  window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
  setSection('Горячие продажи');setHotSaleRoute(next);setModal(null);
 };
 const navigateCounterparty=id=>{const hash='#counterparties/'+encodeURIComponent(id);if(window.location.hash!==hash)window.history.pushState({cabinetParent:window.location.hash},'',hash);setSection('Контрагент');setCounterpartyRoute({mode:'view',id:String(id)});setModal(null)};
 const navigateProfile=(next={mode:'view'},options={})=>{
  const hash=profileHash(next);
  if(window.location.hash!==hash)window.history[options.replace?'replaceState':'pushState']({cabinetParent:window.location.hash},'',hash);
  setSection('Профиль дистрибьютора');setProfileRoute(next);setModal(null);setNav(false);
 };
 const navigateClassifiers=(next,options={})=>{
  const hash=classifierHash(next);
  if(window.location.hash!==hash)window.history[options.replace?'replaceState':'pushState']({cabinetParent:window.location.hash},'',hash);
  setSection('Классификаторы');setClassifierRoute(next);setModal(null);
 };
 const navigateProducts=(next,options={})=>{
   const hash=productHash(next);
   if(window.location.hash===hash){setSection('Товары');setProductRoute(next);return}
   if(options.parent&&window.history.state?.cabinetParent===hash){window.history.back();return}
   window.history[options.parent||options.replace?'replaceState':'pushState']({cabinetParent:options.parent||options.replace?window.history.state?.cabinetParent:window.location.hash},'',hash);
   setSection('Товары');setProductRoute(next);setModal(null);
 };
 useEffect(()=>{
   const restore=()=>{const location=readCabinetLocation(window.location.hash);setSection(location.section);setCounterpartyRoute(location.section==='Контрагент'?location.route:{mode:'view'});setProfileRoute(location.section==='Профиль дистрибьютора'?location.route:{mode:'view'});setClassifierRoute(location.section==='Классификаторы'?location.route:{mode:'list',tab:'tnved'});setHotSaleRoute(location.section==='Горячие продажи'?location.route:{mode:'list'});setExpenseRoute(location.section==='Расходы'?location.route:{mode:'list'});setWarehouseRoute(location.section==='Склад'?location.route:{mode:'list'});setProductRoute(location.route);setExpeditorRoute(location.section==='Экспедиторы'?location.route:{mode:'list'});setModal(null);setNav(false);setDetail(location.invoiceId?[location.invoiceId]:null)};
   window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
   return()=>{window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore)};
 },[]);
 useEffect(()=>{
   if(section==='Товары'&&productRoute.id&&!products.some(p=>p.id===productRoute.id)){
     navigateProducts({mode:'list'},{replace:true});setToast({title:'Товар не найден',description:'Возможно, он был удалён. Открыт список товаров.'});
   }
 },[section,productRoute.mode,productRoute.id,products]);
 useEffect(()=>{
   if(section==='Экспедиторы'&&expeditorRoute.id&&!expeditors.some(e=>e.id===expeditorRoute.id)){
     navigateExpeditors({mode:'list'},{replace:true});setToast({title:'Экспедитор не найден',description:'Открыт список экспедиторов.'});
   }
 },[section,expeditorRoute.mode,expeditorRoute.id,expeditors]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer)},[toast]);
 // Можно выбрать накладные «Ожидает оплаты» и с несданными наличными независимо от даты.
 const selectable=r=>canSelectInvoice(r);
 const filterScope=rows.filter(r=>(!amountFilter||(amountFilter==='debt'?r[12]>0:r[13]>0))&&invoiceMatchesSearch(r,query,money)&&(!extra.address||r[3]===extra.address)&&(!extra.party||r[2]===extra.party)&&(!extra.changes||hasProductChanges(r))&&(!driver||r[4]===driver)&&(()=>{const iso=r[1].split('.').reverse().join('-');return (!range[0]||iso>=range[0])&&(!range[1]||iso<=range[1])})());
 const filtered=filterScope.filter(r=>!statuses.length||statuses.some(s=>matchesStatus(r,s)));
 const quickLabels={debt:'Долг магазина',waiting:'Ожидает оплаты',cash:'Наличные не сданы'};
 const toggleQuick=key=>{const label=quickLabels[key];setStatuses(statuses.includes(label)?statuses.filter(s=>s!==label):[label]);setPage(1)};
 const clearFilters=()=>{setAmountFilter('');setStatuses([]);setDriver('');setExtra({changes:'',address:'',party:''});setPage(1)};
 const appliedChips=[...(amountFilter?[{id:'amount',label:amountFilter==='debt'?'Суммы: Долг магазина':'Суммы: Наличные у экспедитора',remove:()=>setAmountFilter('')}]:[]),...statuses.map(value=>({id:'status:'+value,label:'Статус: '+value,remove:()=>setStatuses(s=>s.filter(x=>x!==value))})),...(driver?[{id:'driver',label:'Экспедитор: '+driver,remove:()=>setDriver('')}]:[]),...Object.entries(extra).filter(([,v])=>v).map(([key,value])=>({id:key,label:({changes:'Изменения товара',address:'Адрес',party:'Контрагент'})[key]+': '+value,remove:()=>setExtra(e=>({...e,[key]:''}))}))];

 const currentPage=Math.min(page,Math.max(1,Math.ceil(filtered.length/limit))),visible=filtered.slice((currentPage-1)*limit,currentPage*limit),eligible=filtered.filter(selectable).map(r=>r[0]);
 const selectionActions=invoiceSelectionActions(rows,selected);
 const toggle=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const reset=()=>{setAmountFilter('');setQuery('');setStatuses([]);setExtra({changes:'',address:'',party:''});setDriver('');setRange(periodRange('День',bishkekToday()));setPeriod('День');setPage(1)};
 const openFilters=()=>{setDraft(statuses);setDraftDriver(driver);setDraftExtra({...extra});setModal('filters')};
 const exportFile=async()=>{setExporting(true);try{if(import.meta.env.DEV&&new URLSearchParams(window.location.search).get('preview')==='report-error')throw new Error('Preview');await writeXlsxFile([columns.map(value=>({value,fontWeight:'bold'})),...filtered.map(r=>r.map((value,i)=>({value:i===14?invoiceChangedCount(r,demoInvoiceData.products[r[0]]||invoiceProducts[r[0]],invoiceItemChanges[r[0]]):value})))],{sheet:'Поставки'}).toFile('Поставки.xlsx');setToast({title:'Отчёт скачан',description:'В Excel — все колонки с учётом фильтров.'})}catch{setToast({kind:'error',title:'Не удалось скачать отчёт',description:'Попробуйте позже.'})}finally{setExporting(false)}};

 const activeFilters=(amountFilter?1:0)+statuses.length+(driver?1:0)+Object.values(extra).filter(Boolean).length;
 useEffect(()=>{const el=scrollRef.current;if(!el)return;el.scrollLeft=listPosition.current.left;const update=()=>{const frozen=(el.querySelector('.delivery-check')?.getBoundingClientRect().width||0)+(el.querySelector('.delivery-number')?.getBoundingClientRect().width||123);setScroll({left:el.scrollLeft,max:Math.max(0,el.scrollWidth-el.clientWidth),frozen,thumb:Math.max(40,(el.clientWidth-frozen)*(el.clientWidth-frozen)/Math.max(1,el.scrollWidth-frozen))})};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()},[section,hidden,limit,query,detail?.[0],loadState,filtered.length]);
 const activeDetail=section==='Поставки'&&detail?rows.find(r=>String(r[0])===String(detail[0]))||null:null;
 useEffect(()=>{
   if(section==='Поставки'&&detail&&loadState==='ready'&&!rows.some(r=>String(r[0])===String(detail[0]))){
     navigateDeliveries(null,{replace:true});setToast({title:'Накладная не найдена',description:'Открыт список поставок.'});
   }
 },[section,detail?.[0],loadState,rawRows]);
 useEffect(()=>{if(detail){listPosition.current.top=window.scrollY;window.scrollTo(0,0)}else{window.scrollTo(0,listPosition.current.top)}},[detail?.[0]]);
 const receiveCash=amount=>{
   if(!activeDetail)return;
   try{
     const next=acceptInvoiceCash(activeDetail,amount);
     setRows(prev=>prev.map(r=>String(r[0])===String(next[0])?next:r));
     setHistory(prev=>[{id:next[0],event:'Наличные приняты кассой',description:next[13]>0?`Осталось у экспедитора: ${money(next[13])}.`:'Наличные по накладной закрыты.',timestamp:new Date().toISOString(),author:'Асанова Айгерим',amount},...prev]);
     setModal(null);setToast({title:`Принято ${money(amount)}`,description:next[13]>0?`Осталось у экспедитора: ${money(next[13])}.`:`Наличные по накладной №${next[0]} закрыты.`});
   }catch(error){setToast(error.message)}
 };
 const receiveBatchCash=(ids,amount)=>{
   try{
     const plan=planCashSettlement(rows,ids,amount);
     const allocations=new Map(plan.filter(p=>p.amount>0).map(p=>[String(p.id),p]));
     const updated=new Map(rows.filter(r=>allocations.has(String(r[0]))).map(r=>[String(r[0]),acceptInvoiceCash(r,allocations.get(String(r[0])).amount)]));
     const timestamp=new Date().toISOString();
     const totalRemaining=plan.reduce((sum,p)=>sum+Math.round(p.remainingCash*100),0)/100;
     setRows(prev=>prev.map(r=>updated.get(String(r[0]))||r));
     setHistory(prev=>[...rows.filter(r=>allocations.has(String(r[0]))).map(r=>{
       const part=allocations.get(String(r[0]));const next=updated.get(String(r[0]));
       return {id:r[0],event:'Наличные приняты кассой',timestamp,author:'Асанова Айгерим',amount:part.amount,description:`Общий расчёт. Выбрано накладных: ${ids.length}. `+(part.remainingCash>0?`${money(part.remainingCash)} остались у экспедитора по этой накладной.`:'Наличные по этой накладной закрыты.')};
     }),...prev]);
     setSelected(prev=>prev.filter(id=>{const next=updated.get(String(id));return !next||next[13]>0}));setModal(null);
     setToast({title:`Принято ${money(amount)}`,description:totalRemaining>0?`Осталось у экспедитора: ${money(totalRemaining)}.`:`Наличные по выбранным накладным закрыты: ${ids.length}.`});
   }catch(error){setToast(error.message)}
 };
 const total=i=>sumAmounts(filtered,({7:'payable',8:'posted',9:'overpayment',12:'storeDebt',13:'cash'})[i]);
 const field={width:'100%',border:'1px solid '+C.line,borderRadius:8,padding:'10px 12px',background:C.field,marginTop:8};
 return <><style>{styles}</style><div className="app" style={{display:'flex',alignItems:'stretch',gap:12,padding:12,minHeight:'100vh'}}>
 <aside className={'sidebar enter '+(nav?'open':'')} style={{width:256,flexShrink:0,background:C.white,borderRadius:14,padding:8,display:'flex',flexDirection:'column',minHeight:section!=='Поставки'?'calc(100vh - 24px)':1298}}>
 <div style={{...flex,padding:8,height:64,fontWeight:600}}><span style={{...flex,justifyContent:'center',width:32,height:32,background:C.primary,borderRadius:10}}><Icon name="GalleryVerticalEnd"/></span><span style={{fontSize:14}}>ОсОО «Ала-Тоо Трейд»</span><button className="mobile-toggle" aria-label="Закрыть меню" onClick={()=>setNav(false)}>✕</button></div>
 {[["Операции",[['DashboardLayout','Сводка'],['Truck','Поставки'],['Flame','Горячие продажи'],['Receipt','Расходы'],['Warehouse','Склад']]],["Команда",[['UsersRound','Экспедиторы']]],["Справочники",[['Package','Товары'],['Columns3','Классификаторы']]]].map(([title,items])=><div key={title} style={{padding:'8px 0',marginBottom:8}}><p style={{height:32,padding:'6px 8px',fontWeight:500}}>{title}</p>{items.filter(([,label])=>!mobile||label!=='Классификаторы').map(([icon,label])=><Button key={label} className="navitem" aria-current={label===section?'page':undefined} style={{width:'100%',justifyContent:'flex-start',minHeight:32,padding:'5px 8px',marginBottom:4,background:label===section?C.bg:'transparent',fontWeight:label===section?500:400}} onClick={()=>{if(['Сводка','Поставки','Товары','Экспедиторы','Склад','Расходы','Горячие продажи','Классификаторы'].includes(label)){setNav(false);setModal(null);if(label==='Сводка')navigateSummary();else if(label==='Классификаторы')navigateClassifiers({mode:'list',tab:'tnved'});else if(label==='Горячие продажи')navigateHotSales({mode:'list'});else if(label==='Расходы')navigateExpenses({mode:'list'});else if(label==='Склад')navigateWarehouse({mode:'list'});else if(label==='Товары')navigateProducts({mode:'list'});else if(label==='Экспедиторы')navigateExpeditors({mode:'list'});else navigateDeliveries()}else setToast('Этот раздел пока не добавлен в прототип')}}><span aria-hidden="true" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,flex:"0 0 20px"}}><Icon name={icon}/></span><span>{label}</span></Button>)}</div>)}
 </aside>
 <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:12}}>
 <header className="topbar enter" style={{...flex,background:C.white,borderRadius:14,padding:'12px 24px',minHeight:76}}><Button className="mobile-toggle" aria-label="Открыть меню" onClick={()=>setNav(true)}>☰</Button>{section==='Сводка'?<span aria-current="page" style={{flex:1}}>Сводка</span>:section==='Контрагент'?<ProductBreadcrumbs route={{mode:'view',id:counterpartyRoute.id}} onNavigate={()=>navigateDeliveries()} Icon={Icon} sectionLabel="Поставки" detailLabel={rows.find(r=>String(r[0])===counterpartyRoute.id)?.[2]||'Контрагент'} hashFor={()=>'#deliveries'}/>:section==='Профиль дистрибьютора'?<span aria-current="page" style={{flex:1}}>Мой профиль</span>:section==='Классификаторы'?<ProductBreadcrumbs route={{mode:'list'}} onNavigate={navigateClassifiers} Icon={Icon} sectionLabel="Классификаторы" hashFor={classifierHash}/>:section==='Горячие продажи'?<ProductBreadcrumbs route={hotSaleRoute} onNavigate={navigateHotSales} Icon={Icon} sectionLabel="Горячие продажи" detailLabel="Детали продажи" hashFor={hotSaleHash}/>:section==='Расходы'?<ProductBreadcrumbs route={expenseRoute} onNavigate={navigateExpenses} Icon={Icon} sectionLabel="Расходы" detailLabel="Сводка расхода" hashFor={expenseHash}/>:section==='Склад'?<WarehouseBreadcrumbs route={warehouseRoute} onRoute={navigateWarehouse} Icon={Icon}/>:section==='Товары'?<ProductBreadcrumbs route={productRoute} onNavigate={navigateProducts} Icon={Icon}/>:section==='Экспедиторы'?<ProductBreadcrumbs route={expeditorRoute} onNavigate={navigateExpeditors} Icon={Icon} sectionLabel="Экспедиторы" detailLabel="Детали экспедитора" createLabel="Добавить экспедитора" hashFor={expeditorHash}/>:mobile?<>{activeDetail&&<Button icon="ChevronLeft" aria-label="К списку поставок" onClick={()=>navigateDeliveries(null,{parent:true})} style={{background:'transparent'}}/>}<span aria-current="page" style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeDetail?'Накладная №'+activeDetail[0]:'Поставки'}</span></>:<ProductBreadcrumbs route={activeDetail?{mode:'view',id:String(activeDetail[0])}:{mode:'list'}} onNavigate={(_,options)=>navigateDeliveries(null,options)} Icon={Icon} sectionLabel="Поставки" detailLabel="Детали поставки" hashFor={()=>'#deliveries'}/>}<Button icon="Bell" aria-label="Уведомления" onClick={()=>setModal('notifications')}/><ProfileMenu onLogout={onLogout} name={profileUser.name} role={appRole} onProfile={()=>navigateProfile()} Button={Button} Icon={Icon}/></header>
 <main className={'main enter '+(section==='Товары'?'products-screen':'')} style={{background:C.white,borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:section==='Товары'&&productRoute.mode!=='list'?16:24,flex:section!=='Поставки'?1:undefined,animationDelay:'60ms'}}>
 {section==='Сводка'?<Suspense fallback={<p role="status">Загружаем сводку…</p>}><Dashboard onDriverDeliveries={openDriverDeliveries} rows={rows} expenses={expenses} drivers={expeditors} user={profileUser} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Контрагент'?<Suspense fallback={<p role="status">Загружаем контрагента…</p>}><CounterpartyPage paymentTransfers={paymentTransfers} key={counterpartyRoute.id} source={rows.find(r=>String(r[0])===counterpartyRoute.id)} rows={rows} Button={Button} Icon={Icon} money={money} notify={setToast} onBack={()=>navigateDeliveries()} onInvoice={navigateDeliveries}/></Suspense>:section==='Профиль дистрибьютора'?<Suspense fallback={<p role="status">Загружаем профиль…</p>}><ProfilePage company={company} setCompany={setCompany} employees={employees} setEmployees={setEmployees} user={profileUser} role={appRole} route={profileRoute} onRoute={navigateProfile} Button={Button} Icon={Icon} Modal={Modal} notify={setToast}/></Suspense>:section==='Классификаторы'?<Suspense fallback={<p role="status">Загружаем классификаторы…</p>}><ClassifiersPage catalog={classifiers} setCatalog={setClassifiers} role={appRole} onDemoAdmin={import.meta.env.DEV?()=>setAppRole('Админ'):undefined} points={marketPoints(rows,expenses)} route={classifierRoute} onRoute={navigateClassifiers} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Горячие продажи'?<Suspense fallback={<p role="status">Загружаем горячие продажи…</p>}><HotSalesPage sales={hotSales} setSales={setHotSales} drivers={expeditors} route={hotSaleRoute} onRoute={navigateHotSales} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Расходы'?<Suspense fallback={<p role="status">Загружаем расходы…</p>}><ExpensesPage classifiers={classifiers} expenses={expenses} setExpenses={setExpenses} drivers={expeditors} route={expenseRoute} onRoute={navigateExpenses} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Склад'?<Suspense fallback={<p role="status">Загружаем перемещения…</p>}><WarehousePage onOpenExpeditor={id=>navigateExpeditors({mode:'view',id})} movements={movements} setMovements={setMovements} products={products} onProductsUsed={ids=>setProducts(prev=>prev.map(p=>ids.includes(p.id)?{...p,inUse:true}:p))} expeditors={expeditors} route={warehouseRoute} onRoute={navigateWarehouse} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Экспедиторы'?<Suspense fallback={<p role="status">Загружаем экспедиторов…</p>}><ExpeditorsPage hotSales={hotSales} expenses={expenses} movements={movements} onShortageCash={(id,amount)=>{const current=movements.find(m=>m.id===id);const next=acceptShortageCash(current,amount);setMovements(prev=>prev.map(m=>m.id===id?next:m))}} items={expeditors} setItems={setExpeditors} rows={rows} snapshotRows={invoiceSnapshot.current} invoiceHistory={[...history,...demoInvoiceData.history]} route={expeditorRoute} onRoute={navigateExpeditors} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:section==='Товары'?<Suspense fallback={<p role="status">Загружаем товары…</p>}><ProductsPage importRequested={productImportRequested} onImportRequestHandled={()=>setProductImportRequested(false)} classifiers={classifiers} products={products} setProducts={setProducts} route={productRoute} onRoute={navigateProducts} Button={Button} Icon={Icon} Modal={Modal} money={money} notify={setToast}/></Suspense>:activeDetail?<InvoiceDetails canMovePayment={profileUser.status==='Активен'&&canTransferPayment(activeDetail,appRole)} onMovePayment={openPaymentTransfer} historyRequest={paymentHistoryRequest?.id===activeDetail[0]?paymentHistoryRequest:0} key={activeDetail[0]} row={activeDetail} Modal={Modal} itemChanges={invoiceItemChanges[activeDetail[0]]||{}} onItemChange={(index,reason,count)=>saveInvoiceItemChange(activeDetail[0],index,reason,count)} itemsOverride={demoInvoiceData.products[activeDetail[0]]} history={[...history,...demoInvoiceData.history]} Button={Button} Badge={Badge} Icon={Icon} money={money} onCounterparty={()=>navigateCounterparty(activeDetail[0])} onCash={()=>setModal('cash')} onReplace={()=>{setTransferSelection([activeDetail[0]]);setModal('replace')}}/>:<>
 <div className="page-heading" style={{...flex,justifyContent:'space-between',alignItems:'flex-start',gap:16}}><h1>Поставки</h1>{!mobile&&<div className="page-actions" style={flex}>{onboardingComplete&&<><Button icon="Repeat" style={{background:"white",borderColor:C.line}} onClick={()=>startWorkflow('replace')}>Замена экспедитора</Button><Button icon="Banknote" style={{background:"white",borderColor:C.line}} onClick={()=>setModal('cash')}>Расчёт через кассу</Button></>}<Button primary icon="CloudUpload" onClick={()=>startWorkflow('upload')}>Загрузить накладные</Button></div>}</div>
 {!mobile&&['СЕО','Доверенное лицо'].includes(appRole)&&<Suspense fallback={null}><FirstSteps progress={firstSteps} onDrivers={()=>navigateExpeditors({mode:'create'})} onProducts={()=>{setProductImportRequested(true);navigateProducts({mode:'list'})}} onRoles={()=>{const employee=employees.find(e=>e.status==='Активен'&&!e.role);navigateProfile(employee?{mode:'employee',id:employee.id}:{mode:'view'})}} onImport={()=>startWorkflow('upload')} onPasswords={()=>{try{if(!expeditors.some(e=>e.status==='Активен'))throw new Error('Сначала добавьте активного экспедитора.');const next=expeditors.map(e=>e.status==='Активен'?prepareDemoAccess(e):e);setExpeditors(next);setToast({title:'Доступ подготовлен (демо)',description:'Для активных экспедиторов. SMS в прототипе не отправляется.'})}catch(error){setToast({kind:'error',title:'Не удалось подготовить доступ',description:error.message})}}} Button={Button} Icon={Icon}/></Suspense>}
 {onboardingComplete?<>
 <div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{...flex,justifyContent:'space-between',flexWrap:'wrap'}}><label className="search" style={{...flex,background:C.field,borderRadius:8,padding:'0 10px',width:348,height:36}}><Icon name="Search"/><input aria-label="Поиск по всем колонкам" placeholder="Поиск по всем колонкам" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} style={{width:'100%',border:0,outline:'none',background:'transparent',height:'100%'}}/></label>{!mobile&&<Button icon="Download" disabled={exporting||loadState!=='ready'||!filtered.length} onClick={exportFile}>{exporting?'Скачиваем…':'Скачать отчёт'}</Button>}</div>
 <div className="filterbar" style={{...flex,justifyContent:'flex-start',gap:16,flexWrap:'wrap'}}><div className="periods" style={{...flex,gap:16}}><div style={{...flex,gap:0,background:C.bg,borderRadius:8,padding:3}}>{['День','3 дня','Неделя','2 недели','Месяц'].map(p=><Button key={p} aria-pressed={period===p} style={{minHeight:30,padding:'5px 8px',background:period===p?'white':'transparent',boxShadow:period===p?'0 1px 3px #0001':'none',fontWeight:400}} onClick={()=>{setPeriod(p);setRange(periodRange(p,bishkekToday()));setPage(1)}}>{p}</Button>)}</div><div ref={calendarAnchor}><Button icon="Calendar" aria-expanded={modal==='dates'} onClick={()=>setModal(modal==='dates'?null:'dates')}>{!range[0]&&!range[1]?'За всё время':range.map(d=>d?d.split('-').reverse().join('.'):'…').join(' – ')}</Button></div></div><Button icon="SlidersHorizontal" style={{background:'white',borderColor:C.line}} onClick={openFilters}>Фильтры{activeFilters>0?' · '+activeFilters:''}</Button></div></div>
 {appliedChips.length>0&&<div className="enter" aria-label="Применённые фильтры" style={{...flex,flexWrap:'wrap',gap:8}}><span style={{color:C.muted}}>Применены:</span>{appliedChips.map(chip=><Button key={chip.id} aria-label={'Убрать фильтр '+chip.label} onClick={()=>{chip.remove();setPage(1)}}>{chip.label}<Icon name="FilterX"/></Button>)}<Button style={{background:'transparent'}} onClick={clearFilters}>Сбросить все</Button></div>}
 <div className="summary" role="group" aria-label="Итоги поставок" style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:16}}>{[['К оплате',money(total(7)),'SummaryBanknote',true],['Накладных',String(filtered.length),'SummaryReceipt',false],['Внесено',money(total(8)),'SummaryCheck',false],['Долг магазинов',money(total(12)),'SummaryAlert',false],['У экспедиторов на руках',money(total(13)),'SummaryWallet',false]].map(([label,value,icon,primary],i)=><SummaryCard key={label} label={label} value={value} icon={icon} primary={primary} delay={100+i*40}/>)}</div>
 {!mobile&&selected.length>0&&<div className="enter" aria-label="Выбранные накладные" style={{...flex,flexWrap:'wrap',justifyContent:'space-between',background:C.bg,padding:16,minHeight:68,gap:16}}><div style={{...flex,gap:12}}><span style={{background:C.primary,color:'white',borderRadius:26,padding:'2px 8px',fontSize:12,lineHeight:'16px'}}>{selected.length}</span><span style={{fontWeight:500}}>Выбрано накладных</span></div><div style={{...flex,flexWrap:'wrap',gap:16}}><Button icon="X" style={{background:"white",borderColor:C.line}} onClick={()=>setSelected([])}>Снять выбор</Button><Button icon="Banknote" style={{background:"white",borderColor:C.line}} disabled={!selectionActions.cash} onClick={()=>setModal('cash')}>Расчёт через кассу</Button><Button icon="Undo2" disabled={!selectionActions.transfer} style={{background:"white",borderColor:C.line}} onClick={()=>startWorkflow('return')}>Возврат</Button><Button icon="Repeat" style={{background:"white",borderColor:C.line}} disabled={!selectionActions.transfer} onClick={()=>startWorkflow('replace')}>Заменить экспедитора</Button></div></div>}
 <div className="quickbar" style={{...flex,justifyContent:'space-between',gap:12}}><div style={{...flex,flexWrap:'wrap',gap:12}}><span style={{color:C.muted}}>Быстрые фильтры:</span>{[['debt','Долг магазина',filterScope.filter(r=>matchesStatus(r,'Долг магазина')).length],['waiting','Ожидает оплаты',filterScope.filter(r=>r[10]==='Ожидает оплаты').length],['cash','Наличные не сданы',filterScope.filter(r=>matchesStatus(r,'Наличные не сданы')).length]].map(([key,label,count])=><Button key={key} className="quick" aria-pressed={statuses.includes(label)} disabled={count===0&&!statuses.includes(label)} style={{background:statuses.includes(label)?C.primary:'white',color:statuses.includes(label)?'white':C.text,borderColor:C.line}} onClick={()=>toggleQuick(key)}>{label} · {count}{statuses.includes(label)&&<Icon name="FilterXWhite"/>}</Button>)}</div><div ref={columnsAnchor}><Button icon="Columns3" aria-expanded={modal==='columns'} style={{background:'white',borderColor:C.line}} onClick={()=>setModal(modal==='columns'?null:'columns')}>Колонки · {15-hidden.length} из 15</Button></div></div>

 {loadState!=='ready'||!filtered.length?<ListState readOnly={mobile} state={loadState!=='ready'?loadState:rawRows.length?'nothing':'empty'} Icon={Icon} Button={Button} onReset={reset} onUpload={()=>startWorkflow('upload')} onRetry={()=>loadRows(true)}/>:<>
 <div style={{border:'1px solid '+C.line,borderRadius:14,overflow:'hidden'}}><div ref={scrollRef} className="scroll table-scroll" onScroll={e=>{const left=e.currentTarget.scrollLeft;listPosition.current.left=left;setScroll(v=>v.left===left?v:{...v,left})}} style={{width:'100%',overflowX:'auto',overflowY:'hidden'}}><table style={{borderCollapse:'separate',borderSpacing:0,width:'max-content',tableLayout:'fixed'}}><thead><tr><th className="delivery-check" style={{position:'sticky',left:0,zIndex:3,background:C.bg,width:40,minWidth:40,padding:12}}><input type="checkbox" aria-label="Выбрать все доступные накладные" title="Можно выбрать накладные «Ожидает оплаты» и накладные с несданными наличными независимо от даты" checked={eligible.length>0&&eligible.every(id=>selected.includes(id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...eligible])]:selected.filter(id=>!eligible.includes(id)))}/></th>{columns.map((c,i)=>!hidden.includes(i)&&<th key={c} className={i===0?'delivery-number':[5,11,13,14].includes(i)?'delivery-web-column':undefined} style={{textAlign:monetary.includes(i)?'right':'left',padding:'16px 8px',height:56,fontWeight:600,color:C.muted,width:widths[i],minWidth:widths[i],maxWidth:widths[i],background:C.bg,position:i===0?'sticky':undefined,left:i===0?40:undefined,zIndex:i===0?3:1}}>{c}</th>)}</tr></thead><tbody>{visible.map((r,ri)=><tr key={r[0]} className="row" data-selected={selected.includes(r[0])} style={{animationDelay:150+ri*25+'ms'}} onClick={()=>navigateDeliveries(r[0])}><td className="delivery-check" style={{position:'sticky',left:0,zIndex:2,background:'white',borderBottom:'1px solid '+C.line,padding:12,height:64}} onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={'Выбрать накладную '+r[0]} title={selectable(r)?'Выбрать':'Можно выбрать накладные «Ожидает оплаты» и накладные с несданными наличными независимо от даты'} disabled={!selectable(r)} checked={selected.includes(r[0])} onChange={()=>toggle(r[0])}/></td>{r.map((value,i)=>!hidden.includes(i)&&<td key={i} className={i===0?'delivery-number':[5,11,13,14].includes(i)?'delivery-web-column':undefined} style={{width:widths[i],minWidth:widths[i],maxWidth:widths[i],padding:'8px',height:64,borderBottom:'1px solid '+C.line,textAlign:monetary.includes(i)?'right':'left',background:'white',position:i===0?'sticky':undefined,left:i===0?40:undefined,zIndex:i===0?2:0,boxShadow:i===0?'4px 0 6px -6px #0004':undefined,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:[2,11,14].includes(i)?'normal':'nowrap'}}>{i===0?<button className="mono" style={{border:0,background:'transparent',padding:0}} aria-label={'Открыть поставку '+value}>{value}</button>:i===2?<a href={'#counterparties/'+encodeURIComponent(r[0])} onClick={e=>{e.stopPropagation();if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigateCounterparty(r[0])}}}><span className="clamp" title={value}>{value}</span></a>:i===14?<span>{invoiceChangedCount(r,demoInvoiceData.products[r[0]]||invoiceProducts[r[0]],invoiceItemChanges[r[0]])||'—'}</span>:i===10?<Badge row={r}/>:monetary.includes(i)?<span className="mono" style={{color:i===12&&value>0&&r[10]==='Долг'?'#e7000b':undefined}}>{money(value)}</span>:i===5?<span className="mono">{value}</span>:<span className={i===3?'one-line':'clamp'} title={String(value||'')}>{value||'—'}</span>}</td>)}</tr>)}</tbody></table></div>
 {scroll.max>0&&<div style={{paddingLeft:scroll.frozen||163,background:C.bg,height:12}}><input className="table-range" type="range" aria-label="Прокрутить таблицу по горизонтали" min="0" max={scroll.max} value={Math.min(scroll.left,scroll.max)} style={{'--thumb-width':scroll.thumb+'px'}} onChange={e=>{scrollRef.current.scrollLeft=Number(e.target.value)}}/></div>}
 <div className="footer" style={{...flex,gap:16,padding:16}}><span style={{color:C.muted}}>Показано {filtered.length?(currentPage-1)*limit+1:0}–{Math.min(currentPage*limit,filtered.length)} из {filtered.length}</span><div className="footer-spacer" style={{flex:1}}/><span style={{color:C.muted}}>Строк на странице</span><Select aria-label="Строк на странице" value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1)}} style={{background:C.field,border:'none',borderRadius:8,height:36,padding:'0 12px'}}>{[5,10,20].map(n=><option key={n}>{n}</option>)}</Select>{filtered.length>limit&&<><Button icon="ChevronLeft" style={{background:'transparent'}} disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Назад</Button>{Array.from({length:Math.max(1,Math.ceil(filtered.length/limit))},(_,i)=><Button key={i} aria-current={currentPage===i+1?'page':undefined} style={{background:currentPage===i+1?C.bg:'transparent',minWidth:36}} onClick={()=>setPage(i+1)}>{i+1}</Button>)}<Button style={{background:'transparent'}} disabled={currentPage*limit>=filtered.length} onClick={()=>setPage(currentPage+1)}>Вперёд<Icon name="ChevronRight"/></Button></>}</div></div>
 </>}
 </>:<ListState readOnly={mobile} state="empty" Icon={Icon} Button={Button} onUpload={()=>startWorkflow('upload')}/>}
 </>}
 </main></div></div>
 {modal==='columns'&&<ColumnsPopover anchor={columnsAnchor} columns={columns} hidden={hidden} onToggle={i=>setHidden(h=>h.includes(i)?h.filter(x=>x!==i):[...h,i])} Icon={Icon} onClose={()=>setModal(null)}/>}
 {modal==='dates'&&<RangeCalendar anchor={calendarAnchor} range={range} onChange={next=>{setRange(next);setPeriod('');setPage(1)}} Button={Button} Icon={Icon} onClose={()=>setModal(null)}/>}
 {!mobile&&modal==='replace'&&(transferSelection.length?<SelectedTransferDialog Modal={Modal} Button={Button} Icon={Icon} rows={rows} activeDrivers={activeDriverNames} transferReasons={classifiers.transferReasons.map(r=>r.name)} selected={transferSelection} money={money} onClose={closeWorkflow} onCommit={commitWorkflow}/>:<TransferDialog Modal={Modal} Button={Button} Icon={Icon} rows={rows} activeDrivers={activeDriverNames} transferReasons={classifiers.transferReasons.map(r=>r.name)} selected={[]} money={money} onClose={closeWorkflow} onCommit={commitWorkflow}/>)}
 {!mobile&&['return','upload'].includes(modal)&&<WorkflowDialogs key={modal} kind={modal} Modal={Modal} Button={Button} Icon={Icon} rows={rows} selected={selected} columns={columns} money={money} onClose={closeWorkflow} onCommit={commitWorkflow} onImported={onImported} onBusy={setWorkflowBusy}/>}
 {!mobile&&modal==='cash'&&!activeDetail&&<BatchCashDialog initialIds={selected} rows={rows} Modal={Modal} Button={Button} Icon={Icon} money={money} onClose={()=>setModal(null)} onSubmit={receiveBatchCash}/>}
 {!mobile&&modal==='cash'&&activeDetail&&<CashDialog row={activeDetail} Modal={Modal} Button={Button} Icon={Icon} money={money} onClose={()=>setModal(null)} onSubmit={receiveCash}/>}
 {!mobile&&modal==='payment-transfer'&&activeDetail&&<PaymentTransferDialog source={activeDetail} rows={rows} Modal={Modal} Button={Button} Icon={Icon} money={money} onClose={()=>setModal(null)} onSubmit={commitPaymentTransfer}/>}
 {modal&&!['payment-transfer','cash','columns','dates','replace','return','upload'].includes(modal)&&<Modal title={{filters:'Фильтры',columns:'Колонки таблицы',dates:'Период',upload:'Загрузить накладные',replace:'Замена экспедитора',cash:'Расчёт через кассу',notifications:'Уведомления',profile:'Профиль'}[modal]} drawer={modal==='filters'} onClose={()=>setModal(null)}>
 {modal==='filters'?<>
 <div style={{flex:1,minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:32,paddingBottom:24}}>
 <div><p style={{fontWeight:500,lineHeight:'14px',marginBottom:16}}>Статус</p><div style={{display:'grid',gap:16}}>{statusFilters.map(s=><label key={s} style={{...flex,lineHeight:'16px',fontWeight:500}}><input className="filter-check" type="checkbox" checked={draft.includes(s)} onChange={()=>setDraft(draft.includes(s)?draft.filter(x=>x!==s):[...draft,s])}/><HistoryStatusText>{s}</HistoryStatusText></label>)}</div></div>
 {[['changes','Изменения товара','Все',['Есть изменения']],['address','Адрес','Все адреса',[...new Set(rows.map(r=>r[3]))]],['party','Контрагент','Все контрагенты',[...new Set(rows.map(r=>r[2]))]],['driver','Экспедитор','Выбрать',[...new Set(rows.map(r=>r[4]))]]].map(([key,label,placeholder,options])=><label key={key} style={{display:'block',fontWeight:500,lineHeight:'14px'}}>{label}<Select className="filter-select" style={{...field,marginTop:8,height:36,padding:'7px 10px',fontWeight:400,color:C.muted}} value={key==='driver'?draftDriver:draftExtra[key]} onChange={e=>key==='driver'?setDraftDriver(e.target.value):setDraftExtra({...draftExtra,[key]:e.target.value})}><option value="">{placeholder}</option>{options.map(s=><option key={s}>{s}</option>)}</Select></label>)}
 </div>
 <div style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0,paddingTop:24}}><Button style={{width:'100%',background:'white',borderColor:C.line}} onClick={()=>{setDraft([]);setDraftDriver('');setDraftExtra({changes:'',address:'',party:''})}}>Сбросить</Button><Button primary style={{width:'100%'}} onClick={()=>{setStatuses(draft);setDriver(draftDriver);setExtra({...draftExtra});setPage(1);setModal(null)}}>Применить</Button></div>
 </>:null}
 {modal==='notifications'&&<p style={{color:C.muted}}>Новых уведомлений нет</p>}
 </Modal>}

 {<Suspense fallback={null}><Tutorial key={section+':'+(section==='Контрагент'?'view':section==='Профиль дистрибьютора'?profileRoute.mode:section==='Товары'?productRoute.mode:section==='Экспедиторы'?expeditorRoute.mode:section==='Склад'?warehouseRoute.mode:section==='Расходы'?expenseRoute.mode:section==='Горячие продажи'?hotSaleRoute.mode:activeDetail?'view':'list')} section={section} mode={section==='Контрагент'?'view':section==='Профиль дистрибьютора'?profileRoute.mode:section==='Товары'?productRoute.mode:section==='Экспедиторы'?expeditorRoute.mode:section==='Склад'?warehouseRoute.mode:section==='Расходы'?expenseRoute.mode:section==='Горячие продажи'?hotSaleRoute.mode:activeDetail?'view':'list'} request={tutorialRequest} Button={Button}/></Suspense>}
 {typeof toast==='object'&&toast&&<div role="status" className="toast" style={{position:'fixed',top:'max(24px, env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',zIndex:60,display:'flex',alignItems:'center',gap:12,width:384,maxWidth:'calc(100vw - 32px)',background:'white',border:'1px solid '+C.line,borderRadius:16,padding:16,boxShadow:'0 4px 12px #0002'}}><Icon name={toast.icon||(toast.kind==='error'?'ReportError':'CashSuccess')}/><div style={{flex:1,lineHeight:'20px'}}><p style={{fontWeight:500}}>{toast.title}</p>{toast.description&&<p style={{color:C.muted,marginTop:4}}>{toast.description}</p>}</div><Button aria-label="Закрыть уведомление" onClick={()=>setToast('')} style={{background:'transparent',padding:0,minHeight:24}}><Icon name="X"/></Button></div>}
 {typeof toast==='string'&&toast&&<div role="status" className="toast" style={{position:'fixed',top:'max(24px, env(safe-area-inset-top))',left:'50%',transform:'translateX(-50%)',zIndex:60,background:C.primary,color:'white',padding:'16px 20px',borderRadius:12,boxShadow:'0 8px 32px #0002',maxWidth:'calc(100vw - 32px)',lineHeight:'20px',overflowWrap:'anywhere'}}>{toast}</div>}
 </>;
}
function SessionGate(){
 const [signedOut,setSignedOut]=useState(true);
 const logout=()=>{window.history.replaceState(null,'','#signed-out');setSignedOut(true)};
 const returnToCabinet=()=>{try{resetTutorialProgress(localStorage)}catch{}window.history.replaceState(null,'','#summary');setSignedOut(false)};
 if(signedOut)return <><style>{styles}</style><main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:C.bg}}><section aria-labelledby="signed-out-title" style={{background:'white',borderRadius:16,padding:32,width:440,maxWidth:'100%',textAlign:'center',boxShadow:'0 1px 3px #0001'}}><span style={{display:'inline-flex',padding:12,background:C.primary,borderRadius:14,marginBottom:24}}><Icon name="GalleryVerticalEnd"/></span><h1 id="signed-out-title" style={{fontSize:24,lineHeight:'32px'}}>Вход в кабинет дистрибьютора</h1><p style={{color:C.muted,lineHeight:'22px',marginTop:12}}>Войдите через МБизнес, чтобы перейти в кабинет.</p><Button primary style={{width:'100%',marginTop:24}} onClick={returnToCabinet}>Войти через МБизнес</Button><p style={{fontSize:12,color:C.muted,marginTop:12,lineHeight:'18px'}}>Демонстрационная версия</p></section></main></>;
 return <App onLogout={logout}/>;
}
createRoot(document.getElementById('root')).render(<SessionGate/>);
