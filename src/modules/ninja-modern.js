'use strict';
/** PoE 1 poe.ninja price API adapter for the archived XenonTrade UI.
 * Experimental: category schemas and exchange value normalization require live verification.
 */
const https = require('https');
const BASE='https://poe.ninja/poe1/api/economy';
const ITEM_TYPES=['Wombgift','Corpse','Incubator','UniqueWeapon','UniqueArmour','UniqueAccessory','UniqueFlask','UniqueJewel','ForbiddenJewel','ShrineBelt','UniqueTincture','UniqueRelic','SkillGem','ImbuedGem','ClusterJewel','Map','BlightedMap','BlightRavagedMap','UniqueMap','ValdoMap','Invitation','Memory','IncursionTemple','ScryingOrb','BaseType','Flask','Beast','Vial'];
const EXCHANGE_TYPES=['Currency','Fragment','Runegraft','AllflameEmber','Tattoo','Omen','DjinnCoin','Ducat','EnshroudingCrystal','DivinationCard','Artifact','Oil','DeliriumOrb','Scarab','Astrolabe','Fossil','Resonator','Essence'];
function getJSON(url) {
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{'User-Agent':'XenonTrade-Community-Repair/0.1 (personal overlay)','Accept':'application/json'}},res=>{
      if(res.statusCode!==200){res.resume();return reject(new Error('poe.ninja HTTP '+res.statusCode+' for '+url));}
      let body='';res.setEncoding('utf8');
      res.on('data',x=>{body+=x;if(body.length>15000000)req.destroy(new Error('Response too large'));});
      res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});res.on('error',reject);
    });
    req.setTimeout(15000,()=>req.destroy(new Error('poe.ninja timeout')));req.on('error',reject);
  });
}
const norm=s=>String(s||'').trim().toLowerCase();
const sparkline=x=>({data:Array.isArray(x)?x:Array.isArray(x&&x.data)?x.data:[]});
function url(section,type,league){return BASE+'/'+section+'?league='+encodeURIComponent(league)+'&type='+encodeURIComponent(type);}
class NinjaModern {
  constructor(options={}){this.transport=options.transport||getJSON;this.ttl=options.ttl||900000;this.cache=new Map();this.loading=new Map();this.league=null;this.updating=false;this.complete=false;this.items=[];this.currencies=[];this.details={};this.errors=[];}
  isUpdating(){return this.updating;}
  hasData(league){return this.complete&&this.league===league;}
  getCurrencyDetails(name){return this.details[norm(name)]||{icon:''};}
  async _cached(uri){
    const v=this.cache.get(uri);
    if(v&&Date.now()-v.time<this.ttl)return v.data;
    if(this.loading.has(uri))return this.loading.get(uri);
    const p=this.transport(uri).then(data=>{this.cache.set(uri,{time:Date.now(),data});return data;}).finally(()=>this.loading.delete(uri));
    this.loading.set(uri,p);return p;
  }
  async _fetchCategory(uri,kind){
    const response=await this._cached(uri);
    if(!response||!Array.isArray(response.lines))throw new Error('Unexpected poe.ninja response: '+uri);
    if(kind==='currency'){
      (response.currencyDetails||[]).forEach(d=>{if(d.name)this.details[norm(d.name)]=d;});
      return response.lines.map(v=>Object.assign({},v,{type:'Currency'}));
    }
    if(kind==='exchange'){
      const meta=(response.core||{}).items||[];
      const entries=Array.isArray(meta)?meta:Object.keys(meta).map(id=>Object.assign({id},meta[id]));
      const byId=new Map(entries.map(v=>[String(v.id),v]));
      return response.lines.map(line=>{
        const m=byId.get(String(line.id))||{};
        return {name:m.name||line.name||line.id,icon:m.icon||'',chaosValue:Number(line.primaryValue)||0,sparkline:sparkline(line.sparkline),count:Number(line.volumePrimaryValue)||0,variant:null,links:0,source:'exchange'};
      });
    }
    return response.lines.map(v=>Object.assign({},v,{sparkline:sparkline(v.sparkLine||v.sparkline),exaltedValue:Number(v.exaltedValue)||0,chaosValue:Number(v.chaosValue)||0,count:Number(v.count||v.listingCount)||0}));
  }
  async update(options={}){
    if(this.updating)throw new Error('Update already in progress');
    this.updating=true;this.complete=false;this.errors=[];
    try{
      const leagues=await this._cached(BASE+'/leagues');
      if(!Array.isArray(leagues)||!leagues.length)throw new Error('Could not load active leagues');
      const requested=options.league;
      if(!leagues.some(l=>l.id===requested)){
        const fallback=leagues.find(l=>l.id==='Standard')||leagues[0];
        throw new Error('League "'+requested+'" not active. Choose '+fallback.id+' in settings.');
      }
      this.league=requested;this.items=[];this.currencies=[];this.details={};
      const jobs=[...['Currency','Fragment'].map(type=>({kind:'currency',url:url('stash/current/currency/overview',type,requested)})),...ITEM_TYPES.map(type=>({kind:'item',url:url('stash/current/item/overview',type,requested)})),...EXCHANGE_TYPES.map(type=>({kind:'exchange',url:url('exchange/current/overview',type,requested)}))];
      let cursor=0,successes=0;
      const worker=async()=>{while(cursor<jobs.length){const job=jobs[cursor++];try{const rows=await this._fetchCategory(job.url,job.kind);if(job.kind==='currency')this.currencies.push(...rows);else this.items.push(...rows);successes++;}catch(e){this.errors.push({url:job.url,message:e.message});}}};
      await Promise.all([worker(),worker()]);
      if(!successes||(!this.currencies.length&&!this.items.length))throw new Error('No usable poe.ninja prices returned');
      this.complete=true;
      return {league:requested,categories:successes,failed:this.errors.length,prices:this.items.length+this.currencies.length};
    }finally{this.updating=false;}
  }
  getItem(name,options={}){
    if(!this.hasData(options.league))return Promise.reject(new Error('No cached prices for league'));
    const currency=this.currencies.filter(v=>norm(v.currencyTypeName)===norm(name));
    if(currency.length)return Promise.resolve(currency);
    let hits=this.items.filter(v=>norm(v.name)===norm(name));
    if(options.baseType&&hits.length>1){const x=hits.filter(v=>norm(v.baseType)===norm(options.baseType));if(x.length)hits=x;}
    if(options.relic&&hits.length>1){const x=hits.filter(v=>v.itemClass===9||/relic/i.test(String(v.variant||'')));if(x.length)hits=x;}
    if(options.variant&&hits.length>1){const x=hits.filter(v=>norm(v.variant)===norm(options.variant));if(x.length)hits=x;}
    if(options.links&&hits.length>1){const x=hits.filter(v=>Number(v.links)===Number(options.links));if(x.length)hits=x;}
    if(!hits.length)return Promise.reject(new Error('Item not found in poe.ninja: '+name));
    hits.sort((a,b)=>(Number(b.count)||0)-(Number(a.count)||0));return Promise.resolve(hits);
  }
}
module.exports=NinjaModern;
