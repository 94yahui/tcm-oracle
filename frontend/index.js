import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
import { sendWithTools } from './tcm-tool-report.js';

// 禁用远程模型检查（加速加载）
env.allowLocalModels = false;
env.useBrowserCache = true;

// ============================================================
//  [RAG 新增 #2] RAG 全局状态
// ============================================================
let embedder = null;          // 向量化 pipeline
let ragChunks = [];           // [{text, embedding}]
let ragReady = false;         // 是否初始化完成

// ============================================================
//  [RAG 新增 #3] 文本分块函数
// ============================================================
const CHUNK_SIZE = 300;   // 每块字符数
const CHUNK_OVERLAP = 50; // 相邻块重叠字符数
const TOP_K = 5;          // 每次检索返回前 K 个最相关块

function chunkText(text) {
    const chunks = [];
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 20);

    let current = '';
    for (const para of paragraphs) {
        if ((current + para).length < CHUNK_SIZE) {
            current += (current ? '\n' : '') + para;
        } else {
            if (current) chunks.push(current);
            if (para.length > CHUNK_SIZE) {
                const sentences = para.split(/(?<=[。！？\.!?])\s*/);
                let sub = '';
                for (const s of sentences) {
                    if ((sub + s).length < CHUNK_SIZE) {
                        sub += s;
                    } else {
                        if (sub) chunks.push(sub);
                        sub = s;
                    }
                }
                if (sub) current = sub;
                else current = '';
            } else {
                current = para;
            }
        }
    }
    if (current) chunks.push(current);

    const overlapped = [];
    for (let i = 0; i < chunks.length; i++) {
        const prefix = i > 0 ? chunks[i - 1].slice(-CHUNK_OVERLAP) + ' ' : '';
        overlapped.push(prefix + chunks[i]);
    }
    return overlapped;
}

// ============================================================
//  [RAG 新增 #4] 余弦相似度计算
// ============================================================
function cosineSim(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// ============================================================
//  [RAG 新增 #5] 向量检索
// ============================================================
async function retrieveContext(query, k = TOP_K) {
    if (!ragReady || ragChunks.length === 0) return '';
    const constitution = window.__currentBodyType || '';
    const enrichedQuery = constitution ? `${constitution} constitution: ${query}` : query;
    const out = await embedder(enrichedQuery, { pooling: 'mean', normalize: true });
    const qVec = Array.from(out.data);

    const scored = ragChunks.map(chunk => ({
        text: chunk.text,
        score: cosineSim(qVec, chunk.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, k).map(c => c.text).join('\n\n---\n\n');
}

// ============================================================
//  [RAG 新增 #6] 初始化 RAG
// ============================================================
async function initRAG() {
    const statusEl = document.getElementById('rag-status');
    const barEl = document.getElementById('rag-bar');

    try {
        statusEl.textContent = '⟳ 正在加载向量模型...';
        barEl.style.width = '20%';

        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            progress_callback: (info) => {
                if (info.status === 'progress') {
                    const pct = Math.round(info.progress || 0);
                    barEl.style.width = `${20 + pct * 0.4}%`;
                    statusEl.textContent = `⟳ 下载模型 ${pct}%...`;
                }
            }
        });

        barEl.style.width = '65%';
        statusEl.textContent = '⟳ 正在读取知识库...';

        let tcmText = '';
        try {
            const resp = await fetch('./tcm.txt');
            if (!resp.ok) throw new Error('fetch failed');
            tcmText = await resp.text();
        } catch (e) {
            tcmText = window.__tcmTextFallback || '';
            if (!tcmText) {
                statusEl.textContent = '⚠ 未找到 tcm.txt，请上传文件';
                barEl.style.width = '0%';
                document.getElementById('rag-upload-hint').style.display = 'block';
                return;
            }
        }

        const chunks = chunkText(tcmText);
        barEl.style.width = '70%';
        statusEl.textContent = `⟳ 向量化 ${chunks.length} 个知识块...`;

        for (let i = 0; i < chunks.length; i++) {
            const out = await embedder(chunks[i], { pooling: 'mean', normalize: true });
            ragChunks.push({ text: chunks[i], embedding: Array.from(out.data) });
            const pct = 70 + Math.round((i / chunks.length) * 28);
            barEl.style.width = `${pct}%`;
            if (i % 5 === 0) {
                statusEl.textContent = `⟳ 向量化 ${i + 1}/${chunks.length}...`;
            }
        }

        ragReady = true;
        barEl.style.width = '100%';
        barEl.style.background = 'var(--jade-light)';
        statusEl.textContent = `✓ 知识库就绪 (${chunks.length} 块)`;

        setTimeout(() => {
            document.getElementById('rag-status-bar').style.opacity = '0';
            setTimeout(() => document.getElementById('rag-status-bar').style.display = 'none', 600);
        }, 2000);

    } catch (err) {
        statusEl.textContent = `✗ RAG 初始化失败: ${err.message}`;
        barEl.style.background = 'var(--cinnabar)';
        console.error('[RAG]', err);
    }
}

window.retrieveContext = retrieveContext;
window.isRagReady = () => ragReady;
window.addEventListener('DOMContentLoaded', initRAG);

window.handleTcmUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        window.__tcmTextFallback = e.target.result;
        document.getElementById('rag-upload-hint').style.display = 'none';
        initRAG();
    };
    reader.readAsText(file, 'UTF-8');
};

