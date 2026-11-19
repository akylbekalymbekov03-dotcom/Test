import {useEffect,useState} from 'react';
export function useMobile(){
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:760px)').matches);
 useEffect(()=>{const media=window.matchMedia('(max-width:760px)'),update=()=>setMobile(media.matches);media.addEventListener('change',update);update();return()=>media.removeEventListener('change',update)},[]);
 return mobile;
}
