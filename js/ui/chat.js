import { gs, clones, E, STAGE_NAMES } from '../state.js';
import { updateUI } from './hud.js';
import { getPersonality } from './hud.js';

export function toggleChat() {
  const p = document.getElementById('chat-panel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    document.getElementById('chat-input').focus();
    if (gs.chatHistory.length === 0) appendChat('clawd', '（终于等到你来说话了...）');
  }
}

const PROVIDERS = ['anthropic', 'gemini', 'openai'];

export function toggleProvider() {
  const idx = PROVIDERS.indexOf(gs.apiProvider);
  gs.apiProvider = PROVIDERS[(idx + 1) % PROVIDERS.length];
  localStorage.setItem('clawd_provider', gs.apiProvider);
  updateProviderUI();
}

export function updateProviderUI() {
  const btn = document.getElementById('provider-btn');
  const inp = document.getElementById('api-input');
  const pr  = document.getElementById('proxy-row');
  const pi  = document.getElementById('proxy-input');
  btn.className = gs.apiProvider !== 'anthropic' ? gs.apiProvider : '';
  if (gs.apiProvider === 'gemini') {
    btn.textContent = 'Gemini';
    inp.placeholder = gs.geminiKey ? 'Gemini Key 已保存 ✓' : 'Google Gemini API Key';
    pr.style.display = 'flex';
    pi.placeholder = gs.geminiProxy
      ? `代理: ${gs.geminiProxy.slice(0,28)}...`
      : '代理地址（选填）如: https://你的代理.com';
  } else if (gs.apiProvider === 'openai') {
    btn.textContent = 'OpenAI';
    inp.placeholder = gs.openaiKey ? 'OpenAI Key 已保存 ✓' : 'OpenAI API Key (sk-...)';
    pr.style.display = 'flex';
    pi.placeholder = gs.openaiProxy
      ? `端点: ${gs.openaiProxy.slice(0,28)}...`
      : '自定义端点（选填）如: https://你的代理.com/v1';
  } else {
    btn.textContent = 'Claude';
    inp.placeholder = gs.apiKey ? 'API Key 已保存 ✓' : 'Anthropic API Key';
    pr.style.display = 'none';
  }
}

export function saveProxy() {
  const v = document.getElementById('proxy-input').value.trim();
  if (gs.apiProvider === 'openai') {
    gs.openaiProxy = v;
    if (v) localStorage.setItem('clawd_openaiproxy', v);
    else   localStorage.removeItem('clawd_openaiproxy');
  } else {
    gs.geminiProxy = v;
    if (v) localStorage.setItem('clawd_geminiproxy', v);
    else   localStorage.removeItem('clawd_geminiproxy');
  }
  document.getElementById('proxy-input').value = '';
  updateProviderUI();
}

export function saveKey() {
  const k = document.getElementById('api-input').value.trim();
  if (!k) return;
  if (gs.apiProvider === 'gemini')      { gs.geminiKey = k; localStorage.setItem('clawd_geminikey', k); }
  else if (gs.apiProvider === 'openai') { gs.openaiKey = k; localStorage.setItem('clawd_openaikey', k); }
  else                                   { gs.apiKey    = k; localStorage.setItem('clawd_apikey', k); }
  document.getElementById('api-input').value = '';
  updateProviderUI();
}

export async function sendChat() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim(); if (!text) return;
  input.value = ''; appendChat('player', text);
  gs.minutesSinceInteract = 0;
  gs.emo[E.LONE]   = Math.max(0,   gs.emo[E.LONE]-20);
  gs.emo[E.CURIO]  = Math.min(100, gs.emo[E.CURIO]+8);
  gs.emo[E.TRUST]  = Math.min(100, gs.emo[E.TRUST]+0.5);
  gs.emo[E.ATTACH] = Math.min(100, gs.emo[E.ATTACH]+0.3);
  const ak = gs.apiProvider === 'gemini' ? gs.geminiKey
           : gs.apiProvider === 'openai' ? gs.openaiKey
           : gs.apiKey;
  if (!ak) {
    const name = gs.apiProvider === 'gemini' ? 'Gemini' : gs.apiProvider === 'openai' ? 'OpenAI' : 'Anthropic';
    appendChat('clawd', `（你还没有配置 ${name} API Key，我没办法回话...）`);
    return;
  }
  gs.chatHistory.push({role:'user', content:text});
  if (gs.chatHistory.length > 12) gs.chatHistory = gs.chatHistory.slice(-12);
  appendChat('clawd', '...');
  try {
    let reply;
    if (gs.apiProvider === 'gemini') {
      const gh = gs.chatHistory.map(m => ({role:m.role==='assistant'?'model':'user', parts:[{text:m.content}]}));
      const ep = gs.geminiProxy || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      const resp = await fetch(`${ep}?key=${ak}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({system_instruction:{parts:[{text:buildSystemPrompt()}]}, contents:gh, generationConfig:{maxOutputTokens:300}})
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '（沉默）';
    } else if (gs.apiProvider === 'openai') {
      const ep = (gs.openaiProxy || 'https://api.openai.com/v1') + '/chat/completions';
      const resp = await fetch(ep, {
        method:'POST',
        headers:{'Content-Type':'application/json', 'Authorization':`Bearer ${ak}`},
        body:JSON.stringify({model:'gpt-4o-mini', max_tokens:300,
          messages:[{role:'system', content:buildSystemPrompt()}, ...gs.chatHistory]})
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      reply = data?.choices?.[0]?.message?.content?.trim() || '（沉默）';
    } else {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:300, system:buildSystemPrompt(), messages:gs.chatHistory})
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      reply = data?.content?.[0]?.text?.trim() || '（沉默）';
    }
    const clawdMsgs = document.getElementById('chat-log').querySelectorAll('.msg.clawd');
    clawdMsgs[clawdMsgs.length-1].textContent = reply;
    gs.chatHistory.push({role:'assistant', content:reply});
  } catch(err) {
    const clawdMsgs = document.getElementById('chat-log').querySelectorAll('.msg.clawd');
    clawdMsgs[clawdMsgs.length-1].textContent = `（出错：${err.message}）`;
  }
  updateUI();
}

function buildSystemPrompt() {
  const phase = ['深夜','黎明','上午','下午','傍晚','深夜'][
    gs.gameHour<4?0:gs.gameHour<8?1:gs.gameHour<12?2:gs.gameHour<17?3:gs.gameHour<21?4:5
  ];
  const [lone,trust,happy,curio,attach,fear] = gs.emo.map(v => Math.round(v));
  return `你是 Claw'd，一只橘色像素小生物。不要提 AI。用简短有个性的中文回复（1-3句），可用颜文字。${clones.length>0?`\n当前有 ${clones.length} 个其他个体`:''}${gs.entityDirty>40?'\n身上有点脏':''}
性格：【${getPersonality()}】状态：${gs.isSleeping?'睡觉中':'清醒'} 第${gs.day}天 ${String(gs.gameHour).padStart(2,'0')}:${String(gs.gameMin).padStart(2,'0')} ${phase}
阶段：${STAGE_NAMES[gs.stage]} 饥饿:${Math.round(gs.hunger)} 精力:${Math.round(gs.energy)}
情绪— 孤独:${lone} 信任:${trust} 快乐:${happy} 好奇:${curio} 依恋:${attach} 恐惧:${fear}
孤独高→冷淡；恐惧高→磕绊；依恋+信任高→撒娇；好奇高→反问；快乐低→无精打采。`;
}

function appendChat(role, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className   = `msg ${role}`;
  div.textContent = role === 'player' ? `▶ ${text}` : text;
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}
