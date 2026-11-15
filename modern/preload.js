'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('overlay',{
 leagues:()=>ipcRenderer.invoke('leagues'),
 currentLeague:()=>ipcRenderer.invoke('league:get'),
 setLeague:value=>ipcRenderer.invoke('league:set',value),
 check:text=>ipcRenderer.invoke('manual:check',text),
 hide:()=>ipcRenderer.invoke('window:hide'),
 close:()=>ipcRenderer.invoke('window:close'),
 onCheck:callback=>ipcRenderer.on('checking',(_e,value)=>callback(value)),
 onResult:callback=>ipcRenderer.on('result',(_e,value)=>callback(value))
});
