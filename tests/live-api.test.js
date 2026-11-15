'use strict';
// Live API smoke test: three lightweight GETs; does not install dependencies.
const https = require('node:https');
const assert = require('node:assert/strict');
const root='https://poe.ninja/poe1/api/economy';
function get(url){return new Promise((resolve,reject)=>{
 const request=https.get(url,{headers:{'User-Agent':'poe_overlay smoke test (GitHub: bybaleh/poe_overlay)','Accept':'application/json'}},res=>{
   if(res.statusCode!==200){res.resume();return reject(new Error('HTTP '+res.statusCode+' '+url));}
   let raw='';res.setEncoding('utf8');
   res.on('data',chunk=>{raw+=chunk;if(raw.length>20000000)request.destroy(new Error('Response too large'));});
   res.on('end',()=>{try{resolve(JSON.parse(raw));}catch(error){reject(error);}});
 });request.setTimeout(20000,()=>request.destroy(new Error('Timeout')));request.on('error',reject);
});}
(async()=>{
 const leagues=await get(root+'/leagues');
 assert.ok(Array.isArray(leagues)&&leagues.length,'Expected active league array');
 const wanted=process.argv[2]||leagues[0].id;
 assert.ok(leagues.some(l=>l.id===wanted),'Unknown league '+wanted);
 console.log('League:',wanted);
 const item=await get(root+'/stash/current/item/overview?league='+encodeURIComponent(wanted)+'&type=UniqueWeapon');
 assert.ok(Array.isArray(item.lines),'Missing item lines');
 const sample=item.lines.find(i=>i.name&&Number.isFinite(i.chaosValue));
 assert.ok(sample,'No priced unique weapon found');
 console.log('UniqueWeapon:',JSON.stringify({name:sample.name,variant:sample.variant,chaosValue:sample.chaosValue,divineValue:sample.divineValue,count:sample.count}));
 const currency=await get(root+'/stash/current/currency/overview?league='+encodeURIComponent(wanted)+'&type=Currency');
 assert.ok(Array.isArray(currency.lines),'Missing currency lines');
 const c=currency.lines.find(i=>i.currencyTypeName);
 assert.ok(c,'No currency name found');
 console.log('Currency:',JSON.stringify({name:c.currencyTypeName,chaosEquivalent:c.chaosEquivalent,receive:c.receive}));
 console.log('PASS: real poe.ninja endpoints and data shapes');
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
