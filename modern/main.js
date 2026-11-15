'use strict';
const {app,BrowserWindow,ipcMain,clipboard,screen}=require('electron');
const {execFile}=require('node:child_process');
const https=require('node:https');
const path=require('node:path');
const URL_BASE='https://poe.ninja/poe1/api/economy';
const cache=new Map();
let mainWindow, league='Covens', lastText='', scanning=false, lastFocus=0;
function xcmd(...args){return new Promise(resolve=>execFile('xdotool',args,{timeout:1200},(err,stdout)=>resolve(err?'':stdout.trim())));}
function jsonGet(uri){return new Promise((resolve,reject)=>{
 const req=https.get(uri,{headers:{'User-Agent':'PoE-Overlay-X11/0.1 (personal app)','Accept':'application/json'}},res=>{
  if(res.statusCode!==200){res.resume();return reject(new Error('HTTP '+res.statusCode));}
  let data='';res.setEncoding('utf8');
  res.on('data',part=>{data+=part;if(data.length>20000000)req.destroy(new Error('Response too big'));});
  res.on('end',()=>{try{resolve(JSON.parse(data));}catch(error){reject(error);}});
 });req.setTimeout(20000,()=>req.destroy(new Error('Request timeout')));req.on('error',reject);
});}
async function cached(uri){
 const c=cache.get(uri);if(c&&Date.now()-c.timestamp<900000)return c.value;
 if(c&&c.pending)return c.pending;
 const pending=jsonGet(uri).then(value=>{cache.set(uri,{timestamp:Date.now(),value});return value;}).catch(error=>{cache.delete(uri);throw error;});
 cache.set(uri,{pending});return pending;
}
async function apiList(){return cached(URL_BASE+'/leagues');}
const categoryMap={Currency:['currency','Currency','Fragment'],Unique:['item','UniqueWeapon','UniqueArmour','UniqueAccessory','UniqueFlask','UniqueJewel','UniqueRelic','UniqueTincture','ShrineBelt','ForbiddenJewel'],Gem:['item','SkillGem','ImbuedGem'],Map:['item','Map','UniqueMap','BlightedMap','BlightRavagedMap','ValdoMap']};
function parse(text){
 if(!text.startsWith('Rarity: '))return null;
 const lines=text.split(/\r?\n/),rarity=lines[0].slice(8).trim();
 let name=(lines[1]||'').replace(/<[^>]+>/g,'').trim();
 let baseType=(lines[2]||'').replace(/<[^>]+>/g,'').trim();
 if(rarity==='Rare'){name=baseType;}
 if(!name)return null;
 const category=rarity==='Currency'?'Currency':rarity==='Unique'?'Unique':rarity==='Gem'?'Gem':/Map Tier:|Waystone Tier:/.test(text)?'Map':null;
 const sockets=(text.match(/^Sockets: (.+)$/m)||[])[1]||'';
 const links=Math.max(0,...sockets.split(' ').map(g=>g.split('-').length));
 return {name,baseType,rarity,category,links,corrupted:/^Corrupted$/m.test(text),text};
}
async function price(info){
 if(!info.category)return {error:'Pricing for this item category is not implemented in this first build.'};
 const [kind,...categories]=categoryMap[info.category];
 let results=[],failed=0;
 for(let i=0;i<categories.length;i+=3){
  const chunk=categories.slice(i,i+3);
  const answers=await Promise.all(chunk.map(type=>cached(URL_BASE+'/stash/current/'+kind+'/overview?league='+encodeURIComponent(league)+'&type='+encodeURIComponent(type)).catch(()=>null)));
  answers.forEach(res=>{if(!res||!Array.isArray(res.lines)){failed++;return;}results.push(...res.lines);});
 }
 const key=s=>String(s||'').toLocaleLowerCase('en').trim();
 let matches=results.filter(x=>key(x.name||x.currencyTypeName)===key(info.name));
 if(info.category==='Currency')return matches.length?{item:{name:info.name,chaosValue:Number(matches[0].chaosEquivalent),count:matches[0].receive?.count||matches[0].pay?.count,icon:''},failed}: {error:'No price in poe.ninja for this currency.',failed};
 if(info.baseType&&matches.length>1){const m=matches.filter(x=>key(x.baseType)===key(info.baseType));if(m.length)matches=m;}
 if(info.links>=5&&matches.length>1){const m=matches.filter(x=>Number(x.links)===info.links);if(m.length)matches=m;}
 matches.sort((a,b)=>Number(b.count||0)-Number(a.count||0));
 return matches.length?{item:matches[0],candidates:matches.slice(0,6).map(x=>({variant:x.variant,chaosValue:x.chaosValue,divineValue:x.divineValue,links:x.links,count:x.count})),failed}:{error:'Item not found in poe.ninja categories.',failed};
}
async function inspect(text){
 const info=parse(text);if(!info)return;
 mainWindow.webContents.send('checking',{info,league});
 try{mainWindow.webContents.send('result',{info,league,...await price(info)});mainWindow.showInactive();}
 catch(error){mainWindow.webContents.send('result',{info,league,error:error.message});mainWindow.showInactive();}
}
async function poll(){
 if(scanning||!mainWindow||mainWindow.isDestroyed())return;
 scanning=true;
 try{
  const wid=await xcmd('getactivewindow');
  const name=wid?await xcmd('getwindowname',wid):'';
  if(name==='Path of Exile')lastFocus=Date.now();
  const text=await clipboard.readText();
  if(typeof text!=='string')return;
  if(text!==lastText){
   lastText=text;
   if(Date.now()-lastFocus<2000 && text.startsWith('Rarity: '))await inspect(text);
  }
 }catch(error){
  console.error('[PoE Overlay] Clipboard polling failed:',error);
 }finally{scanning=false;}
}
function create(){
 mainWindow=new BrowserWindow({width:365,height:270,x:60,y:60,frame:false,resizable:true,transparent:false,alwaysOnTop:true,skipTaskbar:true,show:true,backgroundColor:'#19212d',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 mainWindow.setAlwaysOnTop(true,'floating');
 mainWindow.loadFile('index.html');
 mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
}
ipcMain.handle('leagues',()=>apiList());
ipcMain.handle('league:get',()=>league);
ipcMain.handle('league:set',async(_e,value)=>{const leagues=await apiList();if(!leagues.some(x=>x.id===value))throw new Error('Invalid league');league=value;return league;});
ipcMain.handle('window:hide',()=>mainWindow.hide());
ipcMain.handle('window:close',()=>app.quit());
ipcMain.handle('manual:check',async(_e,text)=>{
 if(typeof text!=='string')return;
 try {await inspect(text);} catch(error){console.error('[PoE Overlay] Manual check failed:',error);}
});
app.whenReady().then(()=>{
 if(process.platform!=='linux'||process.env.XDG_SESSION_TYPE==='wayland')console.error('This preview is intended for Linux X11');
 create();setInterval(()=>{void poll().catch(error=>console.error('[PoE Overlay] Polling error:',error));},300);
}).catch(error=>{console.error('[PoE Overlay] Startup failed:',error);app.quit();});
app.on('window-all-closed',()=>app.quit());
