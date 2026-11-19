import {InvoiceGoods} from './InvoiceGoods';
import {invoiceChangeAmount,itemChangeSummary} from './invoice-item-changes.js';
import {HistoryMarker} from './HistoryMarker';
import {SummaryCard} from './SummaryCard';
import {HistoryStatusText} from './HistoryStatusText';
import React, {useEffect,useState} from 'react';
import {invoiceAmounts} from './invoice-amounts.js';
import {useMobile} from './use-mobile.js';
import {invoiceProducts} from './invoice-products.js';
import {historyForInvoice} from './invoice-history.js';
import {transferable} from './transfer-invoices.js';

const dayFormat=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Bishkek',day:'numeric',month:'long',year:'numeric'});
const timeFormat=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Bishkek',hour:'2-digit',minute:'2-digit'});
const panel={background:'#f3f2f0',borderRadius:14,border:'1px solid #f7f6f4',padding:'20px 24px',minWidth:0};
function Field({label,children,mono=false}){return <div className="invoice-field"><dt>{label}</dt><dd className={mono?'mono':''}>{children||'—'}</dd></div>}


export function InvoiceDetails({row,history,Button,Badge,Icon,money,onCash,onReplace,onCounterparty,canMovePayment=false,onMovePayment,historyRequest=0,itemsOverride,itemChanges={},onItemChange,Modal}){
 const [tab,setTab]=useState('invoice');
 useEffect(()=>{if(historyRequest)setTab('history')},[historyRequest]);
 const mobile=useMobile();
 const a=invoiceAmounts(row);
 const [day,month,year]=row[1].split('.').map(Number);
 const date=new Date(Date.UTC(year,month-1,day,6));
 const events=historyForInvoice(row[0],history);
 const groups=Object.groupBy(events,e=>dayFormat.format(new Date(e.timestamp)).replace(/ г\.$/,''));
 const items=itemsOverride||invoiceProducts[row[0]];
 return <>
 <style>{`.invoice-data-card{background:#fdfdfc;border:1px solid #f7f6f4;border-radius:14px;padding:24px;min-width:0}.invoice-data-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}.invoice-data-heading h2{font-size:18px;line-height:24px;font-weight:600}.invoice-data-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));column-gap:24px;row-gap:24px;margin:0}.invoice-field{min-width:0;line-height:20px}.invoice-field dt{color:#42413d;margin:0 0 4px}.invoice-field dd{margin:0;font-weight:500;overflow-wrap:anywhere}.invoice-data-card [data-badge-tone="neutral"],.invoice-data-card [data-badge-tone="cancelled"]{background:white!important}@media(max-width:1100px){.invoice-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:1100px){.invoice-money{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:520px){.invoice-heading{flex-wrap:wrap}.invoice-data-grid{grid-template-columns:1fr!important}.invoice-data-card{padding:20px!important}.history-event{grid-template-columns:40px 12px minmax(0,1fr)!important}.history-amount{grid-column:3!important;text-align:left!important}}`}</style>
 <div className="invoice-heading enter" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,minHeight:64}}><div><h1>Накладная №{row[0]}</h1><p style={{marginTop:8,color:'#42413d',lineHeight:'20px'}}>{row[2]} · {dayFormat.format(date).replace(/ г\.$/,'')}</p></div>{!mobile&&canMovePayment&&<Button icon="PaymentTransferAction" style={{background:'white',borderColor:'#f7f6f4',marginLeft:'auto'}} onClick={onMovePayment}>Перенести оплату</Button>}{!mobile&&transferable(row)&&<Button icon="Repeat" onClick={onReplace}>Заменить экспедитора</Button>}{!mobile&&a.cash>0&&!['Возврат','Отменен'].includes(row[10])&&<Button primary icon="Banknote" onClick={onCash}>Расчёт через кассу</Button>}</div>
 {!mobile&&<div role="tablist" aria-label="Детали накладной" style={{display:'inline-flex',alignSelf:'flex-start',background:'#f3f2f0',borderRadius:8,padding:3}}>{[['invoice','Поставка'],['history','История']].map(([key,label])=><Button key={key} role="tab" id={'invoice-tab-'+key} aria-selected={tab===key} aria-controls="invoice-tabpanel" tabIndex={tab===key?0:-1} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'invoice':e.key==='End'?'history':tab==='invoice'?'history':'invoice';setTab(next);document.getElementById('invoice-tab-'+next)?.focus()}}} onClick={()=>setTab(key)} style={{minHeight:30,padding:'5px 10px',background:tab===key?'white':'transparent',boxShadow:tab===key?'0 1px 3px #0001':'none'}}>{label}</Button>)}</div>}
 <div className="invoice-money" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:16}}>{[['Сумма к оплате',a.original,'','SummaryBanknote'],['Оплачено',a.posted,'','SummaryCheck'],['Наличные у экспедитора',a.cash,'#441306','SummaryWallet'],['Долг магазина',a.storeDebt,row[10]==='Долг'?'#e7000b':'','SummaryAlert']].map(([label,value,color,icon],i)=><SummaryCard key={label} label={label} value={money(value)} icon={icon} primary={i===0}/>)}</div>
 <section id="invoice-tabpanel" role="tabpanel" aria-labelledby={mobile?undefined:'invoice-tab-'+tab} style={{display:'flex',flexDirection:'column',gap:24}}>
 {mobile||tab==='invoice'?<>
 <section className="invoice-data-card" aria-labelledby="invoice-data-title"><div className="invoice-data-heading"><h2 id="invoice-data-title">Данные поставки</h2><Badge row={row}/></div><dl className="invoice-data-grid"><Field label="Номер счёта" mono>{row[0]}</Field><Field label="Дата">{row[1]}</Field><Field label="Контрагент"><a href={'#counterparties/'+encodeURIComponent(row[0])} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onCounterparty()}}}>{row[2]}</a></Field><Field label="Адрес">{row[3]}</Field><Field label="Экспедитор">{row[4]}</Field><Field label="SUB код" mono>{row[5]}</Field><Field label="Тип оплаты">{row[6]}</Field><Field label="Утерянные/повреждённые/возвраты">{itemChangeSummary(itemChanges)||row[14]}</Field><Field label="Комментарий">{row[11]}</Field>{a.overpayment>0&&<Field label="Переплата" mono>{money(a.overpayment)}</Field>}</dl></section>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><h2 style={{fontSize:16,lineHeight:'24px'}}>Товары по накладной</h2>{items&&invoiceChangeAmount(items,itemChanges)>0&&<p style={{color:'#42413d'}}>Сумма изменений: <span className="mono">{money(invoiceChangeAmount(items,itemChanges))}</span></p>}</div>
 <InvoiceGoods items={items} changes={itemChanges} row={row} Button={Button} Modal={Modal} money={money} mobile={mobile} onSave={onItemChange}/>

 </>:<section style={panel}><h2 style={{fontSize:18,lineHeight:'28px',marginBottom:16}}>История изменений</h2>{events.length?Object.entries(groups).map(([date,entries],groupIndex)=><div key={date} style={{marginTop:groupIndex===0?0:16,paddingTop:groupIndex===0?0:16,borderTop:groupIndex===0?'none':'1px solid #d1d5db'}}><h3 style={{fontSize:14,fontWeight:600,color:'#42413d',lineHeight:'20px',margin:0}}>{date}</h3>{entries.map((event,i)=><div className="history-event" key={event.timestamp+'-'+i} style={{display:'grid',gridTemplateColumns:'48px 12px minmax(0,1fr) 140px',gap:12,alignItems:'start',paddingTop:i===0?10:0,paddingBottom:i===entries.length-1?0:16}}><time style={{textAlign:'right',lineHeight:'20px',color:'#42413d'}}>{timeFormat.format(new Date(event.timestamp))}</time><HistoryMarker Icon={Icon} name={event.marker||'HistoryDot'} line={i<entries.length-1||Boolean(event.description||event.from&&event.to)}/><div style={{lineHeight:'20px'}}><p style={{display:'flex',gap:8,flexWrap:'wrap'}}><strong style={{fontWeight:600}}><HistoryStatusText>{event.event}</HistoryStatusText></strong><span style={{color:'#42413d'}}>{event.author}</span></p>{event.description&&<p style={{marginTop:2}}><HistoryStatusText>{event.description}</HistoryStatusText></p>}{event.from&&event.to&&<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginTop:2}}>{event.event==='Статус'?<><Badge row={{10:event.from,12:0}}/><span style={{color:'#42413d'}}>→</span><Badge row={{10:event.to==='Долг магазина'?'Долг':event.to,12:event.to==='Долг магазина'?1:0}}/></>:<span>{event.from} → {event.to}</span>}</div>}{event.reason&&<p style={{marginTop:2,color:'#42413d'}}>{event.reason}</p>}</div>{event.amount!=null&&<p className="mono history-amount" style={{textAlign:'right',lineHeight:'20px'}}>{money(event.amount)}</p>}</div>)}</div>):<p style={{color:'#42413d',padding:'20px 0'}}>История пока пуста</p>}</section>}
 </section>
 </>;
}

