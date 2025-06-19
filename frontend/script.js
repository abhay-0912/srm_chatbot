const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loading = document.getElementById('loading');
const quickReplies = document.querySelector('.quick-replies');

function addBubble(text, sender) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + sender;
  bubble.textContent = text;
  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setLoading(show) {
  loading.style.display = show ? 'block' : 'none';
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  }
}

async function sendMessage(msg) {
  addBubble(msg, 'user');
  setLoading(true);
  userInput.value = '';
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    setLoading(false);
    if (data.reply) {
      addBubble(data.reply, 'bot');
      speak(data.reply);
    } else {
      addBubble('Sorry, I could not get a response.', 'bot');
    }
  } catch (e) {
    setLoading(false);
    addBubble('Error contacting server.', 'bot');
  }
}

sendBtn.onclick = () => {
  const msg = userInput.value.trim();
  if (msg) sendMessage(msg);
};

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendBtn.click();
});

quickReplies.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    sendMessage(e.target.textContent);
  }
});

let faqSuggestions = [];

// Fetch FAQ questions for auto-suggestions
async function loadFaqSuggestions() {
  try {
    const res = await fetch('/faqs?_=' + Date.now());
    if (!res.ok) return;
    const faqs = await res.json();
    faqSuggestions = faqs.map(f => f.question);
  } catch {}
}
loadFaqSuggestions();

// Create suggestion dropdown
const suggestionBox = document.createElement('div');
suggestionBox.style.position = 'absolute';
suggestionBox.style.background = '#fff';
suggestionBox.style.border = '1px solid #d1d5db';
suggestionBox.style.borderRadius = '8px';
suggestionBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
suggestionBox.style.zIndex = 1000;
suggestionBox.style.display = 'none';
suggestionBox.style.maxHeight = '160px';
suggestionBox.style.overflowY = 'auto';
document.body.appendChild(suggestionBox);

userInput.addEventListener('input', function() {
  const val = this.value.trim().toLowerCase();
  if (!val || !faqSuggestions.length) {
    suggestionBox.style.display = 'none';
    return;
  }
  const matches = faqSuggestions.filter(q => q.toLowerCase().includes(val));
  if (!matches.length) {
    suggestionBox.style.display = 'none';
    return;
  }
  suggestionBox.innerHTML = '';
  matches.forEach(q => {
    const item = document.createElement('div');
    item.textContent = q;
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.onmousedown = () => {
      userInput.value = q;
      suggestionBox.style.display = 'none';
      userInput.focus();
    };
    suggestionBox.appendChild(item);
  });
  const rect = userInput.getBoundingClientRect();
  suggestionBox.style.left = rect.left + window.scrollX + 'px';
  suggestionBox.style.top = rect.bottom + window.scrollY + 'px';
  suggestionBox.style.width = rect.width + 'px';
  suggestionBox.style.display = 'block';
});

document.addEventListener('click', e => {
  if (e.target !== userInput) suggestionBox.style.display = 'none';
});
