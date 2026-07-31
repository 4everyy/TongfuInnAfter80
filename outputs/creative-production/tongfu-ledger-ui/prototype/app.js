const tabs=[...document.querySelectorAll('[data-tab]')];
const panels=[...document.querySelectorAll('[data-panel]')];
const dialogue=document.getElementById('dialogue');
const player=document.getElementById('player');
let playerX=160;
function selectTab(id){tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===id));panels.forEach(p=>p.classList.toggle('active',p.dataset.panel===id));}
tabs.forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
function talk(){dialogue.hidden=false;}
['interactBtn','contextTalk','ledgerTalk'].forEach(id=>document.getElementById(id)?.addEventListener('click',talk));
document.getElementById('nextDialogue').addEventListener('click',()=>{const text=document.getElementById('dialogueText');if(text.dataset.next){dialogue.hidden=true;text.dataset.next='';text.textContent='展堂，你先别急着往镇东跑。账本上的墨还没干，这事儿不简单。';}else{text.textContent='先去问问街口卖茶的，再回来同额商量。记得，莫要打坏客栈里的桌椅。';text.dataset.next='1';}});
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{player.querySelector('span').textContent=b.dataset.role;document.querySelectorAll('[data-role]').forEach(x=>x.classList.toggle('selected',x===b));selectTab('explore');}));
const joy=document.getElementById('joystick'),stick=document.getElementById('stick');let origin=null;
function move(dx){playerX=Math.max(112,Math.min(210,playerX+dx));player.style.left=playerX+'px';}
joy.addEventListener('pointerdown',e=>{origin=e.clientX;joy.setPointerCapture(e.pointerId)});
joy.addEventListener('pointermove',e=>{if(origin===null)return;const dx=Math.max(-25,Math.min(25,e.clientX-origin));stick.style.transform=`translateX(${dx}px)`;move(dx*.08)});
joy.addEventListener('pointerup',()=>{origin=null;stick.style.transform='translateX(0)'});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')move(-8);if(e.key==='ArrowRight'||e.key==='d')move(8);if(e.key==='e')talk()});
