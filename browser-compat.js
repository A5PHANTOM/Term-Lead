// iPhone 6 browsers use an older WebKit with no native modal dialog support.
export function showDialog(dialog) {
 if (typeof dialog.showModal === 'function') { dialog.showModal(); return; }
 const previousFocus = document.activeElement;
 const scrollX=window.pageXOffset,scrollY=window.pageYOffset;
 const previousStyle={};
 for(const key of ['overflow','position','top','left','width'])previousStyle[key]=document.body.style[key];
 const overlay = document.createElement('div');
 overlay.className = 'legacy-modal-overlay';
 document.body.appendChild(overlay);
 overlay.appendChild(dialog);
 dialog.setAttribute('open', '');
 dialog.setAttribute('role', 'dialog');
 dialog.setAttribute('aria-modal', 'true');
 dialog.setAttribute('aria-label', dialog.querySelector('h2').textContent);
 Object.assign(document.body.style,{overflow:'hidden',position:'fixed',top:`-${scrollY}px`,left:`-${scrollX}px`,width:'100%'});
 const focusable = () => Array.from(dialog.querySelectorAll('button,input,select,textarea,a[href]')).filter(el => !el.disabled);
 function onKey(event) {
  if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
  if (event.key !== 'Tab') return;
  const items = focusable(), first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
 }
 dialog.close = () => {
  dialog.removeAttribute('open');
  document.querySelector('#app').appendChild(dialog);
  overlay.remove();
  Object.assign(document.body.style,previousStyle);
  window.scrollTo(scrollX,scrollY);
  document.removeEventListener('keydown', onKey);
  if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
 };
 document.addEventListener('keydown', onKey);
 // Focus the close control without raising the keyboard over the form.
 const first = focusable()[0];
 if (first) first.focus();
}

export function leadId() {
 if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
 const bytes = crypto.getRandomValues(new Uint8Array(16));
 bytes[6] = (bytes[6] & 15) | 64;
 bytes[8] = (bytes[8] & 63) | 128;
 const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
