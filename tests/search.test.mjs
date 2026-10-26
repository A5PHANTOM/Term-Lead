import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('typing phone digits updates results without replacing or refocusing search',()=>{
 const elements=new Map();let pageWrites=0,resultWrites=0;
 const document={querySelector(selector){if(!elements.has(selector)){let html='';elements.set(selector,{get innerHTML(){return html},set innerHTML(value){html=value;if(selector==='#app')pageWrites++;else resultWrites++;},classList:{add(){},remove(){}}});}return elements.get(selector)},querySelectorAll(){return []},createElement(name){assert.equal(name,'template');return {innerHTML:'',content:{querySelector(){return {innerHTML:'updated result'}}}}}};
 const ctx=vm.createContext({document,localStorage:{getItem(){return null}},sessionStorage:{removeItem(){}},createIcons(){},Date,setTimeout});
 let source=fs.readFileSync(new URL('../src.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^const icons=.*;$/m,'const icons={};');
 source=source.slice(0,source.indexOf('if(new URLSearchParams(location.hash'));
 vm.runInContext(source,ctx);
 const input=document.querySelector('#search');assert.equal(pageWrites,1);
 for(const value of ['9','98','987','9876','Acme'])input.oninput({target:{value}});
 assert.equal(document.querySelector('#search'),input);assert.equal(pageWrites,1);assert.equal(resultWrites,15);
 assert.ok(elements.get('#app').innerHTML.includes('<option >Busy</option>'));
});
