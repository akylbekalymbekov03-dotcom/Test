import {Select} from './Select';
import {StatusSelect} from './StatusSelect';
import {HistoryTimeline} from './HistoryTimeline';
import {SummaryCard} from './SummaryCard';
import {HistoryStatusText} from './HistoryStatusText';
import {ClassifierValue} from './ClassifierValue';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import {RangeCalendar} from './ListControls';
import {periodRange} from './list-utils.js';
import {bishkekToday} from './warehouse-model.js';
import {useMobile} from './use-mobile.js';
import {expenseStatuses,expenseTypes,expenseDriver,expenseDate,expenseMatches,expenseSelectable,expenseActionAllowed,transitionExpenses,expenseTotals} from './expenses-model.js';
import './expenses.css';

const light={background:'white',borderColor:'#f0efec'},danger={background:'#ffe2e2',color:'#e7000b'};
const dateTime=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Bishkek',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function Status({value}){return <span className={'expense-badge '+(value==='Подтвержден'?'expense-blue':value==='Отказан'?'expense-red':value==='Возмещен'?'expense-green':'')}>{value}</span>}
function Check({checked,indeterminate,disabled,label,onChange}){const ref=useRef(null);useEffect(()=>{if(ref.current)ref.current.indeterminate=!!indeterminate},[indeterminate]);return <input ref={ref} className="filter-check" type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange}/>}
function ActionButtons({rows,ids,onAction,onReject,Button,vertical=false}){
 const allow=action=>expenseActionAllowed(rows,ids,action);
 return <div className={vertical?'expense-actions vertical':'expense-actions'}>
  {!vertical&&<span title={!allow('reject')?'Отказать можно только расходам, ожидающим подтверждения.':undefined}><Button style={danger} disabled={!allow('reject')} onClick={onReject}>Отказать</Button></span>}
  {(!vertical||allow('reimburse'))&&<span title={!allow('reimburse')?'Возместить можно только подтверждённые расходы.':undefined}><Button style={light} disabled={!allow('reimburse')} onClick={()=>onAction(ids,'reimburse')}>Возместить</Button></span>}
  {(!vertical||allow('confirm'))&&<Button primary disabled={!allow('confirm')} onClick={()=>onAction(ids,'confirm')}>Подтвердить</Button>}
  {vertical&&allow('reject')&&<Button style={danger} onClick={onReject}>Отказать</Button>}
 </div>;
}
function ExpenseSheet({row,rows,drivers,onClose,onAction,onReject,Button,Icon,Modal,money,mobile}){
 const [tab,setTab]=useState('data');
 const actor=(name,timestamp)=>name?(name+(timestamp?' · '+dateTime.format(new Date(timestamp)):'')):'—';
 const fields=[['Статус',<Status key="status" value={row.status}/>],['Уникальный номер расхода',String(row.number),true],['Дата',expenseDate(row.date)],['Экспедитор',expenseDriver(row,drivers)],['Тип расхода',row.type],['Район',row.district],['Адрес',row.address],['Контрагент',row.party||'—'],['Сумма',money(row.amount),true],...(row.marketName?[['Рынок',row.marketName],['Накладная',String(row.invoiceId)]]:[]),
  ...(['Подтвержден','Возмещен'].includes(row.status)?[['Подтвердил',actor(row.approvedBy,row.approvedAt)]]:[]),
  ...(row.status==='Возмещен'?[['Возместил',actor(row.reimbursedBy,row.reimbursedAt)]]:[]),
  ...(row.status==='Отказан'?[['Отказал',actor(row.rejectedBy,row.rejectedAt)],['Причина отказа',row.reason||'—']]:[['Комментарий',row.comment||'—']])];
 return <Modal title="Сводка расхода" closeIcon="ExpenseClose" drawer onClose={onClose}>
  <p className="expense-sheet-subtitle">Расход №{row.number}</p>
  {!mobile&&<div className="expense-tabs" role="tablist" aria-label="Сводка расхода">{[['data','Данные'],['history','История']].map(([key,label])=><button role="tab" aria-selected={tab===key} key={key} onClick={()=>setTab(key)}>{label}</button>)}</div>}
  <div className="expense-sheet-body">
   {tab==='history'&&!mobile?<section className="expense-history"><h3>История изменений</h3><HistoryTimeline events={row.history} money={money}/></section>:<dl className="expense-sheet-fields">{fields.map(([label,value,mono])=><div key={label}><dt>{label}</dt><dd className={mono?'mono':''}>{value}</dd></div>)}</dl>}
  </div>
  {expenseSelectable(row)&&<footer className="expense-sheet-footer"><ActionButtons rows={rows} ids={[row.id]} onAction={onAction} onReject={onReject} Button={Button} vertical/></footer>}
 </Modal>;
}
function RejectDialog({ids,onClose,onSubmit,Modal,Button}){
 const [reason,setReason]=useState('');
 return <Modal closeIcon="ExpenseClose" title={ids.length===1?'Отказать в расходе?':'Отказать в '+ids.length+' расходах?'} compact width={384} onClose={onClose}><p className="expense-reject-hint">Отказ нельзя будет пересмотреть. Укажите причину отказа.</p><textarea className="expense-reason" autoFocus aria-label="Причина отказа в расходах" placeholder="Причина отказа обязательна" value={reason} onChange={e=>setReason(e.target.value)}/><div className="expense-dialog-actions"><Button style={light} onClick={onClose}>Отмена</Button><Button style={danger} disabled={!reason.trim()} onClick={()=>onSubmit(ids,'reject',reason)}>Отказать</Button></div></Modal>;
}

