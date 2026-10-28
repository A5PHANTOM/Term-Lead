import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { leadId, showDialog } from '../browser-compat.js';

test('lead IDs work without crypto.randomUUID on older WebKit', () => {
 const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
 Object.defineProperty(globalThis, 'crypto', { configurable:true, value:{ getRandomValues:array=>webcrypto.getRandomValues(array) } });
 try {
  const ids = Array.from({length:100}, leadId);
  assert.equal(new Set(ids).size, 100);
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 } finally {
  if (original) Object.defineProperty(globalThis, 'crypto', original);
  else delete globalThis.crypto;
 }
});

test('modern browsers keep native modal handling', () => {
 let opened = false;
 showDialog({showModal(){opened=true;}});
 assert.equal(opened,true);
});
