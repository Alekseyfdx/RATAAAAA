// === הגדרות ===
const DATA_URL = 'questions.json';

// API KEY שסיפקת (שים לב: בצד-לקוח זה גלוי. לשימוש מאובטח – פרוקסי שרת).
const API_KEY = 'AIzaSyBx3oPlQMWCjYglP0ENvWK_7uGJbh6aYqs';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// אלמנטים
const questionText = document.getElementById('questionText');
const answerText   = document.getElementById('answerText');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const progressBar  = document.getElementById('progressBar');
const questionCounter = document.getElementById('questionCounter');
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');

// Chat
const chatBtn      = document.getElementById('chatBtn');
const chatWindow   = document.getElementById('chatWindow');
const chatClose    = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSend     = document.getElementById('chatSend');
const loadingSpinner = document.getElementById('loadingSpinner');

// מצב
let allQuestions = [];
let filtered = [];
let index = 0;
const STORAGE_KEY  = 'pilot_theory_index';
const STORAGE_TERM = 'pilot_theory_term';

// === טעינת שאלות ===
async function loadQuestions() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    if (!data || !Array.isArray(data.questions)) throw new Error('questions.json לא במבנה הנדרש');

    allQuestions = data.questions.map(q => ({
      id: Number(q.id),
      question: String(q.question || '').trim(),
      answer: String(q.answer || '').trim()
    }));

    // שחזור חיפוש והתקדמות
    const savedTerm = localStorage.getItem(STORAGE_TERM) || '';
    filtered = savedTerm ? runFilter(savedTerm) : allQuestions;
    if (savedTerm) searchInput.value = savedTerm;

    const saved = Number(localStorage.getItem(STORAGE_KEY));
    index = Number.isFinite(saved) && saved >= 0 && saved < filtered.length ? saved : 0;

    render();
  } catch (e) {
    console.error(e);
    questionText.textContent = 'שגיאה בטעינת השאלות (questions.json).';
  }
}

// === תצוגה ===
function render() {
  if (!filtered.length) {
    questionText.textContent = 'אין תוצאות.';
    answerText.textContent = '';
    updateProgress();
    return;
  }
  const q = filtered[index];
  questionText.textContent = q.question;
  answerText.textContent = q.answer;   // מוצג תמיד
  updateProgress();
  persist();
}

function updateProgress() {
  const total = filtered.length;
  const pos = total ? index + 1 : 0;
  questionCounter.textContent = `שאלה ${pos} מתוך ${total}`;
  const pct = total ? (pos / total) * 100 : 0;
  progressBar.style.width = pct + '%';
}

function persist() {
  localStorage.setItem(STORAGE_KEY, String(index));
  localStorage.setItem(STORAGE_TERM, searchInput.value.trim());
}

// === פעולות ניווט ===
function next() {
  if (!filtered.length) return;
  index = (index + 1) % filtered.length;
  render();
}
function prev() {
  if (!filtered.length) return;
  index = (index - 1 + filtered.length) % filtered.length;
  render();
}

// === חיפוש ===
function runFilter(term) {
  const t = term.trim().toLowerCase();
  if (!t) return allQuestions;
  return allQuestions.filter(q =>
    q.question.toLowerCase().includes(t) ||
    q.answer.toLowerCase().includes(t)
  );
}
function runSearch() {
  filtered = runFilter(searchInput.value);
  index = 0;
  render();
}

// === מקשים ===
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (typing) return; // לא לשבור הקלדה

  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') next();
  if (e.key === 'ArrowLeft') prev();
});

// === אירועים ===
nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);
searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

// === צ'אט (Gemini 2.0 Flash) ===
function addMsg(text, who='bot') {
  const wrap = document.createElement('div');
  wrap.className = 'chat-message ' + (who === 'user' ? 'user-message' : 'bot-message');
  const av = document.createElement('div');
  av.className = 'message-avatar';
  av.textContent = (who === 'user') ? '👨' : '🤖';
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  wrap.appendChild(av); wrap.appendChild(content);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askGemini(prompt) {
  const system = 'אתה עוזר תכליתי לתלמידי חוקת אוויר. ענה בקצרה ובדיוק, רק בנושאי חוקה/תקנות טיסה. אם השאלה אינה רלוונטית – כתוב שאינך יכול לענות.';
  const body = {
    contents: [
      { role: 'user', parts: [{ text: system }] },
      { role: 'user', parts: [{ text: prompt }] }
    ]
  };
  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error('שגיאה מה-Gemini: ' + res.status + ' ' + t);
  }
  const data = await res.json();
  const candidates = (data && data.candidates) || [];
  const txt = candidates.length && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts[0].text
    ? candidates[0].content.parts[0].text
    : 'לא התקבלה תשובה.';
  return txt;
}
function openChat() { chatWindow.style.display = 'flex'; chatWindow.setAttribute('aria-hidden', 'false'); }
function closeChat() { chatWindow.style.display = 'none'; chatWindow.setAttribute('aria-hidden', 'true'); }

chatBtn.addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  addMsg(text, 'user');
  chatInput.value = '';
  loadingSpinner.style.display = 'block';
  try {
    const reply = await askGemini(text);
    addMsg(reply, 'bot');
  } catch (err) {
    addMsg(err.message || 'שגיאה.', 'bot');
  } finally {
    loadingSpinner.style.display = 'none';
  }
}
chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') sendChat(); });

// התחלה
loadQuestions();
