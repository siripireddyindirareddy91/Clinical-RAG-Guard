export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
 const response=await fetch('/api'+path,{...options,credentials:'include',headers:options.body instanceof FormData?options.headers:{'Content-Type':'application/json',...options.headers}});
 if(!response.ok){let message='The request failed. Please retry.';try{const error=await response.json();message=typeof error.detail==='string'?error.detail:Array.isArray(error.detail)?error.detail.map((x:{msg:string})=>x.msg).join('; '):message;}catch{}throw new Error(message);}
 return response.json();
}
export const post=<T>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
export function percent(n:number){return Math.round(n*100)+'%';}
export function date(value:string){return new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
