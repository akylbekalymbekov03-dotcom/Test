import React from 'react';
import {AnimatedValue} from './interface-motion';
import './summary-card.css';

export function SummaryCard({label,value,icon,primary=false,delay=0}){
 return <article className={'summary-card enter'+(primary?' summary-card-primary':'')} style={{animationDelay:delay+'ms'}}>
  <div className="summary-card-heading"><span>{label}</span>{icon&&<span className="summary-card-icon" aria-hidden="true"><img src={'/assets/'+icon+'.svg'} alt=""/></span>}</div>
  <div className="summary-card-value mono"><AnimatedValue value={value}/></div>
 </article>;
}
