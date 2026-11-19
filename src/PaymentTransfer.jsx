import {Select} from './Select';
import React,{useEffect,useId,useRef,useState} from 'react';
import {sameCounterparty} from './counterparty-model.js';
import {invoiceAmounts} from './invoice-amounts.js';
import {paymentTargets,paymentTransferReasons} from './payment-transfer.js';
import './payment-transfer.css';

function PointPicker({points,value,onChange,Icon}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const box=useRef(),search=useRef(),trigger=useRef(),id=useId();
 const options=points.filter(row=>`${row[2]} ${row[3]} ${row[5]}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
 const pick=row=>{onChange(row);setOpen(false);trigger.current?.focus()};
 useEffect(()=>{if(!open)return;search.current?.focus();const outside=e=>{if(!box.current?.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open]);
 return <div ref={box} className="pt-point-picker"><span id={id+'-label'}>{value?'Куда — точка':'Контрагент'}</span><button ref={trigger} type="button" className="pt-control pt-trigger" role="combobox" aria-labelledby={id+'-label'} aria-controls={id} aria-expanded={open} aria-haspopup="listbox" onClick={()=>{setOpen(!open);setQuery('');setActive(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setOpen(true)}}}><span className={!value?'pt-placeholder':''}>{value?`${value[2]} · SUB ${value[5]}`:'Название, адрес или SUB'}</span><Icon name="PaymentTransferChevronDown"/></button>
 {open&&<div className="pt-popover" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus()}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setActive(i=>options.length?(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length:0)}if(e.key==='Enter'&&options[active]){e.preventDefault();pick(options[active])}}}><input ref={search} role="searchbox" aria-label="Поиск точки по названию, адресу или SUB" aria-controls={id} aria-activedescendant={options[active]?id+'-'+active:undefined} placeholder="Название, адрес или SUB" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}}/><div role="listbox" id={id} aria-label="Точки для переноса оплаты">{options.map((row,i)=><button key={row[0]} id={id+'-'+i} type="button" role="option" aria-selected={!!value&&sameCounterparty(value,row)} className={active===i?'pt-active':''} onMouseEnter={()=>setActive(i)} onClick={()=>pick(row)}><span>{row[2]} · SUB {row[5]}</span><small>{row[3]}</small></button>)}{!options.length&&<p>Точка не найдена. Измените запрос.</p>}</div></div>}
 </div>;
}
export function PaymentTransferDialog({source,rows,Modal,Button,Icon,money,onClose,onSubmit}){
 const [point,setPoint]=useState(null),[targetId,setTargetId]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState('');
 const [expectedAmount]=useState(()=>invoiceAmounts(source).posted);
 const targets=paymentTargets(rows,source),points=targets.filter((row,i,all)=>all.findIndex(other=>sameCounterparty(row,other))===i);
 const invoices=point?targets.filter(row=>sameCounterparty(row,point)):[],target=invoices.find(row=>String(row[0])===targetId);
 const extra=target?Math.max(0,Math.round((invoiceAmounts(target).posted+expectedAmount-invoiceAmounts(target).original)*100)/100-invoiceAmounts(target).overpayment):0;
 return <Modal title="Перенос оплаты" drawer closeIcon="PaymentTransferClose" onClose={onClose}>
 <p className="pt-subtitle">Оплата пришла не на ту точку</p>
 <div className="pt-body"><div className="pt-source"><strong>Откуда</strong><div><span>{money(expectedAmount)}</span><span title={source[2]+' · '+source[3]}>{source[2]} · {source[3]}</span></div></div>
 <div className="pt-arrow" aria-hidden="true"><Icon name="PaymentTransferArrowDown"/></div>
 <div className="pt-fields"><PointPicker points={points} value={point} Icon={Icon} onChange={row=>{setPoint(row);setTargetId('');setError('')}}/>
 <label>Счёт<Select className="pt-control" aria-label="Счёт для переноса оплаты" disabled={!point||!invoices.length} value={targetId} onChange={e=>{setTargetId(e.target.value);setError('')}}><option value="">{!point?'Сначала выберите точку':invoices.length?'Выберите счёт':'Нет доступных счетов'}</option>{invoices.map(row=><option key={row[0]} value={String(row[0])}>{row[0]} · {money(row[7])}</option>)}</Select>{target&&extra>0&&<small role="status">На {money(extra)} больше {invoiceAmounts(target).posted>0?'остатка счёта':'счёта'} — уйдёт в переплату</small>}</label>
 <label>Причина<Select className="pt-control" aria-label="Причина переноса оплаты" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Выберите причину</option>{paymentTransferReasons.map(value=><option key={value}>{value}</option>)}</Select></label>
 </div>{!points.length&&<p className="pt-hint">Нет доступных счетов другой точки.</p>}{error&&<p role="alert" className="pt-error">{error}</p>}</div>
 <footer className="pt-footer"><Button style={{background:'white',borderColor:'#f7f6f4'}} onClick={onClose}>Отмена</Button><Button primary disabled={!target||!reason} onClick={()=>{try{onSubmit({sourceId:source[0],targetId:target[0],reason,expectedAmount})}catch(e){setError(e.message)}}}>Перенести оплату</Button></footer>
 </Modal>;
}
