// === מקור הנתונים (JSON פשוט: [{id,question,answer}])
const DATA_URL = 'questions.json';

// ⚠️ API Key בצד-לקוח הוא גלוי. לפרודקשן רצוי פרוקסי-שרת.
const API_KEY = 'AIzaSyBx3oPlQMWCjYglP0ENvWK_7uGJbh6aYqs';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// DOM
const questionText = document.getElementById('questionText');
const answerText   = document.getElementById('answerText');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const progressBar  = document.getElementById('progressBar');
const questionCounter = document.getElementById('questionCounter');

const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');

// Chat
const fabBtn       = document.getElementById('chatBtn');
const chatWindow   = document.getElementById('chatWindow');
const chatClose    = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSend     = document.getElementById('chatSend');
const loadingSpinner = document.getElementById('loadingSpinner');

// State
let allQuestions = [];
let filtered = [];
let index = 0;

const STORAGE_INDEX = 'pilot_theory_index';
const STORAGE_TERM  = 'pilot_theory_term';

// === Load
async function loadQuestions(){
  try{
    const res = await fetch(DATA_URL);
    const data = await res.json();

    // תמיכה בשני מבנים: {questions:[...]} או מערך ישירות
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.questions) ? data.questions : []);
    if (!arr.length) throw new Error('questions.json לא במבנה הנדרש');

    allQuestions = arr.map(q => ({
      id: Number(q.id),
      question: String(q.question || '').trim(),
      answer: String(q.answer || '').trim()
    }));

    const savedTerm = localStorage.getItem(STORAGE_TERM) || '';
    filtered = savedTerm ? runFilter(savedTerm) : allQuestions;
    if (savedTerm) searchInput.value = savedTerm;

    const savedIdx = Number(localStorage.getItem(STORAGE_INDEX));
    index = Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < filtered.length ? savedIdx : 0;

    render();
  }catch(err){
    console.error(err);
    questionText.textContent = 'שגיאה בטעינת השאלות (questions.json).';
  }
}

// === Render
function render(){
  if (!filtered.length){
    questionText.textContent = 'אין תוצאות.';
    answerText.textContent = '';
    updateProgress();
    return;
  }
  const q = filtered[index];
  questionText.textContent = q.question;
  answerText.textContent   = q.answer;
  updateProgress();
  persist();
}

function updateProgress(){
  const total = filtered.length;
  const pos = total ? index + 1 : 0;
  questionCounter.textContent = `שאלה ${pos} מתוך ${total}`;
  progressBar.style.width = (total ? (pos/total*100) : 0) + '%';
}

function persist(){
  localStorage.setItem(STORAGE_INDEX, String(index));
  localStorage.setItem(STORAGE_TERM, searchInput.value.trim());
}

// === Actions
function next(){ if(!filtered.length) return; index = (index + 1) % filtered.length; render(); }
function prev(){ if(!filtered.length) return; index = (index - 1 + filtered.length) % filtered.length; render(); }

function runFilter(term){
  const t = term.trim().toLowerCase();
  if (!t) return allQuestions;
  return allQuestions.filter(q =>
    q.question.toLowerCase().includes(t) ||
    q.answer.toLowerCase().includes(t)
  );
}
function runSearch(){ filtered = runFilter(searchInput.value); index = 0; render(); }

// === Keyboard nav (מכבד שדות קלט)
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (typing) return;

  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') next();
  if (e.key === 'ArrowLeft') prev();
});

// === Events
nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);
searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') runSearch(); });

// === Chat helpers
function addMsg(text, who='bot'){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (who==='user' ? 'user' : 'bot');
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = who==='user' ? '👤' : '🤖';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  wrap.appendChild(av); wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askGemini(prompt){
  const system = 'אתה עוזר תמציתי לחוקת אוויר. ענה בעברית, קצר ומדויק. אם השאלה לא קשורה לחוקה — ציין שאינך עונה.';
  const body = { contents:[
    { role:'user', parts:[{ text: system }] },
    { role:'user', parts:[{ text: prompt }] }
  ]};
  const res = await fetch(GEMINI_ENDPOINT,{
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const t = await res.text().catch(()=> '');
    throw new Error('שגיאה מה-Gemini: ' + res.status + ' ' + t);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה.';
  return cand;
}

// === Chat open/close (FAB)
function openChat(){
  chatWindow.style.display = 'flex';
  chatWindow.setAttribute('aria-hidden','false');
}
function closeChat(){
  chatWindow.style.display = 'none';
  chatWindow.setAttribute('aria-hidden','true');
}
fabBtn.addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);

// שליחה
async function sendChat(){
  const text = chatInput.value.trim();
  if(!text) return;
  addMsg(text,'user');
  chatInput.value = '';
  loadingSpinner.hidden = false;
  try{
    const reply = await askGemini(text);
    addMsg(reply,'bot');
  }catch(err){
    addMsg(err.message || 'שגיאה.','bot');
  }finally{
    loadingSpinner.hidden = true;
  }
}
chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') sendChat(); });

// Start
loadQuestions();