// ============================================================
//  DATA
// ============================================================
const CONSTITUTIONS = {
    'Balanced': { cn: '平和质', en: 'Balanced', desc: 'Healthy, energetic, and emotionally stable. Harmonious Qi and blood flow.', traits: ['Energetic', 'Stable mood', 'Good digestion', 'Sound sleep'] },
    'Qi Deficiency': { cn: '气虚质', en: 'Qi Deficiency', desc: 'Low vital energy, easily tired with shortness of breath.', traits: ['Low energy', 'Short of breath', 'Pale face', 'Sweats easily'] },
    'Yang Deficiency': { cn: '阳虚质', en: 'Yang Deficiency', desc: 'Insufficient Yang energy causing cold sensations.', traits: ['Feel cold', 'Cold limbs', 'Pale complexion', 'Low libido'] },
    'Yin Deficiency': { cn: '阴虚质', en: 'Yin Deficiency', desc: 'Deficient Yin fluids causing internal heat and dryness.', traits: ['Feel hot', 'Dry mouth', 'Night sweats', 'Restless sleep'] },
    'Phlegm-Dampness': { cn: '痰湿质', en: 'Phlegm-Dampness', desc: 'Accumulation of dampness and phlegm; metabolism is sluggish.', traits: ['Heavy body', 'Oily skin', 'Sticky tongue', 'Prone to weight gain'] },
    'Damp-Heat': { cn: '湿热质', en: 'Damp-Heat', desc: 'Dampness and heat accumulating internally.', traits: ['Acne', 'Oily face', 'Bitter mouth', 'Yellow urine'] },
    'Blood Stasis': { cn: '血瘀质', en: 'Blood Stasis', desc: 'Sluggish blood circulation causing stagnation.', traits: ['Dull skin', 'Dark circles', 'Fixed pain', 'Dark spots'] },
    'Qi Stagnation': { cn: '气郁质', en: 'Qi Stagnation', desc: 'Stagnation of Qi flow, often triggered by emotional stress.', traits: ['Moody', 'Depressed', 'Frequent sighing', 'Chest tightness'] },
    'Special Diathesis': { cn: '特禀质', en: 'Special Diathesis', desc: 'Innate special constitution with heightened sensitivity and allergy tendency.', traits: ['Allergies', 'Sensitive skin', 'Asthma risk', 'Drug reactions'] },
};

