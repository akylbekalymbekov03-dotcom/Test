import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingProgress,onboardingFinished} from './onboarding-model.js';
const input={drivers:[{status:'Активен',accessDemo:false,accessAt:null}],products:[{id:'product'}],employees:[{status:'Активен',role:'СЕО'}],imported:true};
test('Первый вход: 4 из 5 не открывает рабочий интерфейс и инфотуториалы',()=>{
 const progress=onboardingProgress(input);
 assert.equal(Object.values(progress).filter(Boolean).length,4);
 assert.equal(onboardingFinished(progress),false);
 const completed=onboardingProgress({...input,drivers:[{status:'Активен',accessDemo:true,accessAt:'2026-11-17'}]},progress);
 assert.equal(onboardingFinished(completed),true);
});
test('Первый вход: одна загрузка недостаточна; пустые списки не считаются завершёнными',()=>{
 const p=onboardingProgress({imported:true});assert.equal(onboardingFinished(p),false);assert.equal(p.roles,false);assert.equal(p.passwords,false);
 assert.equal(onboardingFinished({invoices:true}),false);
});
test('Первый вход: завершённые шаги сохраняются между входами и не смешиваются с прогрессом просмотра подсказок',()=>{
 const saved={drivers:true,products:true,roles:true,invoices:true,passwords:true};
 assert.equal(onboardingFinished(onboardingProgress({},saved)),true);
 assert.equal(onboardingFinished(onboardingProgress({}, {tour:true})),false);
});
