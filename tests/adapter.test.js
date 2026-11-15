'use strict';
const assert=require('assert');
const Ninja=require('../src/modules/ninja-modern');
let requests=0;
const api=new Ninja({transport:async uri=>{
  requests++;
  if(uri.endsWith('/leagues'))return [{id:'Standard',name:'Standard'}];
  if(uri.includes('/stash/current/currency/overview'))return {lines:[{currencyTypeName:'Chaos Orb',receive:{value:1,count:20}}],currencyDetails:[{name:'Chaos Orb',icon:'icon'}]};
  if(uri.includes('UniqueWeapon'))return {lines:[{name:'Test Unique',chaosValue:42,divineValue:0.1,variant:'A',links:6,count:15,sparkLine:{data:[4,5]}}]};
  return {lines:[]};
}});
(async()=>{
  await assert.rejects(api.update({league:'Delve'}),/not active/);
  await api.update({league:'Standard'});
  assert.strictEqual(api.hasData('Standard'),true);
  const found=await api.getItem('Test Unique',{league:'Standard',links:6,variant:'A'});
  assert.strictEqual(found[0].chaosValue,42);
  assert.deepStrictEqual(found[0].sparkline.data,[4,5]);
  assert.strictEqual(api.getCurrencyDetails('Chaos Orb').icon,'icon');
  const before=requests;
  await api.update({league:'Standard'});
  assert.strictEqual(before,requests,'cached requests reused');
  console.log('PASS: league, currency, item, variant, links, sparkline, cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