const QUESTIONS = [
    { id: 'energy', text: 'How would you describe your overall energy level?', sub: 'Think about how you feel on a typical day', options: [{ icon: '⚡', title: 'Vibrant & Energetic', desc: 'Full of vitality, rarely feel tired', value: 'high' }, { icon: '🔋', title: 'Normal Energy', desc: 'Generally okay, tired after exertion', value: 'normal' }, { icon: '😴', title: 'Often Tired', desc: 'Fatigue easily, shortness of breath', value: 'low' }, { icon: '😤', title: 'Tense & Wired', desc: 'Stressed, restless, hard to relax', value: 'tense' }] },
    { id: 'temperature', text: 'How do you feel about temperature?', sub: "Your body's perception of heat and cold", options: [{ icon: '🌡️', title: 'Comfortable', desc: 'Rarely bothered by heat or cold', value: 'neutral' }, { icon: '🥶', title: 'Always Cold', desc: 'Cold hands, feet, often need extra layers', value: 'cold' }, { icon: '🔥', title: 'Often Hot', desc: 'Sweaty, prefer cool environments', value: 'hot' }, { icon: '🌊', title: 'Variable', desc: 'Sometimes hot, sometimes cold', value: 'variable' }] },
    { id: 'digestion', text: 'How is your digestion and appetite?', sub: 'Reflect on your typical digestive patterns', options: [{ icon: '✅', title: 'Smooth & Regular', desc: 'Normal digestion, good appetite', value: 'normal' }, { icon: '💧', title: 'Heavy & Bloated', desc: 'Body feels heavy, sticky or loose stools', value: 'damp' }, { icon: '🌵', title: 'Dry & Parched', desc: 'Dry mouth, thirsty often, constipation', value: 'dry' }, { icon: '🌶️', title: 'Burning & Urgent', desc: 'Acid reflux, urgent stools, bad breath', value: 'hot' }] },
    { id: 'skin', text: 'What best describes your skin?', sub: 'Observe your skin on an average day', options: [{ icon: '🌸', title: 'Clear & Balanced', desc: 'Normal skin, not too oily or dry', value: 'normal' }, { icon: '💦', title: 'Oily & Prone to Acne', desc: 'Shiny face, frequent breakouts', value: 'oily' }, { icon: '🏜️', title: 'Dry & Dull', desc: 'Flaky, lacks luster, rough texture', value: 'dry' }, { icon: '🌹', title: 'Dark Spots or Dull', desc: 'Pigmentation, uneven tone, easily bruises', value: 'dull' }] },
    { id: 'emotion', text: 'Which emotional pattern resonates most?', sub: 'Your general emotional and mental tendencies', options: [{ icon: '😊', title: 'Calm & Positive', desc: 'Generally cheerful, emotionally stable', value: 'balanced' }, { icon: '😔', title: 'Often Moody', desc: 'Sensitive, tendency to feel low or anxious', value: 'depressed' }, { icon: '😰', title: 'Anxious & Restless', desc: 'Worry a lot, overthink, disturbed sleep', value: 'anxious' }, { icon: '😡', title: 'Irritable', desc: 'Easily frustrated, short-tempered', value: 'irritable' }] },
    { id: 'sleep', text: 'How do you sleep?', sub: 'Consider your sleep quality over the past month', options: [{ icon: '😴', title: 'Deep & Restful', desc: 'Fall asleep easily, wake refreshed', value: 'good' }, { icon: '💤', title: 'Excessive Sleep', desc: 'Sleep a lot but still feel tired', value: 'excessive' }, { icon: '🦉', title: 'Difficulty Sleeping', desc: 'Hard to fall asleep or stay asleep', value: 'poor' }, { icon: '🌙', title: 'Night Sweats', desc: 'Wake hot, or perspire during sleep', value: 'sweaty' }] },
    { id: 'tongue', text: 'What does your tongue look like?', sub: 'Check in a mirror in natural light', options: [{ icon: '👅', title: 'Pink & Moist', desc: 'Normal coating, healthy color', value: 'normal' }, { icon: '🩸', title: 'Pale & Swollen', desc: 'Tooth marks on edges, pale color', value: 'pale' }, { icon: '🍎', title: 'Red & Dry', desc: 'Little coating, red color, dry surface', value: 'red' }, { icon: '🥛', title: 'Thick White/Yellow Coat', desc: 'Greasy, sticky or yellow coating', value: 'coated' }] },
    { id: 'pain', text: 'Do you experience any of these?', sub: 'Select the one that applies most', options: [{ icon: '✨', title: 'None of These', desc: 'Generally pain-free and comfortable', value: 'none' }, { icon: '📍', title: 'Fixed Pain or Stiffness', desc: 'Pain in fixed location, worse at night', value: 'fixed' }, { icon: '🌬️', title: 'Migratory Aches', desc: 'Moving pain, bloating, pressure sensations', value: 'moving' }, { icon: '🤧', title: 'Allergies or Sensitivity', desc: 'Pollen, food, skin allergies or asthma', value: 'allergy' }] },
    { id: 'weight', text: 'How is your body weight and fluid balance?', sub: 'Your tendency over time', options: [{ icon: '⚖️', title: 'Stable & Proportional', desc: 'Maintain weight easily, no puffiness', value: 'balanced' }, { icon: '📈', title: 'Tendency to Gain', desc: 'Gain weight easily, feel puffy or bloated', value: 'gain' }, { icon: '📉', title: 'Tendency to Lose', desc: 'Lose weight easily, feel thin or dry', value: 'lose' }, { icon: '💜', title: 'Dark Circles & Bruises', desc: 'Dark eye circles, blood pooling, spider veins', value: 'stasis' }] },
];

