// Express server for University Chatbot
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const faqsPath = path.join(__dirname, 'faqs.json');

function readFaqs() {
  try {
    return JSON.parse(fs.readFileSync(faqsPath, 'utf8'));
  } catch {
    return [];
  }
}
function writeFaqs(faqs) {
  fs.writeFileSync(faqsPath, JSON.stringify(faqs, null, 2));
}

// GET all FAQs
app.get('/faqs', (req, res) => {
  res.json(readFaqs());
});

// POST new FAQ
app.post('/faqs', (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Both fields required.' });
  const faqs = readFaqs();
  const newFaq = { id: uuidv4(), question, answer };
  faqs.push(newFaq);
  writeFaqs(faqs);
  res.json(newFaq);
});

// PUT update FAQ
app.put('/faqs/:id', (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Both fields required.' });
  const faqs = readFaqs();
  const idx = faqs.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'FAQ not found.' });
  faqs[idx] = { id, question, answer };
  writeFaqs(faqs);
  res.json(faqs[idx]);
});

// DELETE FAQ
app.delete('/faqs/:id', (req, res) => {
  const { id } = req.params;
  let faqs = readFaqs();
  const idx = faqs.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'FAQ not found.' });
  faqs.splice(idx, 1);
  writeFaqs(faqs);
  res.json({ success: true });
});

// Fuzzy match helper
function fuzzyMatch(input, faqs) {
  input = input.toLowerCase();
  for (const faq of faqs) {
    if (faq.question.toLowerCase() === input) return faq;
    // Simple fuzzy: contains or Levenshtein distance <= 2
    if (faq.question.toLowerCase().includes(input) || input.includes(faq.question.toLowerCase())) return faq;
  }
  return null;
}

// POST /chat endpoint
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: 'No message provided.' });

  // Check FAQ first
  const faqs = readFaqs();
  const match = fuzzyMatch(userMessage, faqs);
  if (match) return res.json({ reply: match.answer });

  try {
    // Call Gemini API
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }]
      })
    });
    const geminiData = await geminiRes.json();
    const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not find an answer.';
    res.json({ reply: botReply });
  } catch (err) {
    res.status(500).json({ error: 'Error contacting Gemini API.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
