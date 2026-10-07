const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let history = JSON.parse(localStorage.getItem("dsaHistory") || "[]");
let count = Number(localStorage.getItem("dsaCount") || 0);

async function loadConfig(){
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.model) $("#modelBadge").textContent = `Gemini ${data.model.replace('gemini-', '').replace('-flash', ' Flash')}`;
  } catch (error) {
    $("#modelBadge").textContent = 'Gemini model unavailable';
  }
}

function renderMarkdownish(text){
  const renderer = typeof window !== 'undefined' && window.answerRenderer;
  return renderer ? renderer.renderMarkdownish(text) : String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function updateCount(){
  $("#questionCount").textContent = count;
  $("#modalCount").textContent = count;
  localStorage.setItem("dsaCount", count);
}

function saveHistory(question, answer){
  history.unshift({question, answer, time:new Date().toLocaleString()});
  history = history.slice(0, 20);
  localStorage.setItem("dsaHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory(){
  const el = $("#historyList");
  if(!history.length){el.innerHTML='<div class="panel"><p style="color:#8493aa">No questions yet. Ask your first DSA question from the Dashboard.</p></div>';return;}
  el.innerHTML = history.map((x,i)=>`<div class="history-item" data-index="${i}"><b>${escapeHtml(x.question)}</b><small>${x.time}</small></div>`).join("");
  $$(".history-item").forEach(item=>item.onclick=()=>{
    const x=history[Number(item.dataset.index)];
    $("#question").value=x.question;
    $("#answerPanel").classList.remove("hidden");
    $("#answer").innerHTML=renderMarkdownish(x.answer);
    showPage("dashboard");
    window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
  });
}

function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function showPage(id){
  $$(".page").forEach(p=>p.classList.remove("active-page"));
  $("#"+id).classList.add("active-page");
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  window.scrollTo({top:0,behavior:"smooth"});
}

async function askQuestion(questionOverride){
  const question=(questionOverride || $("#question").value).trim();
  if(!question){$("#question").focus();return;}
  const btn=$("#askBtn");
  btn.disabled=true;btn.innerHTML='Thinking <span>…</span>';
  $("#answerPanel").classList.remove("hidden");
  $("#answer").innerHTML='<p style="color:#8292ab">🤖 Instructor is preparing a beginner-friendly explanation...</p>';
  try{
    const res=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Request failed');
    $("#answer").innerHTML=renderMarkdownish(data.answer);
    count++;updateCount();saveHistory(question,data.answer);
  }catch(err){
    $("#answer").innerHTML=`<p style="color:#ff9a9a"><strong>Could not get an answer.</strong><br>${escapeHtml(err.message)}</p><p style="color:#8292ab">Your UI is working. If Gemini is temporarily busy, try again later.</p>`;
  }finally{btn.disabled=false;btn.innerHTML='Ask Instructor <span>→</span>';}
}

$$('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$$('.topic').forEach(b=>b.onclick=()=>{ $("#question").value=`Teach me ${b.textContent.replace('›','').trim()} from zero with C++ code, a dry run, and time and space complexity.`; showPage('dashboard'); $("#question").focus(); });
$$('.quick-grid button').forEach(b=>b.onclick=()=>askQuestion(b.dataset.prompt));
$("#askBtn").onclick=()=>askQuestion();
$("#question").addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')askQuestion();});
$("#copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("#answer").innerText);$("#copyBtn").textContent='Copied!';setTimeout(()=>$("#copyBtn").textContent='Copy',1200)};
$("#clearHistory").onclick=()=>{history=[];localStorage.removeItem('dsaHistory');renderHistory();};

function toggleTheme(){document.body.classList.toggle('light');localStorage.setItem('dsaTheme',document.body.classList.contains('light')?'light':'dark');}
$("#themeBtn").onclick=toggleTheme;$("#themeBtn2").onclick=toggleTheme;
if(localStorage.getItem('dsaTheme')==='light')document.body.classList.add('light');

$("#profileBtn").onclick=()=>$("#profileModal").classList.remove('hidden');
$("#closeModal").onclick=()=>$("#profileModal").classList.add('hidden');
$("#profileModal").onclick=e=>{if(e.target.id==='profileModal')$("#profileModal").classList.add('hidden')};

const tutorials=[
 ['Arrays','Foundations','Learn traversal, prefix sums, frequency counting and two pointers.'],
 ['Binary Search','Searching','Master sorted-array search, answer-space search and common templates.'],
 ['Sliding Window','Patterns','Learn fixed and variable windows with subarray problems.'],
 ['Recursion','Foundations','Understand base cases, recursive calls and call-stack dry runs.'],
 ['Trees & BST','Trees','Learn traversals, height, search and common interview patterns.'],
 ['Graphs','Advanced','BFS, DFS, visited arrays and shortest-path foundations.'],
 ['Dynamic Programming','Advanced','Learn state, transition, base cases and memoization step by step.'],
 ['Stacks & Queues','Data Structures','Practice monotonic stacks, queues and classic patterns.'],
 ['Linked Lists','Data Structures','Pointers, reversal, fast/slow pointer and cycle detection.']
];
$("#tutorialGrid").innerHTML=tutorials.map(t=>`<div class="tutorial"><span class="tag">${t[1].toUpperCase()}</span><h3>${t[0]}</h3><p>${t[2]}</p><button class="ghost-btn" data-tutorial="${t[0]}">Learn with AI →</button></div>`).join('');
$$('[data-tutorial]').forEach(b=>b.onclick=()=>{showPage('dashboard');askQuestion(`Teach me ${b.dataset.tutorial} from absolute beginner level with intuition, C++ code, dry run, time complexity, space complexity, common mistakes, and one practice question.`)});

const prompts={Easy:['Find the largest element in an array without using sort.','Check whether a string is a palindrome.','Implement binary search on a sorted array.'],Medium:['Find the longest subarray with sum K.','Detect a cycle in a linked list.','Find the next greater element using a stack.'],Hard:['Find the length of the longest valid parenthesis substring.','Design an LRU cache and explain the data structures.','Solve a graph shortest-path problem and compare approaches.']};
$("#randomProblem").onclick=()=>{const arr=prompts[$("#difficulty").value];$("#problemPrompt").textContent=arr[Math.floor(Math.random()*arr.length)];};
updateCount();renderHistory();loadConfig();
