import {Select} from './Select';
import React, {useState} from 'react';
import {canAcceptCash,sortCashInvoices,planCashSettlement} from './batch-cash.js';

export function BatchCashDialog({initialIds=[],rows,Modal,Button,Icon,money,onClose,onSubmit}) {
 const initial=rows.filter(r=>initialIds.includes(r[0])&&canAcceptCash(r));
 const canPrefill=initial.length===initialIds.length&&initial.length>0&&new Set(initial.map(r=>r[4])).size===1;
 const [driver,setDriver]=useState(()=>canPrefill?initial[0][4]:''),[ids,setIds]=useState(()=>canPrefill?initial.map(r=>r[0]):[]),[value,setValue]=useState(()=>canPrefill?(initial.reduce((sum,r)=>sum+Math.round(r[13]*100),0)/100).toFixed(2).replace('.',','):'');
 const available=rows.filter(r=>canAcceptCash(r)&&(!initialIds.length||initialIds.includes(r[0])));
 const drivers=[...new Set(available.map(r=>r[4]))];
 const invoices=sortCashInvoices(available.filter(r=>r[4]===driver));
 const selected=invoices.filter(r=>ids.includes(r[0]));
 const pending=selected.reduce((sum,r)=>sum+Math.round(r[13]*100),0)/100;
 const compact=value.replace(/\s/g,'');
 const parsed=Number(compact.replace(',','.'));
 let plan=[],error='';
 if(value&&ids.length){
  try{if(!/^\d+(?:[.,]\d{1,2})?$/.test(compact))throw new Error('Введите сумму больше 0, не более двух знаков после запятой.');plan=planCashSettlement(rows,ids,parsed)}catch(e){error=e.message}
 }
 const valid=plan.length>0&&!error;
 const shortage=valid?Math.round((pending-parsed)*100)/100:0;
 const leftovers=plan.filter(p=>p.remainingCash>0);
 const fillAmount=next=>setValue((next.reduce((sum,r)=>sum+Math.round(r[13]*100),0)/100).toFixed(2).replace('.',','));
 return <Modal compact title="Расчёт через кассу" onClose={onClose}>
 <p style={{color:'#42413d',lineHeight:'20px',marginTop:-16,marginBottom:24}}>{driver?`${driver} сдаёт наличные по накладным`:'Выберите экспедитора, покажем его накладные с несданными наличными'}</p>
 <label style={{fontWeight:600}}>Экспедитор<Select className="filter-select" aria-label="Экспедитор для расчёта" value={driver} onChange={e=>{const name=e.target.value;setDriver(name);const next=sortCashInvoices(available.filter(r=>r[4]===name));setIds(next.map(r=>r[0]));if(name)fillAmount(next);else setValue('')}} style={{display:'block',width:'100%',height:36,border:'1px solid #f7f6f4',borderRadius:8,padding:'7px 10px',fontWeight:400,marginTop:8}}><option value="">Выберите экспедитора</option>{drivers.map(name=><option key={name}>{name}</option>)}</Select></label>
 {!available.length&&<p style={{color:'#42413d',marginTop:16,lineHeight:'20px'}}>Все наличные уже приняты. Накладных для расчёта нет.</p>}
 {driver&&<>
 <div style={{padding:'12px 16px',background:'#f3f2f0',borderRadius:14,margin:'12px 0'}}><p style={{color:'#42413d',lineHeight:'20px',marginBottom:4}}>Должен сдать в кассу</p><p className="mono">{money(pending)}</p></div>
 <div style={{maxHeight:'34vh',overflowY:'auto'}}>{invoices.map(r=><label key={r[0]} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0',borderBottom:'1px solid #f7f6f4',lineHeight:'20px'}}><input type="checkbox" className="filter-check" aria-label={'Принять по накладной '+r[0]} checked={ids.includes(r[0])} onChange={()=>{const nextIds=ids.includes(r[0])?ids.filter(id=>id!==r[0]):[...ids,r[0]];setIds(nextIds);fillAmount(invoices.filter(r=>nextIds.includes(r[0])))}}/><span className="mono">{r[0]}</span><span style={{color:'#42413d'}}>{r[1]}</span><span className="mono" style={{marginLeft:'auto'}}>{money(r[13])}</span></label>)}</div>
 <label style={{display:'block',marginTop:16,fontWeight:600}}>Сколько сдал экспедитор<input aria-label="Сколько сдал экспедитор" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} style={{display:'block',fontWeight:400,width:'100%',background:'#f7f6f4',border:'1px solid #f7f6f4',borderRadius:8,padding:'9px 10px',marginTop:8}}/></label>
 {(error||shortage>0)&&<div role="alert" style={{display:'flex',gap:10,border:'1px solid #f7f6f4',borderRadius:10,padding:'12px 16px',marginTop:12,color:'#e7000b',lineHeight:'20px'}}><span style={{paddingTop:2}}><Icon name="CashAlert"/></span><div>{error?<p>{error}</p>:<><p>Не хватает {money(shortage)}</p><p>{leftovers.map(p=>`${money(p.remainingCash)} по накладной ${p.id}`).join('; ')} останутся у экспедитора.</p></>}</div></div>}
 </>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}><Button onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Отменить</Button><Button primary disabled={!valid} onClick={()=>onSubmit(ids,parsed)}>Принять{valid?' '+money(parsed):''}</Button></div>
 </Modal>;
}
