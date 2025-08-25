// === מקור נתונים (JSON: {questions:[...]} או מערך ישיר) ===
const DATA_URL = 'questions.json';

// ⚠️ מפתח ציבורי: בצד-לקוח הוא גלוי. לפרודקשן – מומלץ פרוקסי-שרת.
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
const pageInput    = document.getElementById('pageInput');
const goToBtn      = document.getElementById('goToBtn');

// Explanation elements
const explanationBtn = document.getElementById('explanationBtn');
const explanationDiv = document.getElementById('explanation');
const explanationText = document.getElementById('explanationText');
const explanationSource = document.getElementById('explanationSource');

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

// == Load
async function loadQuestions(){
  try{
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data?.questions ?? []);
    if (!Array.isArray(arr) || !arr.length) throw new Error('questions.json לא במבנה הנדרש');

    allQuestions = arr.map(q => ({
      id: Number(q.id),
      question: String(q.question ?? '').trim(),
      answer: String(q.answer ?? '').trim(),
      explanation: String(q.explanation ?? '').trim(),
      source: String(q.source ?? '').trim()
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

// == Render
function render(){
  if (!filtered.length){
    questionText.textContent = 'אין תוצאות.';
    answerText.textContent = '';
    hideExplanation();
    updateProgress();
    return;
  }
  const q = filtered[index];
  questionText.textContent = q.question;
  answerText.textContent   = q.answer;
  
  // Hide explanation when moving to new question
  hideExplanation();
  
  updateProgress();
  persist();
}

function updateProgress(){
  const total = filtered.length;
  const pos = total ? index + 1 : 0;
  questionCounter.textContent = `שאלה ${pos} מתוך ${total}`;
  progressBar.style.width = (total ? (pos/total*100) : 0) + '%';
  
  // Update page input max value
  pageInput.max = total;
  pageInput.placeholder = total ? `1-${total}` : 'מספר';
}

function persist(){
  localStorage.setItem(STORAGE_INDEX, String(index));
  localStorage.setItem(STORAGE_TERM, searchInput.value.trim());
}

// == Page navigation
function goToPage(){
  if (!filtered.length) return;
  
  const pageNum = parseInt(pageInput.value);
  if (!pageNum || pageNum < 1 || pageNum > filtered.length) {
    pageInput.value = '';
    return;
  }
  
  index = pageNum - 1;
  pageInput.value = '';
  render();
}

// == Explanation functions
function toggleExplanation(){
  if (explanationDiv.classList.contains('show')) {
    hideExplanation();
  } else {
    showExplanation();
  }
}

function showExplanation(){
  if (!filtered.length) return;
  
  const q = filtered[index];
  const explanation = q.explanation || 'אין הסבר זמין לשאלה זו.';
  const source = q.source || '';
  
  explanationText.textContent = explanation;
  explanationSource.textContent = source ? `מקור: ${source}` : '';
  
  explanationDiv.classList.add('show');
  explanationBtn.textContent = 'הסתר הסבר';
}

function hideExplanation(){
  explanationDiv.classList.remove('show');
  explanationBtn.textContent = 'הסבר';
}

// == Actions
function next(){ 
  if(!filtered.length) return; 
  index = (index + 1) % filtered.length; 
  render(); 
}

function prev(){ 
  if(!filtered.length) return; 
  index = (index - 1 + filtered.length) % filtered.length; 
  render(); 
}

function runFilter(term){
  const t = term.trim().toLowerCase();
  if (!t) return allQuestions;
  return allQuestions.filter(q =>
    q.question.toLowerCase().includes(t) ||
    q.answer.toLowerCase().includes(t)
  );
}
function runSearch(){ filtered = runFilter(searchInput.value); index = 0; render(); }

// == Keyboard nav (לא מפריע להקלדה בשדות)
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement?.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (typing) return;

  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') next();
  if (e.key === 'ArrowLeft') prev();
});

// == Events
nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);
searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') runSearch(); });
explanationBtn.addEventListener('click', toggleExplanation);
goToBtn.addEventListener('click', goToPage);
pageInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') goToPage(); });

// == Chat helpers
function addMsg(text, who='bot'){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (who==='user' ? 'user' : 'bot');
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = who==='user' ? '👤' : '🤖';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  wrap.appendChild(av); wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// == Gemini: בוט חכם, זורם וענייני בלבד (חופשי לנושא)
async function askGemini(prompt){
  const system = [
    'ענה בעברית טבעית וברורה על כל נושא.',
    'ענייניות ראשונה: קצר כשאפשר, מפורט רק כשנדרש.',
    'אם חסר מידע — בקש הבהרה קצרה (שאלה אחת) לפני תשובה.',
    'אל תמציא עובדות; אם אינך בטוח, אמור שאינך בטוח.',
    'השתמש בדוגמאות או סעיפים קצרים כשזה מבהיר.'
  ].join(' ');

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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה.';
}

// == Chat open/close (FAB)
function openChat(){ chatWindow.style.display = 'flex'; chatWindow.setAttribute('aria-hidden','false'); }
function closeChat(){ chatWindow.style.display = 'none'; chatWindow.setAttribute('aria-hidden','true'); }
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
