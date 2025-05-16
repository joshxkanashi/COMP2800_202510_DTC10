// gemini-portfolio.js
// This file will contain Gemini-powered portfolio features and enhancements.
// Add your Gemini API integration and logic here.

import { supabase } from './supabaseAPI.js';

// Function to create a text element when a button is clicked
function createTextElement() {
  const textElement = document.createElement('p');
  textElement.textContent = 'This is a text element created by Gemini!';
  document.body.appendChild(textElement);
}

// Gemini-powered portfolio chat bubble (simple transitions version)

function ensureChatWindow() {
  let chatWindow = document.getElementById('chatWindow');
  if (!chatWindow) {
    chatWindow = document.createElement('div');
    chatWindow.id = 'chatWindow';
    chatWindow.className = 'ai-advice-chat-bubble';
    chatWindow.innerHTML = `
      <button class="ai-advice-chat-close" aria-label="Close chat">&times;</button>
      <div class="ai-advice-chat-content"></div>
    `;
    document.body.appendChild(chatWindow);
    chatWindow.querySelector('.ai-advice-chat-close').onclick = () => toggleChatWindow(true);
  }
  return chatWindow;
}

function renderStartButton() {
  const chatWindow = ensureChatWindow();
  const content = chatWindow.querySelector('.ai-advice-chat-content');
  content.innerHTML = `<button class="ai-advice-start-btn">Start</button>`;
  content.querySelector('.ai-advice-start-btn').onclick = startGeminiAdvice;
}

async function startGeminiAdvice() {
  const chatWindow = ensureChatWindow();
  const content = chatWindow.querySelector('.ai-advice-chat-content');
  content.innerHTML = `<div class="ai-advice-loading">Asking Gemini for advice...</div>`;

  // Get portfolio JSON from Supabase portfolios table
  let portfolioJson = '{}';
  let supabaseData = null;
  try {
    let user = null;
    if (typeof getCurrentUser === 'function') {
      user = await getCurrentUser();
    } else {
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }
    if (user) {
      const { data: portfolioData, error } = await supabase
        .from('portfolios')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (portfolioData && portfolioData.data) {
        supabaseData = { ...portfolioData.data };
        // If there are featured_project_ids, fetch full project details
        if (supabaseData.featured_project_ids && Array.isArray(supabaseData.featured_project_ids) && supabaseData.featured_project_ids.length > 0) {
          const { data: projects, error: projError } = await supabase
            .from('projects')
            .select('*')
            .in('id', supabaseData.featured_project_ids);
          if (projects && Array.isArray(projects)) {
            supabaseData.featured_projects_details = projects;
          }
        }
        // Remove the old projects/featured_project_ids field to avoid confusion
        delete supabaseData.projects;
        delete supabaseData.featured_project_ids;
        portfolioJson = JSON.stringify(supabaseData);
      }
    }
  } catch (e) {
    console.warn('[Gemini AI] Error fetching portfolio from Supabase:', e);
  }
  // Fallback to gatherPortfolioData or window.portfolioData if Supabase fails
  if (portfolioJson === '{}' && typeof gatherPortfolioData === 'function') {
    try {
      portfolioJson = JSON.stringify(gatherPortfolioData());
    } catch (e) { portfolioJson = '{}'; }
  } else if (portfolioJson === '{}' && window.portfolioData) {
    try {
      portfolioJson = JSON.stringify(window.portfolioData);
    } catch (e) { portfolioJson = '{}'; }
  }

  // Gemini Flash 1.5 API call
  const apiKey = 'AIzaSyDrzeB_oFPVHCXqxNCnZbZgr8gY1Rqc6OA'; // <-- Replace with your Gemini API key
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  const prompt = `You are an AI advisor in a chatbox inside a portfolio web app. The user will send you their portfolio data. Please review the portfolio and give friendly, helpful, and actionable advice as if you are chatting with the user. Point out specific sections (like About, Projects, Skills, etc.) that could be improved, and explain why and how. Respond conversationally, as if you are giving advice directly to the user in the chatbox.\n\nHere is the user's portfolio:\n${portfolioJson}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    let advice = 'Sorry, no advice received.';
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      advice = data.candidates[0].content.parts[0].text;
    } else if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      advice = data.candidates[0].content.parts.map(p => p.text).join('\n');
    }
    function formatAIAdvice(text) {
      // Convert **bold** to <strong>
      let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Convert * bullets to <ul><li>
      // Split into blocks by double line breaks (paragraphs)
      const blocks = formatted.split(/\n\s*\n/);
      let result = '';
      for (let block of blocks) {
        // If block is a bullet list
        if (block.trim().startsWith('* ')) {
          // Split into lines and wrap each in <li>
          const lines = block.trim().split(/\n/);
          result += '<ul>';
          for (let line of lines) {
            if (line.trim().startsWith('* ')) {
              result += '<li>' + line.trim().substring(2).trim() + '</li>';
            }
          }
          result += '</ul>';
        } else {
          // Otherwise, treat as paragraph, but keep single line breaks as <br>
          result += '<p>' + block.trim().replace(/\n/g, '<br>') + '</p>';
        }
      }
      return result;
    }
    content.innerHTML = `<div class="ai-advice-message ai-advice-message-ai">${formatAIAdvice(advice)}</div>`;
  } catch (err) {
    content.innerHTML = `<div class="ai-advice-message ai-advice-message-error">Error getting advice from Gemini: ${err.message}</div>`;
  }
}

function toggleChatWindow(forceClose = false) {
  const chatWindow = ensureChatWindow();
  if (forceClose || chatWindow.classList.contains('open')) {
    chatWindow.classList.remove('open');
  } else {
    chatWindow.classList.add('open');
    renderStartButton();
  }
}

// Attach to existing Get Advice button
// (Assumes your button has id="aiAdviceBtn")
document.addEventListener('DOMContentLoaded', function() {
  const adviceButton = document.getElementById('aiAdviceBtn');
  if (adviceButton) {
    adviceButton.onclick = () => toggleChatWindow();
  }
});

// Export or expose functions as needed
window.initializeGeminiPortfolio = initializeGeminiPortfolio;
window.createTextElement = createTextElement; 