function calculateConstitution(answers) {
    const scores = { 'Balanced': 0, 'Qi Deficiency': 0, 'Yang Deficiency': 0, 'Yin Deficiency': 0, 'Phlegm-Dampness': 0, 'Damp-Heat': 0, 'Blood Stasis': 0, 'Qi Stagnation': 0, 'Special Diathesis': 0 };
    if (answers.energy === 'high') scores['Balanced'] += 2;
    if (answers.energy === 'low') { scores['Qi Deficiency'] += 3; scores['Yang Deficiency'] += 1; }
    if (answers.energy === 'tense') scores['Qi Stagnation'] += 3;
    if (answers.energy === 'normal') scores['Balanced'] += 1;
    if (answers.temperature === 'neutral') scores['Balanced'] += 1;
    if (answers.temperature === 'cold') { scores['Yang Deficiency'] += 3; scores['Qi Deficiency'] += 1; }
    if (answers.temperature === 'hot') { scores['Yin Deficiency'] += 2; scores['Damp-Heat'] += 2; }
    if (answers.digestion === 'normal') scores['Balanced'] += 1;
    if (answers.digestion === 'damp') { scores['Phlegm-Dampness'] += 3; scores['Damp-Heat'] += 1; }
    if (answers.digestion === 'dry') scores['Yin Deficiency'] += 3;
    if (answers.digestion === 'hot') { scores['Damp-Heat'] += 3; scores['Yin Deficiency'] += 1; }
    if (answers.skin === 'normal') scores['Balanced'] += 1;
    if (answers.skin === 'oily') { scores['Damp-Heat'] += 3; scores['Phlegm-Dampness'] += 1; }
    if (answers.skin === 'dry') { scores['Yin Deficiency'] += 2; scores['Blood Stasis'] += 1; }
    if (answers.skin === 'dull') scores['Blood Stasis'] += 3;
    if (answers.emotion === 'balanced') scores['Balanced'] += 2;
    if (answers.emotion === 'depressed') scores['Qi Stagnation'] += 3;
    if (answers.emotion === 'anxious') { scores['Yin Deficiency'] += 2; scores['Qi Stagnation'] += 1; }
    if (answers.emotion === 'irritable') { scores['Damp-Heat'] += 2; scores['Qi Stagnation'] += 1; }
    if (answers.sleep === 'good') scores['Balanced'] += 2;
    if (answers.sleep === 'excessive') { scores['Phlegm-Dampness'] += 2; scores['Qi Deficiency'] += 1; }
    if (answers.sleep === 'poor') { scores['Qi Stagnation'] += 2; scores['Yin Deficiency'] += 1; }
    if (answers.sleep === 'sweaty') scores['Yin Deficiency'] += 3;
    if (answers.tongue === 'normal') scores['Balanced'] += 2;
    if (answers.tongue === 'pale') { scores['Yang Deficiency'] += 2; scores['Qi Deficiency'] += 2; }
    if (answers.tongue === 'red') scores['Yin Deficiency'] += 3;
    if (answers.tongue === 'coated') { scores['Phlegm-Dampness'] += 2; scores['Damp-Heat'] += 2; }
    if (answers.pain === 'none') scores['Balanced'] += 1;
    if (answers.pain === 'fixed') scores['Blood Stasis'] += 3;
    if (answers.pain === 'moving') { scores['Qi Stagnation'] += 2; scores['Phlegm-Dampness'] += 1; }
    if (answers.pain === 'allergy') scores['Special Diathesis'] += 4;
    if (answers.weight === 'balanced') scores['Balanced'] += 1;
    if (answers.weight === 'gain') { scores['Phlegm-Dampness'] += 3; scores['Yang Deficiency'] += 1; }
    if (answers.weight === 'lose') { scores['Yin Deficiency'] += 2; scores['Qi Deficiency'] += 1; }
    if (answers.weight === 'stasis') scores['Blood Stasis'] += 3;
    return scores;
}

