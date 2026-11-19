export const onboardingKey='mkassa:first-steps:01204201610123:ceo';
export const onboardingTasks=['drivers','products','roles','invoices','passwords'];
export function onboardingProgress({drivers=[],products=[],employees=[],imported=false},saved={}){
 const active=drivers.filter(e=>e.status==='Активен'),staff=employees.filter(e=>e.status==='Активен');
 const current={drivers:drivers.length>0,products:products.length>0,roles:staff.length>0&&staff.every(e=>Boolean(e.role)),invoices:Boolean(imported),passwords:active.length>0&&active.every(e=>Boolean(e.accessDemo&&e.accessAt))};
 return Object.fromEntries(onboardingTasks.map(key=>[key,Boolean(current[key]||saved?.[key])]));
}
export const onboardingFinished=progress=>onboardingTasks.every(key=>progress[key]===true);
export function readOnboarding(){try{return JSON.parse(localStorage.getItem(onboardingKey)||'{}')||{}}catch{return {}}}
