const faqForm = document.getElementById('faq-form');
const faqList = document.getElementById('faq-list');
const msgDiv = document.getElementById('msg');
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const faqIdInput = document.getElementById('faq-id');
const cancelEditBtn = document.getElementById('cancel-edit');

function showMsg(text, type) {
  msgDiv.textContent = text;
  msgDiv.className = type;
  setTimeout(() => { msgDiv.textContent = ''; msgDiv.className = ''; }, 2000);
}

function renderFaqs(faqs) {
  faqList.innerHTML = '';
  faqs.forEach(faq => {
    const div = document.createElement('div');
    div.className = 'faq-item';
    div.innerHTML = `<b>Q:</b> ${faq.question}<br><b>A:</b> ${faq.answer}
      <div class="faq-actions">
        <button onclick="editFaq('${faq.id}')">Edit</button>
        <button onclick="deleteFaq('${faq.id}')">Delete</button>
      </div>`;
    faqList.appendChild(div);
  });
}

async function fetchFaqs() {
  try {
    const res = await fetch('/faqs?_=' + Date.now()); // cache-busting
    if (!res.ok) throw new Error('Failed to fetch FAQs');
    const faqs = await res.json();
    window.faqs = faqs;
    renderFaqs(faqs);
  } catch (e) {
    showMsg('Could not load FAQs.', 'error');
  }
}

faqForm.onsubmit = async e => {
  e.preventDefault();
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();
  if (!question || !answer) {
    showMsg('Both fields are required.', 'error');
    return;
  }
  const id = faqIdInput.value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/faqs/${id}` : '/faqs';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer })
  });
  if (res.ok) {
    showMsg('Saved!', 'success');
    faqForm.reset();
    faqIdInput.value = '';
    cancelEditBtn.style.display = 'none';
    fetchFaqs();
  } else {
    showMsg('Error saving FAQ.', 'error');
  }
};

window.editFaq = id => {
  const faq = window.faqs.find(f => f.id === id);
  if (faq) {
    questionInput.value = faq.question;
    answerInput.value = faq.answer;
    faqIdInput.value = faq.id;
    cancelEditBtn.style.display = 'inline-block';
  }
};

window.deleteFaq = async id => {
  if (!confirm('Delete this FAQ?')) return;
  const res = await fetch(`/faqs/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showMsg('Deleted!', 'success');
    fetchFaqs();
  } else {
    showMsg('Error deleting FAQ.', 'error');
  }
};

cancelEditBtn.onclick = () => {
  faqForm.reset();
  faqIdInput.value = '';
  cancelEditBtn.style.display = 'none';
};

fetchFaqs();