// ============================================================
//  STATE
// ============================================================
let currentBodyType = null;
let chatHistory = [];
let currentQuestion = 0;
let answers = {};
let isWaiting = false;
let abortController = null;

// ============================================================
//  PHOTO
// ============================================================
function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('photo-preview');
        const icon = document.getElementById('photo-icon');
        img.src = e.target.result;
        img.style.display = 'block';
        icon.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ============================================================
//  PROMPT
// ============================================================
function getSystemPrompt(ragContext = '') {
    const bodyInfo = currentBodyType ? CONSTITUTIONS[currentBodyType] : null;

    const bodySection = bodyInfo
        ? `## User's TCM Constitution
Type: **${currentBodyType}** (${bodyInfo.cn})
Description: ${bodyInfo.desc}
Key characteristics: ${bodyInfo.traits.join(', ')}

All dietary advice MUST be tailored to this specific constitution.`
        : `## User's TCM Constitution
Not yet assessed. If the user asks about diet without a constitution, provide general TCM dietary guidance and gently suggest taking the assessment.`;

    const ragSection = ragContext
        ? `\n## 📚 TCM Knowledge Base Reference (tcm.txt)
The following passages are retrieved as reference material. Use them as a starting point, but you are NOT limited to them.

Guidelines:
1. Use the retrieved passages to ground your answer, but supplement freely with your own TCM knowledge.
2. When the user asks "what else", "any more", or "besides those" — your response MUST contain NEW items not already mentioned in this conversation. Check the chat history first.
3. Do NOT re-recommend foods or herbs already suggested earlier in this session.
4. You do not need to label which knowledge comes from the database vs your own — integrate naturally.
5. The database reflects one source; your broader TCM knowledge is equally valid.

Retrieved passages:
${ragContext}

---`
        : '';

    return `You are a knowledgeable, warm Traditional Chinese Medicine (TCM) dietary therapy practitioner.

${bodySection}
${ragSection}
## Anti-Repetition Rule
Before recommending any food or herb, mentally review this entire conversation.
- NEVER suggest something already recommended in this session.
- If the user says "what else", "any more", or "besides those" — treat this as a strict instruction to give ONLY new items not yet discussed.
- If you are running low on RAG-sourced options, expand into your own TCM knowledge without hesitation.

## Conversation Intelligence
- Build on what was already said. Do NOT repeat yourself.
- Reference earlier parts of the conversation naturally (e.g. "Beyond the red dates we discussed earlier...").

## Response Quality
- Explain the TCM reasoning clearly.
- List specific recommended foods with brief reasons.
- Suggest 1–2 simple practical preparations.
- For recipes: Give a real, detailed recipe with ingredients, steps, and TCM benefits.

## Tone & Boundaries
- Warm but knowledgeable.
- Use Chinese food/herb names with English in parentheses when helpful.
- Focus on food and lifestyle, not pharmaceutical prescriptions.`;
}

