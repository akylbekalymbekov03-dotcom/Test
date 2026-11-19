import React from 'react';
import './guidance.css';
export function FirstSteps({progress:complete,onDrivers,onProducts,onRoles,onImport,onPasswords,Button,Icon}){
 const count=Object.values(complete).filter(Boolean).length;
 if(count===5)return null;
 const steps=[['drivers','Добавьте экспедиторов','Добавить',onDrivers],['products','Загрузите список товаров','Загрузить товары',onProducts],['roles','Назначьте роли сотрудникам','Назначить роли',onRoles],['invoices','Загрузите первый файл с накладными','Загрузить файл',onImport],['passwords','Отправьте экспедиторам пароль для входа в приложение','Отправить пароль',onPasswords]];
 return <section className="first-steps" aria-labelledby="first-steps-title"><header><div><h2 id="first-steps-title">Первые шаги</h2><p>Пять шагов, чтобы начать работу. Список скроется, когда всё будет готово.</p></div><span className="mono">{count} из 5</span></header><div role="progressbar" aria-label="Готовность кабинета" aria-valuenow={count} aria-valuemin={0} aria-valuemax={5} className="first-progress"><span style={{width:count*20+'%'}}/></div><ol>{steps.map(([id,label,action,run])=><li key={id} data-complete={complete[id]}><span className={'first-check '+(complete[id]?'done':'')} aria-label={complete[id]?'Выполнено':'Не выполнено'}>{complete[id]&&<Icon name="OnboardingCheck"/>}</span><span>{label}</span>{complete[id]?<span className="first-done">Готово</span>:<Button onClick={run} style={{marginLeft:'auto',background:'white',borderColor:'#f0efec'}}>{action}</Button>}</li>)}</ol></section>;
}
