import {Select} from './Select';
import React,{useState} from 'react';
import {activeDrivers as defaultActiveDrivers,transferReasons as defaultTransferReasons,transferCandidates,transferable,invoiceCount} from './transfer-invoices.js';

const field={width:'100%',height:36,border:'1px solid #f7f6f4',borderRadius:8,padding:'7px 10px',fontWeight:400};
const group={border:'1px solid #f7f6f4',borderRadius:10,padding:12};
export function TransferDialog({Modal,Button,Icon,rows,selected,money,onClose,onCommit,activeDrivers=defaultActiveDrivers,transferReasons=defaultTransferReasons}){
  const initial=rows.filter(r=>selected.includes(r[0])&&transferable(r));
  const sources=[...new Set(initial.map(r=>r[4]))];
  const [from,setFrom]=useState(sources.length===1?sources[0]:'');
  const [ids,setIds]=useState(sources.length===1?initial.map(r=>r[0]):[]);
  const [to,setTo]=useState(''),[reason,setReason]=useState('');
  const candidates=transferCandidates(rows,from);
  const chosen=candidates.filter(r=>ids.includes(r[0]));
  const valid=chosen.length>0&&to&&to!==from&&reason;
  const changeFrom=value=>{setFrom(value);setIds([]);if(to===value)setTo('')};
  return <Modal title="Заменить экспедитора" compact onClose={onClose}>
    <p style={{color:'#42413d',lineHeight:'20px',marginTop:-16,marginBottom:24}}>Передаются накладные за сегодня со статусом «Ожидает оплаты»</p>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={group}>
        <label style={{display:'block',lineHeight:'20px'}}>От кого
          <Select aria-label="От кого" className="filter-select" value={from} style={{...field,marginTop:8}} onChange={e=>changeFrom(e.target.value)}>
            <option value="">Выберите текущего экспедитора</option>
            {[...new Set(rows.map(r=>r[4]))].map(name=><option key={name}>{name}</option>)}
          </Select>
        </label>
        {from&&<><p style={{fontWeight:600,lineHeight:'20px',marginTop:8}}>Накладные за сегодня · выбрано {chosen.length} из {candidates.length}</p>
          {candidates.length?<div>{candidates.map(r=><label key={r[0]} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f7f6f4',lineHeight:'20px'}}>
            <input className="filter-check" type="checkbox" aria-label={'Передать накладную '+r[0]} checked={ids.includes(r[0])} onChange={()=>setIds(prev=>prev.includes(r[0])?prev.filter(id=>id!==r[0]):[...prev,r[0]])}/>
            <span className="mono">{r[0]}</span><span title={r[2]} style={{color:'#42413d',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{r[2]}</span><span className="mono" style={{whiteSpace:'nowrap'}}>{money(r[7])}</span>
          </label>)}</div>:<p role="status" style={{color:'#42413d',lineHeight:'20px',marginTop:8}}>За сегодня нет накладных «Ожидает оплаты».</p>}
        </>}
      </div>
      <div style={{display:'flex',justifyContent:'center'}}><Icon name="TransferArrowDown"/></div>
      <div style={group}>
        <label style={{display:'block',lineHeight:'20px'}}>Кому
          <Select aria-label="Кому" className="filter-select" value={to} style={{...field,marginTop:8}} onChange={e=>setTo(e.target.value)}>
            <option value="">Выберите нового экспедитора</option>{activeDrivers.filter(name=>name!==from).map(name=><option key={name}>{name}</option>)}
          </Select>
        </label>
        <Select aria-label="Причина замены" className="filter-select" value={reason} style={{...field,marginTop:8}} onChange={e=>setReason(e.target.value)}>
          <option value="">Выберите причину</option>{transferReasons.map(value=><option key={value}>{value}</option>)}
        </Select>
      </div>
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
      <Button onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Отменить</Button>
      <Button primary disabled={!valid} onClick={()=>onCommit('replace',{ids:chosen.map(r=>r[0]),fromDriver:from,newDriver:to,reason})}>{chosen.length?'Передать '+chosen.length+' '+invoiceCount(chosen.length):'Заменить'}</Button>
    </div>
  </Modal>;
}

export function SelectedTransferDialog({Modal,Button,Icon,rows,selected,money,onClose,onCommit,activeDrivers=defaultActiveDrivers,transferReasons=defaultTransferReasons}){
  const chosen=rows.filter(r=>selected.includes(r[0]));
  const current=[...new Set(chosen.map(r=>r[4]))];
  const [to,setTo]=useState(''),[reason,setReason]=useState('');
  const valid=chosen.length>0&&chosen.length===selected.length&&chosen.every(transferable)&&to&&reason;
  const total=chosen.reduce((sum,r)=>sum+Math.round(r[7]*100),0)/100;
  const currentLabel=current.map(name=>name==='Смирнов Сергей'?'Смирнова Сергея':name==='Асанов Азамат'?'Асанова Азамата':name).join(', ');
  return <Modal title="Заменить экспедитора" compact onClose={onClose}>
    <p style={{color:'#42413d',lineHeight:'20px',marginTop:-16,marginBottom:24}}>Накладных: {chosen.length} · {money(total)} · сейчас у {currentLabel}</p>
    <label style={{display:'block',lineHeight:'20px',marginBottom:16}}>Новый экспедитор
      <Select aria-label="Новый экспедитор" className="filter-select" style={{...field,marginTop:8}} value={to} onChange={e=>setTo(e.target.value)}>
        <option value="">Выберите экспедитора</option>{activeDrivers.filter(name=>!current.includes(name)).map(name=><option key={name}>{name}</option>)}
      </Select>
    </label>
    <label style={{display:'block',lineHeight:'20px'}}>Причина замены
      <Select aria-label="Причина замены" className="filter-select" style={{...field,marginTop:8}} value={reason} onChange={e=>setReason(e.target.value)}>
        <option value="">Выберите причину</option>{transferReasons.map(value=><option key={value}>{value}</option>)}
      </Select>
    </label>
    {to&&reason&&<div role="status" style={{display:'flex',alignItems:'flex-start',gap:10,border:'1px solid #f7f6f4',borderRadius:10,padding:'12px 16px',marginTop:16,lineHeight:'20px'}}><Icon name="CircleAlert"/><div><p>Перейдут накладные: {chosen.length} · {money(total)}</p><p style={{color:'#42413d'}}>Прошлые долги останутся у прежнего экспедитора.</p></div></div>}
    {!activeDrivers.some(name=>!current.includes(name))&&<p role="alert" style={{marginTop:16,color:'#42413d',lineHeight:'20px'}}>Нет другого активного экспедитора для выбранных накладных. Выберите накладные одного экспедитора.</p>}
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}><Button onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Отменить</Button><Button primary disabled={!valid} onClick={()=>onCommit('replace',{ids:chosen.map(r=>r[0]),newDriver:to,reason})}>Заменить</Button></div>
  </Modal>;
}
