import React from 'react';
import './history-marker.css';

export function HistoryMarker({Icon,name='HistoryDot',line=false}){
 return <span className="history-timeline-marker" aria-hidden="true"><Icon name={name}/>{line&&<span className="history-timeline-line"/>}</span>;
}
