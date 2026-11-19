import React, {useRef, useState} from 'react';
import {importInvoices} from './import-invoices';
import {invoiceSelectionActions} from './invoice-selection.js';

const field={width:'100%',height:36,marginTop:8,border:'1px solid #f7f6f4',borderRadius:8,padding:'7px 10px',fontWeight:400};
const paragraph={color:'#42413d',lineHeight:'20px'};
const footer={display:'flex',justifyContent:'flex-end',gap:8,marginTop:24};
export function WorkflowDialogs({kind,Modal,Button,Icon,rows,selected,columns,money,onClose,onCommit,onImported,onBusy}) {
  const [file,setFile]=useState(null),[uploadState,setUploadState]=useState('idle'),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
  const picker=useRef(null), busy=uploadState==='loading';
  const chosen=rows.filter(r=>selected.includes(r[0]));
  const eligible=invoiceSelectionActions(rows,selected).transfer;
  const pick=f=>{setFile(f||null);setError('');setUploadState('idle')};
  const upload=async()=>{
    if(!file||busy)return;
    setUploadState('loading');setError('');onBusy(true);
    try {
      const incoming=await importInvoices(file,columns,rows);
      onImported(incoming);
    } catch(e) {
      setUploadState('error');setError(e.message?.includes('Строка')||e.message?.includes('Накладная')||e.message?.includes('файле')||e.message?.includes('колонки')?e.message:'Проверьте файл и попробуйте ещё раз. Если ошибка повторится, обратитесь к администратору.');
    } finally {onBusy(false)}
  };
  const alert=(title,description,destructive=false)=><div role={destructive?'alert':'status'} style={{display:'flex',gap:10,border:'1px solid #f7f6f4',borderRadius:10,padding:'12px 16px',marginTop:16,lineHeight:'20px',color:destructive?'#e7000b':undefined}}><span style={{paddingTop:2,filter:destructive?'invert(19%) sepia(97%) saturate(6071%) hue-rotate(347deg) brightness(86%) contrast(123%)':undefined}}><Icon name="CircleAlert"/></span><div><p>{title}</p><p style={{color:destructive?'inherit':'#42413d'}}>{description}</p></div></div>;
  return <Modal title={kind==='return'?chosen.length===1?'Оформить возврат по накладной?':`Оформить возврат по ${chosen.length} накладным?`:'Загрузить накладные'} compact width={kind==='return'?480:undefined} alert={kind==='return'} onClose={()=>{if(!busy)onClose()}} busy={busy}>
    {kind==='return'&&<><p style={{...paragraph,marginTop:-16}}>Все товары вернутся, долг по ним снимется с экспедитора.</p><div style={footer}><Button onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Не возвращать</Button><Button disabled={!eligible} style={{background:'rgba(231,0,11,.1)',color:'#e7000b'}} onClick={()=>onCommit('return')}>Оформить возврат</Button></div></>}
    {kind==='upload'&&<>
      <p style={{...paragraph,marginTop:-16,marginBottom:24}}>Выберите файл с накладными из учётной системы.</p>
      <input ref={picker} aria-label="Файл с накладными" type="file" accept=".xlsx" style={{display:'none'}} onChange={e=>pick(e.target.files[0])}/>
      <div onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy)pick(e.dataTransfer.files[0])}} style={{border:'1px solid '+(dragging?'#42413d':'#f7f6f4'),background:dragging?'#f3f2f0':'#fdfdfc',borderRadius:14,padding:32,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
        <p style={{lineHeight:'20px',maxWidth:'100%',overflowWrap:'anywhere'}}>{file?file.name:'Перетащите файл сюда'}</p>{!file&&<p style={paragraph}>или выберите файл на компьютере</p>}
        <Button disabled={busy} onClick={()=>picker.current.click()} style={{background:'white',borderColor:'#f7f6f4'}}>{file?'Выбрать другой файл':'Выбрать файл'}</Button>
      </div>
      {busy&&alert('Загрузка накладных…','Дождитесь завершения загрузки.')}
      {uploadState==='error'&&alert('Не удалось загрузить файл',error,true)}
      <div style={footer}><Button disabled={busy} onClick={onClose} style={{background:'white',borderColor:'#f7f6f4'}}>Отменить</Button><Button primary disabled={!file||busy} onClick={upload}>{busy&&<span className="spinner"><Icon name="LoaderCircle"/></span>}{uploadState==='error'?'Повторить':'Загрузить'}</Button></div>
    </>}
  </Modal>;
}