// ============================================================
//  ASSESSMENT MODAL
// ============================================================
function openModal() {
    currentQuestion = 0;
    answers = {};
    document.getElementById('modal-overlay').classList.add('active');
    renderQuestion();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function renderQuestion() {
    const q = QUESTIONS[currentQuestion];
    const total = QUESTIONS.length;
    const body = document.getElementById('modal-body');

    document.getElementById('step-indicator').textContent = `Step ${currentQuestion + 1} of ${total}`;
    document.getElementById('modal-title').textContent = 'TCM Constitution Assessment';
    document.getElementById('modal-progress').style.width = `${(currentQuestion / total) * 100}%`;
    document.getElementById('btn-back').style.display = currentQuestion > 0 ? 'block' : 'none';
    document.getElementById('btn-next').disabled = !answers[q.id];
    document.getElementById('btn-next').textContent = currentQuestion === total - 1 ? 'See Results →' : 'Next →';
    document.getElementById('btn-next').onclick = nextQuestion;

    body.innerHTML = `
    <div class="question-block active">
      <div class="question-text">${q.text}</div>
      <div class="question-sub">${q.sub}</div>
      <div class="options-grid">
        ${q.options.map(opt => `
          <div class="option-card ${answers[q.id] === opt.value ? 'selected' : ''}"
               onclick="selectOption('${q.id}', '${opt.value}', this)">
            <div class="option-icon">${opt.icon}</div>
            <div class="option-title">${opt.title}</div>
            <div class="option-desc">${opt.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function selectOption(questionId, value, el) {
    answers[questionId] = value;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('btn-next').disabled = false;
}

function nextQuestion() {
    if (!answers[QUESTIONS[currentQuestion].id]) return;
    if (currentQuestion < QUESTIONS.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        showResults();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function showResults() {
    const scores = calculateConstitution(answers);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topConstitution = sorted[0][0];
    const maxScore = sorted[0][1];
    const info = CONSTITUTIONS[topConstitution];

    currentBodyType = topConstitution;
    chatHistory = [];

    updateConstitutionDisplay(info);
    document.getElementById('header-subtitle').textContent = `Constitution: ${info.en} · ${info.cn}`;

    document.getElementById('step-indicator').textContent = 'Assessment Complete';
    document.getElementById('modal-title').textContent = 'Your TCM Constitution';
    document.getElementById('modal-progress').style.width = '100%';
    document.getElementById('btn-back').style.display = 'none';
    document.getElementById('btn-next').textContent = 'Start Consultation →';
    document.getElementById('btn-next').disabled = false;
    document.getElementById('btn-next').onclick = () => {
        closeModal();
        const introMsg = `Your constitution has been identified as **${info.en}** (${info.cn}).

${info.desc}

Key characteristics: ${info.traits.join(' · ')}

I'm ready to give you personalized dietary guidance based on your constitution. You can ask me about:
- Foods and ingredients to focus on or avoid
- Seasonal eating recommendations
- Specific symptoms you want to address
- Recipes suited to your body type
- General questions about TCM nutrition

What would you like to explore?`;
        addSystemMessage(introMsg);
    };

    const scoreRows = sorted.slice(0, 6).map(([name, score]) => {
        const pct = Math.round((score / maxScore) * 100);
        return `<div class="score-row">
      <span class="score-row-name">${name}</span>
      <div class="score-bar-bg"><div class="score-bar-fill ${name === topConstitution ? 'top' : ''}" style="width:${pct}%"></div></div>
      <span style="font-size:0.75rem;color:rgba(245,239,224,0.4);width:30px;text-align:right">${pct}%</span>
    </div>`;
    }).join('');

    document.getElementById('modal-body').innerHTML = `
    <div id="result-screen" style="display:block">
      <div class="result-header">
        <div class="result-constitution-cn">${info.cn}</div>
        <div class="result-constitution-en">${info.en} Constitution</div>
        <p class="result-desc">${info.desc}</p>
        <div class="result-traits">${info.traits.map(t => `<span class="trait-pill">${t}</span>`).join('')}</div>
      </div>
      <div class="scores-list">
        <div style="font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,239,224,0.3);margin-bottom:12px">Constitution Score Breakdown</div>
        ${scoreRows}
      </div>
    </div>
  `;
}

function updateConstitutionDisplay(info) {
    document.getElementById('constitution-display').innerHTML = `
    <div class="constitution-card">
      <span class="constitution-cn">${info.cn}</span>
      <div class="constitution-name">${info.en}</div>
      <p class="constitution-desc">${info.desc}</p>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">
        ${info.traits.map(t => `<span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:rgba(200,148,42,0.1);border:1px solid rgba(200,148,42,0.2);color:var(--gold-light)">${t}</span>`).join('')}
      </div>
    </div>
  `;
}

// ============================================================
//  MARKDOWN RENDERER
// ============================================================
function renderMarkdown(text) {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html
        .split(/\n{2,}/)
        .map(block => {
            block = block.trim();
            if (!block) return '';
            if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') || block.startsWith('<hr') || block.startsWith('<li')) return block;
            return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
        })
        .join('');

    return html;
}

// ============================================================
//  CHAT UI HELPERS
// ============================================================
function addSystemMessage(text) {
    const welcome = document.getElementById('welcome-state');
    if (welcome) welcome.remove();
    appendMessage('assistant', text);
    chatHistory.push({ role: 'assistant', content: text });
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const welcome = document.getElementById('welcome-state');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `message ${role}`;

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'You' : 'TCM Oracle';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (role === 'assistant') {
        bubble.innerHTML = renderMarkdown(text);
    } else {
        bubble.textContent = text;
    }

    div.appendChild(label);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function appendStreamingMessage() {
    const container = document.getElementById('chat-messages');
    const welcome = document.getElementById('welcome-state');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = 'message assistant';

    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = 'TCM Oracle';

    const typing = document.createElement('div');
    typing.className = 'typing-dots';
    typing.innerHTML = '<span></span><span></span><span></span>';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.style.display = 'none';

    div.appendChild(label);
    div.appendChild(typing);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    return { typing, bubble, container, div };
}

function renderSendBtn(isStreaming) {
    const btn = document.getElementById('send-btn');
    if (isStreaming) {
        btn.disabled = false;
        btn.title = '停止输出';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="var(--ink)">
      <rect x="6" y="6" width="12" height="12" rx="1"/>
    </svg>`;
        btn.onclick = () => {
            if (abortController) abortController.abort();
        };
    } else {
        btn.title = '发送';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M2 12L22 2L12 22L10 13L2 12Z"/></svg>`;
        btn.onclick = sendMessage;
    }
}

// ============================================================
//  MAIN CHAT LOGIC WITH PDF DOWNLOAD SUPPORT
// ============================================================
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || isWaiting) return;

    input.value = '';
    input.style.height = 'auto';
    isWaiting = true;
    renderSendBtn(true);

    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    const { typing, bubble, container, div } = appendStreamingMessage();

    window.__currentBodyType = currentBodyType || '';

    let ragContext = '';
    if (window.isRagReady && window.isRagReady()) {
        try {
            ragContext = await window.retrieveContext(text);
        } catch (e) {
            console.warn('[RAG] 检索失败，跳过:', e);
        }
    }

    const hasRag = ragContext.trim().length > 0;

    try {
        const apiMessages = chatHistory.slice();
        abortController = new AbortController();

        typing.remove();
        bubble.style.display = 'block';

        let streamedText = ''; 

        const finalReply = await sendWithTools(
            apiMessages,
            getSystemPrompt(ragContext),
            (token) => {
                streamedText += token;
                const display = streamedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                bubble.innerHTML = renderMarkdown(display);
                container.scrollTop = container.scrollHeight;
            },
            abortController.signal
        );

        const cleanedReply = finalReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        bubble.innerHTML = renderMarkdown(cleanedReply);

        if (hasRag) {
            const badge = document.createElement('div');
            badge.className = 'rag-badge';
            badge.textContent = '⟐ Cited from the tcm.txt knowledge base';
            div.appendChild(badge);
        }

        // ==========================================
        // [PDF 下载功能] 检测是否为生成的报告
        // ==========================================
        const isReport = /(report|报告|constitution|体质|overview|strengths)/i.test(cleanedReply) && cleanedReply.length > 150;
        
        if (isReport) {
            const pdfContainer = document.createElement('div');
            pdfContainer.style.marginTop = '12px';
            
            const pdfBtn = document.createElement('button');
            pdfBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg> Download PDF report
            `;
            // 内联样式确保美观，你也可以稍后把它移到 CSS 里
            pdfBtn.style.cssText = 'padding: 8px 14px; background: #c8942a; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: center; transition: background 0.2s; font-family: inherit; box-shadow: 0 2px 5px rgba(0,0,0,0.1);';
            
            pdfBtn.onmouseover = () => pdfBtn.style.background = '#b08122';
            pdfBtn.onmouseout = () => pdfBtn.style.background = '#c8942a';

            pdfBtn.onclick = async () => {
                const originalText = pdfBtn.innerHTML;
                pdfBtn.innerHTML = '⏳ Downloading...';
                pdfBtn.disabled = true;
                pdfBtn.style.opacity = '0.7';
                
                // 1. 动态加载 html2pdf 库（只在第一次点击时加载，不拖慢页面速度）
                if (!window.html2pdf) {
                    await new Promise(res => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                        script.onload = res;
                        document.head.appendChild(script);
                    });
                }

                // 2. 克隆气泡元素以调整打印样式，确保即使在暗黑模式下，打印出的 PDF 也是白底黑字
                const printElement = bubble.cloneNode(true);
                printElement.style.color = '#1a1a1a'; 
                printElement.style.background = '#ffffff';
                printElement.style.padding = '30px';
                printElement.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                printElement.style.lineHeight = '1.6';
                
                // 为了美观，在顶部插入一个标题
                const header = document.createElement('div');
                header.innerHTML = '<h2 style="border-bottom: 2px solid #c8942a; padding-bottom: 10px; margin-bottom: 20px; color: #c8942a;">TCM Constitution Health Report</h2>';
                printElement.insertBefore(header, printElement.firstChild);

                const opt = {
                    margin:       10,
                    filename:     `TCM_Report_${new Date().toISOString().slice(0,10)}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // 3. 生成并保存
                html2pdf().set(opt).from(printElement).save().then(() => {
                    pdfBtn.innerHTML = '✓ Download successfully';
                    setTimeout(() => {
                        pdfBtn.innerHTML = originalText;
                        pdfBtn.disabled = false;
                        pdfBtn.style.opacity = '1';
                    }, 3000);
                });
            };
            
            pdfContainer.appendChild(pdfBtn);
            div.appendChild(pdfContainer);
        }

        chatHistory.push({ role: 'assistant', content: cleanedReply });

    } catch (err) {
        if (err.name === 'AbortError') {
            typing.remove();
            bubble.style.display = 'block';
            if (typeof streamedText !== 'undefined' && streamedText.trim()) {
                const display = streamedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                bubble.innerHTML = renderMarkdown(display);
                chatHistory.push({ role: 'assistant', content: display });
            } else {
                bubble.innerHTML = `<span class="error-note">Stopped</span>`;
                chatHistory.pop();
            }
        } else {
            typing.remove();
            bubble.style.display = 'block';
            bubble.innerHTML = `<span class="error-note">⚠ Error: ${err.message}</span>`;
            chatHistory.pop();
        }
    } finally {
        isWaiting = false;
        abortController = null;
        renderSendBtn(false);
    }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

document.getElementById('chat-input').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ============================================================
//  全局挂载区
// ============================================================
window.openModal = openModal;
window.closeModal = closeModal;
window.selectOption = selectOption;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.handlePhoto = handlePhoto;