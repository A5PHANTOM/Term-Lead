// Render the existing Lucide icon data without newer Array APIs. Icons must
// never prevent the calling screen from binding its buttons and forms.
const namespace='http://www.w3.org/2000/svg';
function node([tag,attributes,children=[]]) {
 const element=document.createElementNS(namespace,tag);
 Object.keys(attributes).forEach(key=>element.setAttribute(key,String(attributes[key])));
 children.forEach(child=>element.appendChild(node(child)));
 return element;
}
export function createIcons({icons}) {
 document.querySelectorAll('i[data-lucide]').forEach(placeholder=>{
  const name=placeholder.getAttribute('data-lucide');
  const key=name.replace(/(^|-)([a-z0-9])/g,(_,separator,letter)=>letter.toUpperCase());
  const definition=icons[key];
  if(!definition)return;
  const svg=node(definition);
  Array.from(placeholder.attributes).forEach(attr=>svg.setAttribute(attr.name,attr.value));
  svg.setAttribute('class',`lucide lucide-${name} ${placeholder.getAttribute('class')||''}`.trim());
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  placeholder.parentNode.replaceChild(svg,placeholder);
 });
}