export function ExpensesPage({classifiers,expenses,setExpenses,drivers,route,onRoute,Button,Icon,Modal,money,notify}){
 const mobile=useMobile(),[query,setQuery]=useState(''),[driver,setDriver]=useState(''),[status,setStatus]=useState(''),[type,setType]=useState(''),[period,setPeriod]=useState('День'),[range,setRange]=useState(()=>periodRange('День',bishkekToday())),[calendar,setCalendar]=useState(false),[selected,setSelected]=useState([]),[reject,setReject]=useState(null),[limit,setLimit]=useState(10),[page,setPage]=useState(1),[exporting,setExporting]=useState(false);
 const anchor=useRef(null),table=useRef(null),position=useRef({left:0,top:0}),guard=useRef(false);
 const scope=expenses.filter(row=>expenseMatches(row,query,drivers,money)&&(!driver||row.driverId===driver)&&(!type||row.type===type)&&(!range[0]||row.date>=range[0])&&(!range[1]||row.date<=range[1]));
 const filtered=scope.filter(row=>!status||row.status===status),totals=expenseTotals(scope),pages=Math.max(1,Math.ceil(filtered.length/limit)),current=Math.min(page,pages),visible=filtered.slice((current-1)*limit,current*limit);
 const active=expenses.find(row=>row.id===route.id),selectable=visible.filter(expenseSelectable),checked=selectable.filter(row=>selected.includes(row.id));
 useEffect(()=>{guard.current=false},[expenses]);
 useEffect(()=>{setPage(1);setSelected([])},[query,driver,status,type,range[0],range[1],limit]);
 useEffect(()=>{setReject(null);setCalendar(false)},[route.id,route.mode]);
 useEffect(()=>{if(mobile)setSelected([])},[mobile]);
 useEffect(()=>{if(route.id&&!active){onRoute({mode:'list'},{replace:true});notify({title:'Расход не найден',description:'Открыт список расходов.'})}},[route.id,active]);
 useLayoutEffect(()=>{if(route.mode==='list'){window.scrollTo({top:position.current.top,behavior:'instant'});if(table.current)table.current.scrollLeft=position.current.left}},[route.mode]);
 const open=row=>{position.current={left:table.current?.scrollLeft||0,top:window.scrollY};onRoute({mode:'view',id:row.id})};
 const clear=()=>{setQuery('');setDriver('');setType('');setStatus('');setPeriod('День');setRange(periodRange('День',bishkekToday()))};
 const commit=(ids,action,reason='')=>{if(guard.current)return;guard.current=true;try{const next=transitionExpenses(expenses,ids,action,reason);setExpenses(next);setSelected([]);setReject(null);notify({title:({confirm:'Расходы подтверждены',reject:'В расходах отказано',reimburse:'Расходы возмещены'})[action],description:'Обработано: '+ids.length+'.'})}catch(error){guard.current=false;notify({kind:'error',title:'Не удалось выполнить действие',description:error.message})}};
 const exportReport=async()=>{setExporting(true);try{
  const headings=['Уникальный номер расхода','Дата','Экспедитор','Тип расхода','Район','Адрес','Контрагент','Сумма, сом','Комментарий','Статус','Причина отказа'];
  await writeXlsxFile([headings.map(value=>({value,fontWeight:'bold'})),...filtered.map(row=>[String(row.number),expenseDate(row.date),expenseDriver(row,drivers),row.type,row.district,row.address,row.party,row.amount,row.comment,row.status,row.reason].map(value=>({value})))],{sheet:'Расходы'}).toFile('Расходы.xlsx');
  notify({title:'Отчёт скачан',description:'В Excel — все колонки с учётом поиска и фильтров.'});
 }catch{notify({kind:'error',title:'Не удалось скачать отчёт',description:'Попробуйте ещё раз.'})}finally{setExporting(false)}};
 return <>
  <div className="expense-heading"><h1>Расходы</h1><p>Расходы экспедиторов и возмещение</p></div>
  <div className="expense-toolbar"><div className="expense-controls"><label className="expense-search"><Icon name="ExpenseSearch"/><input aria-label="Поиск расходов по всем колонкам" placeholder="Поиск по всем колонкам" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="expense-filter-group"><Select className="expense-select" aria-label="Экспедитор расходов" value={driver} onChange={e=>setDriver(e.target.value)}><option value="">Все экспедиторы</option>{[...new Set(expenses.map(row=>row.driverId))].map(id=><option key={id} value={id}>{expenseDriver({driverId:id},drivers)}</option>)}</Select><StatusSelect className="expense-select" aria-label="Статус расходов" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Все статусы</option>{expenseStatuses.map(s=><option key={s}>{s}</option>)}</StatusSelect><Select className="expense-select" aria-label="Тип расхода" value={type} onChange={e=>setType(e.target.value)}><option value="">Все типы расходов</option>{(classifiers?classifiers.expenseTypes.map(r=>r.name):expenseTypes).map(t=><option key={t}>{t}</option>)}</Select></div></div><Button icon="ExpenseDownload" style={{...light,marginLeft:'auto'}} disabled={exporting||!filtered.length} onClick={exportReport}>{exporting?'Готовим отчёт…':'Скачать отчёт'}</Button></div>
  <div className="expense-periods"><div className="expense-tabs" role="group" aria-label="Период расходов">{['День','3 дня','Неделя','2 недели','Месяц'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>{setPeriod(p);setRange(periodRange(p,bishkekToday()))}}>{p}</button>)}</div><div ref={anchor}><Button icon="ExpenseCalendar" aria-haspopup="dialog" aria-expanded={calendar} onClick={()=>setCalendar(!calendar)}>{range[0]?expenseDate(range[0])+' – '+expenseDate(range[1]):'За всё время'}</Button></div></div>
  {calendar&&<RangeCalendar anchor={anchor} range={range[0]?range:[bishkekToday(),bishkekToday()]} onChange={value=>{setRange(value);setPeriod('')}} onClose={()=>setCalendar(false)} Button={Button} Icon={Icon}/>}
  <div className="expense-totals" role="group" aria-label="Итоги расходов">{[['Расходов','','ExpenseSummaryReceipt'],['Ожидают','Ожидает подтверждения','ExpenseSummaryClock'],['Подтверждено','Подтвержден','ExpenseSummaryCheck'],['Возмещено','Возмещен','ExpenseSummaryWallet'],['Отказано','Отказан','ExpenseSummaryCancel']].map(([label,key,icon])=><SummaryCard key={label} label={label} value={key?money(totals[key]):totals.count} icon={icon} primary={!key}/>)}</div>
  {!mobile&&selected.length>0&&<section className="expense-selection" aria-label="Действия с выбранными расходами"><span className="expense-count">{selected.length}</span><span>Выбрано расходов</span><Button style={{background:'transparent',marginLeft:'auto'}} onClick={()=>setSelected([])}>Снять выбор</Button><ActionButtons rows={expenses} ids={selected} onAction={commit} onReject={()=>setReject([...selected])} Button={Button}/></section>}
  {!filtered.length?<div className="expense-empty"><h2>{expenses.length?'Ничего не найдено':'Расходов пока нет'}</h2><p>{expenses.length?'Измените запрос или сбросьте фильтры.':'Здесь появятся расходы, которые добавили экспедиторы.'}</p>{expenses.length>0&&<Button style={light} onClick={clear}>Сбросить фильтры</Button>}</div>:mobile?<div className="expense-mobile-list">{filtered.map(row=><button key={row.id} onClick={()=>open(row)}><span><strong className="mono">№{row.number}</strong><Status value={row.status}/></span><strong>{row.type}</strong><span>{expenseDriver(row,drivers)}</span><span><time>{expenseDate(row.date)}</time><strong className="mono">{money(row.amount)}</strong></span>{row.comment&&<p>{row.comment}</p>}</button>)}</div>:<div className="expense-table-frame"><div className="expense-scroll scroll" ref={table}><table className="expense-table" aria-label="Расходы"><colgroup>{[40,120,116,170,150,155,210,160,220,240].map((width,i)=><col key={i} style={{width}}/>)}</colgroup><thead><tr><th scope="col"><Check label="Выбрать расходы на этой странице" checked={selectable.length>0&&checked.length===selectable.length} indeterminate={checked.length>0&&checked.length<Selectable.length} disabled={!selectable.length} onChange={()=>setSelected(prev=>checked.length===selectable.length?prev.filter(id=>!selectable.some(row=>row.id===id)):[...new Set([...prev,...selectable.map(row=>row.id)])])}/></th>{['№','Дата','Экспедитор','Тип','Сумма','Статус','Район','Адрес','Комментарий'].map((h,i)=><th scope="col" key={h} className={i===4?'expense-right':''}>{h}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id} className="expense-row" data-selected={selected.includes(row.id)} onClick={()=>open(row)}><td onClick={e=>e.stopPropagation()} title={!expenseSelectable(row)?'Расход уже рассмотрен. Повторное действие недоступно.':undefined}><Check label={'Выбрать расход '+row.number} checked={selected.includes(row.id)} disabled={!expenseSelectable(row)} onChange={()=>setSelected(prev=>prev.includes(row.id)?prev.filter(id=>id!==row.id):[...prev,row.id])}/></td><td><button className="expense-link mono" aria-label={'Открыть расход '+row.number} onClick={e=>{e.stopPropagation();open(row)}}>{row.number}</button></td><td>{expenseDate(row.date)}</td><td>{expenseDriver(row,drivers)}</td><td><ClassifierValue catalog={classifiers} kind="expenseTypes" value={row.type}/></td><td className="mono expense-right">{money(row.amount)}</td><td><Status value={row.status}/></td><td>{row.district}</td><td>{row.address}</td><td><span className="expense-clamp">{row.comment||'—'}</span></td></tr>)}</tbody></table></div><div className="expense-pagination"><span>Показано {(current-1)*limit+1}–{Math.min(current*limit,filtered.length)} из {filtered.length}</span><label>Строк на странице<Select className="expense-select" aria-label="Расходов на странице" value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[5,10,20,50].map(n=><option key={n}>{n}</option>)}</Select></label><Button style={{background:'transparent'}} icon="ExpenseChevronLeft" disabled={current===1} onClick={()=>setPage(current-1)}>Назад</Button>{Array.from({length:pages},(_,i)=><Button key={i} aria-label={'Страница расходов '+(i+1)} aria-current={current===i+1?'page':undefined} style={{background:current===i+1?'#f3f2f0':'white'}} onClick={()=>setPage(i+1)}>{i+1}</Button>)}<Button style={{background:'transparent'}} disabled={current===pages} onClick={()=>setPage(current+1)}>Вперёд<Icon name="ExpenseChevronRight"/></Button></div></div>}
  {active&&route.mode==='view'&&<ExpenseSheet key={active.id} row={active} rows={expenses} drivers={drivers} onClose={()=>onRoute({mode:'list'},{parent:true})} onAction={commit} onReject={()=>setReject([active.id])} Button={Button} Icon={Icon} Modal={Modal} money={money} mobile={mobile}/>}
  {reject&&<RejectDialog ids={reject} onClose={()=>setReject(null)} onSubmit={commit} Modal={Modal} Button={Button}/>}
 </>;
}