export function CashDialog({row,Modal,Button,Icon,money,onClose,onSubmit,documentLabel='Накладная',allowSplit=false,compactResult=false,closeIcon='X'}){
 const a=invoiceAmounts(row);
 const [value,setValue]=useState(()=>new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(a.cash));
 const [split,setSplit]=useState(false),[nonCash,setNonCash]=useState('0,00');
 const compact=value.replace(/\s/g,'');
 const parsed=Number(compact.replace(',','.'));
 const otherText=nonCash.replace(/\s/g,''),other=split?Number(otherText.replace(',','.')):0,total=Math.round((parsed+other)*100)/100;
 const valid=/^\d+(?:[.,]\d{1,2})?$/.test(compact)&&Number.isFinite(parsed)&&parsed>=0&&(!split||/^\d+(?:[.,]\d{1,2})?$/.test(otherText)&&Number.isFinite(other)&&other>=0)&&Number.isFinite(total)&&total>0;
 let message='Введите сумму больше нуля';
 if(valid){
   if(total<a.cash)message=`${money(Math.round((a.cash-total)*100)/100)} останутся у экспедитора`;
   else if(total===a.cash)message='Наличные закроются полностью';
   else if(total<=a.debt)message=`${money(Math.round((total-a.cash)*100)/100)} уйдут в счёт долга магазина`;
   else message=`Переплата ${money(Math.round((total-a.debt)*100)/100)} `+(allowSplit?'будет учтена по этой продаже':'засчитается магазину в следующий раз');
 }else if(compact&&parsed!==0)message='Введите сумму больше нуля, не более двух знаков после запятой';
 return <Modal title="Расчёт через кассу" closeIcon={closeIcon} compact onClose={onClose}>
 <p style={{color:'#42413d',lineHeight:'20px',marginTop:-16,marginBottom:24}}>{documentLabel} №{row[0]} · {row[4]}</p>
 <label style={{display:'block',lineHeight:'20px'}}>Сколько сдал экспедитор · из {money(a.cash)}<input autoFocus aria-label="Сколько сдал экспедитор" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} style={{display:'block',width:'100%',height:36,border:'1px solid #f7f6f4',background:'#f7f6f4',borderRadius:8,padding:'7px 10px',marginTop:8}}/></label>
 {allowSplit&&<Button onClick={()=>setSplit(v=>!v)} style={{marginTop:12,padding:'4px 0',minHeight:28,background:'transparent',fontSize:12}}>{split?'Убрать безналичную часть':'Добавить безналичную часть'}</Button>}
 {allowSplit&&split&&<label style={{display:'block',lineHeight:'20px',marginTop:12}}>Безналичная часть<input aria-label="Безналичная часть" inputMode="decimal" value={nonCash} onChange={e=>setNonCash(e.target.value)} style={{display:'block',width:'100%',height:36,border:'1px solid #f7f6f4',background:'#f7f6f4',borderRadius:8,padding:'7px 10px',marginTop:8}}/></label>}
 {(!compactResult||!valid||total!==a.cash)&&<div role="status" style={{display:'flex',gap:10,alignItems:'flex-start',border:'1px solid #f7f6f4',borderRadius:10,padding:'12px 16px',marginTop:16,lineHeight:'18px'}}><Icon name="CircleAlert"/><p>{message}</p></div>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}><Button onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Отменить</Button><Button primary disabled={!valid} onClick={()=>onSubmit(parsed,other)}>{valid?'Принять '+money(total):'Принять наличные'}</Button></div>
 </Modal>;
}
