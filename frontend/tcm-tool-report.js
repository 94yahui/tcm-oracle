

// ============================================================
//  1. TOOL DEFINITION
//  Pass TCM_TOOLS as the `tools` field in every API request.
// ============================================================
export const TCM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_constitution_report',
      description:
        'Generate a structured TCM constitution health report for the user. ' +
        'Call this tool whenever the user asks to: summarize their body type, ' +
        'get a full health report, understand their TCM constitution, ' +
        'or asks what their constitution means for their health.',
      parameters: {
        type: 'object',
        properties: {
          constitution: {
            type: 'string',
            enum: [
              'Balanced', 'Qi Deficiency', 'Yang Deficiency', 'Yin Deficiency',
              'Phlegm-Dampness', 'Damp-Heat', 'Blood Stasis', 'Qi Stagnation', 'Special Diathesis'
            ],
            description: "The user's TCM constitution type, identified from the assessment."
          },
          sections: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['overview', 'strengths', 'vulnerabilities', 'lifestyle', 'diet_principles', 'emotions', 'seasons']
            },
            description: 'Which report sections to include. Omit to include all sections.'
          },
          language: {
            type: 'string',
            enum: ['en', 'zh', 'bilingual'],
            description: 'Language for the report content. Default: bilingual.'
          }
        },
        required: ['constitution']
      }
    }
  }
];


// ============================================================
//  2. KNOWLEDGE BASE
//  Static data — no external API needed.
//  Extend this object to enrich report content.
// ============================================================
const CONSTITUTION_DB = {
  'Balanced': {
    cn: '平和质',
    organ_system: 'All organs in harmony / 五脏调和',
    key_principle: 'Maintain balance; no extreme interventions needed.',
    strengths: [
      'Strong immunity and disease resistance',
      'Stable, sustained energy throughout the day',
      'Sound digestion and healthy appetite',
      'Emotional resilience and adaptability',
      'Naturally long lifespan tendency'
    ],
    vulnerabilities: [
      'Can be disrupted by prolonged extreme lifestyle habits',
      'Overindulgence in food or stress may gradually shift constitution'
    ],
    lifestyle: [
      'Moderate daily exercise (30–45 min)',
      'Maintain regular meal and sleep times',
      'Aim for 7–8 hours of quality sleep',
      'Avoid extremes in diet, emotion, or physical exertion'
    ],
    diet_principles: [
      'Eat a wide variety of whole, minimally processed foods',
      'No strict restrictions — emphasise moderation and diversity',
      'Beneficial: yam (山药), lotus seeds (莲子), goji berries (枸杞), brown rice',
      'Keep meals warm and regular; avoid skipping breakfast'
    ],
    emotional_tendency: 'Naturally calm and optimistic. Generally emotionally stable.',
    emotional_guidance: 'Maintain a positive outlook. Avoid unnecessary over-analysis.',
    season_sensitivity: 'Adapts well to all seasons with minor dietary adjustments.',
    season_notes: {
      spring: 'Light liver-supportive foods (leeks, sprouts).',
      summer: 'Slightly cooling foods (cucumber, mung bean).',
      autumn: 'Moistening foods (pear, honey, sesame).',
      winter: 'Mildly warming foods (lamb, ginger, walnuts).'
    }
  },

  'Qi Deficiency': {
    cn: '气虚质',
    organ_system: 'Spleen & Lung Qi deficiency / 脾肺气虚',
    key_principle: 'Tonify and replenish Qi (vital energy); avoid over-exertion and over-sweating.',
    strengths: [
      'Gentle, considerate disposition',
      'Cautious and thoughtful decision-making'
    ],
    vulnerabilities: [
      'Fatigue easily, even after mild activity',
      'Shortness of breath; low physical stamina',
      'Frequent colds and infections (weak Wei Qi)',
      'Poor concentration and memory',
      'Tendency toward organ prolapse (uterus, stomach)',
      'Low immune response'
    ],
    lifestyle: [
      'Light, regular exercise: tai chi, qigong, walking (avoid intense sweating)',
      'Post-lunch rest (20–30 min nap)',
      'Abdominal breathing exercises daily',
      'Protect from wind and cold drafts',
      'Avoid over-talking or excessive mental work'
    ],
    diet_principles: [
      'Sweet, warm, easy-to-digest foods that tonify the Spleen',
      'Beneficial: astragalus broth (黄芪汤), Chinese yam (山药), codonopsis (党参), millet congee, lotus seeds, chicken, jujube dates (大枣), longan (龙眼)',
      'Avoid: raw/cold foods, iced drinks, turnip (daikon — dissipates Qi), bitter gourd in excess',
      'Eat warm, cooked meals; avoid skipping meals'
    ],
    emotional_tendency: 'Tendency to worry and overthink; can become anxious under pressure.',
    emotional_guidance: 'Practice simple mindfulness or gentle breathing. Avoid overthinking. Social warmth is restorative.',
    season_sensitivity: 'Most vulnerable during spring and autumn (wind and cold transitions).',
    season_notes: {
      spring: 'Protect from wind; start gentle outdoor exercise.',
      summer: 'Moderate activity; avoid over-sweating; replenish fluids.',
      autumn: 'Tonify Lung Qi; astragalus teas; layer up early.',
      winter: 'Focus on Kidney-Spleen tonification; warming congees; conserve energy.'
    }
  },

  'Yang Deficiency': {
    cn: '阳虚质',
    organ_system: 'Kidney & Spleen Yang deficiency / 肾脾阳虚',
    key_principle: 'Warm and nourish Yang energy; strictly avoid cold foods, environments, and beverages.',
    strengths: [
      'Patient, calm, and unhurried temperament',
      'Tolerant and steady under normal conditions'
    ],
    vulnerabilities: [
      'Persistent cold hands, feet, and lower back',
      'Edema and water retention',
      'Reduced libido and reproductive vitality',
      'Joint stiffness and pain worsened by cold',
      'Loose stools, especially in cold weather',
      'Pallor and low vitality'
    ],
    lifestyle: [
      'Stay warm at all times — especially lower back, abdomen, and feet',
      'Morning sun exposure (20–30 min)',
      'Gentle warming exercise: brisk walking, light jogging',
      'Warm baths or foot soaks (ginger + mugwort)',
      'Eliminate cold and iced drinks entirely'
    ],
    diet_principles: [
      'Warming, Yang-tonifying foods cooked by boiling or stewing',
      'Beneficial: lamb (羊肉), ginger (生姜), garlic, leeks, walnuts (核桃), cinnamon, black sesame, chestnuts, cordyceps (冬虫夏草), dried longan',
      'Avoid: watermelon, cucumber, crab, raw pear, iced drinks, mung beans, persimmon',
      'All foods should be served warm or hot; avoid refrigerator-cold foods'
    ],
    emotional_tendency: 'Tendency toward low mood, withdrawal, and low motivation.',
    emotional_guidance: 'Seek sunlight and social warmth. Morning routines and gentle movement boost Yang-Qi and mood.',
    season_sensitivity: 'Extremely sensitive to winter cold. Thrives in warm summer months.',
    season_notes: {
      spring: 'Gradually increase outdoor time as temperature rises.',
      summer: 'Most comfortable season — moderate sun exposure; don\'t over-use air conditioning.',
      autumn: 'Begin warming diet and layering clothing early.',
      winter: 'Critical season — prioritise warmth, tonifying soups, and early sleep.'
    }
  },

  'Yin Deficiency': {
    cn: '阴虚质',
    organ_system: 'Kidney & Liver Yin deficiency / 肾肝阴虚',
    key_principle: 'Nourish and replenish Yin fluids; clear deficiency heat; calm internal fire.',
    strengths: [
      'Sharp intellect and strong focus',
      'Goal-oriented and driven',
      'Often quick-thinking and perceptive'
    ],
    vulnerabilities: [
      'Night sweats and afternoon low-grade fever',
      'Dry eyes, dry mouth, dry skin',
      'Irritability and emotional reactivity',
      'Insomnia — difficulty falling or staying asleep',
      'Constipation with dry stools',
      'Tinnitus and dizziness'
    ],
    lifestyle: [
      'Avoid spicy, fried, and drying foods',
      'Sleep by 11 pm — Yin regenerates between 11 pm–3 am',
      'Swimming and yoga are ideal exercise (cooling, non-depleting)',
      'Daily meditation or calm breathing (5–10 min)',
      'Avoid excessive sweating from exercise'
    ],
    diet_principles: [
      'Sour and sweet cooling foods that generate Yin fluids',
      'Beneficial: black sesame (黑芝麻), tremella mushroom (银耳), lily bulb (百合), wolfberry (枸杞), duck, pork, sea cucumber, mulberry, honey, tofu, pear (梨), oyster',
      'Avoid: garlic, ginger, chili, lamb, alcohol, fried foods, excessive coffee, leeks',
      'Favour steaming, boiling, stewing; avoid deep-frying and dry-roasting'
    ],
    emotional_tendency: 'Anxious, easily irritated, restless mind — especially at night.',
    emotional_guidance: 'Practice evening wind-down rituals. Avoid screens before bed. Rose or lily tea calms the Shen.',
    season_sensitivity: 'Symptoms worsen in dry hot summer and autumn. Best in cool, moist spring.',
    season_notes: {
      spring: 'Most comfortable season — maintain routines.',
      summer: 'Avoid heat; cooling foods critical; limit outdoor midday activity.',
      autumn: 'Increase Yin-moistening foods aggressively (tremella, pear, honey).',
      winter: 'Avoid over-heating interiors; continue Yin tonification.'
    }
  },

  'Phlegm-Dampness': {
    cn: '痰湿质',
    organ_system: 'Spleen Qi deficiency with dampness accumulation / 脾虚痰湿',
    key_principle: 'Resolve dampness, invigorate Spleen function, move Qi and fluids.',
    strengths: [
      'Patient, tolerant, and easy-going temperament',
      'Steady and persistent in long-term tasks'
    ],
    vulnerabilities: [
      'Easy weight gain; difficulty losing weight',
      'High risk of metabolic syndrome and diabetes',
      'Sleep apnea and heavy snoring',
      'Joint heaviness and stiffness',
      'High cholesterol and triglycerides',
      'Heavy, foggy mental clarity'
    ],
    lifestyle: [
      'Regular aerobic exercise — key for resolving dampness (30–60 min daily)',
      'Avoid prolonged sitting; stand or walk every hour',
      'Dry, warm living environment — avoid damp basements',
      'Eat slowly and mindfully; no eating late at night',
      'Morning exercise is especially beneficial'
    ],
    diet_principles: [
      'Bitter (drying), pungent (moving), and light foods; strict limits on sweet and greasy',
      'Beneficial: job\'s tears (薏苡仁), adzuki beans (赤小豆), winter melon (冬瓜), radish, seaweed, lotus leaf tea, bitter gourd, tangerine peel (陈皮), coix seed, green tea',
      'Avoid: pork fat, excessive dairy, sugar, alcohol, glutinous rice, coconut milk, fried foods, banana',
      'Eat smaller portions; avoid eating until overly full'
    ],
    emotional_tendency: 'Laid-back, occasionally lethargic or mentally sluggish.',
    emotional_guidance: 'Social engagement and movement break the stagnation cycle. Avoid excessive screen time and passivity.',
    season_sensitivity: 'Symptoms significantly worsen in humid late summer and prolonged rainy seasons.',
    season_notes: {
      spring: 'Begin aerobic exercise routine as weather warms.',
      summer: 'Avoid over-cooling with air conditioning; stay active.',
      late_summer: 'Most difficult season — prioritise dampness-resolving foods and exercise.',
      winter: 'Avoid heavy warming stews; continue movement despite cold.'
    }
  },

  'Damp-Heat': {
    cn: '湿热质',
    organ_system: 'Liver, Gallbladder & Spleen damp-heat accumulation / 肝胆脾胃湿热',
    key_principle: 'Clear heat, resolve dampness, calm Liver; eliminate alcohol and greasy foods.',
    strengths: [
      'High natural energy and drive',
      'Tenacious and action-oriented'
    ],
    vulnerabilities: [
      'Acne, rosacea, and skin inflammation',
      'Eczema and inflammatory skin conditions',
      'Urinary tract infection tendency',
      'Liver and gallbladder congestion risk',
      'Irritable bowel and urgency',
      'Bitter taste in the mouth; bad breath'
    ],
    lifestyle: [
      'Completely eliminate alcohol and greasy, fried foods',
      'Live and work in cool, airy environments',
      'Evening exercise helps release accumulated heat',
      'Stress and anger management is critical (worsens Liver heat)',
      'Adequate hydration (2L+ water daily)'
    ],
    diet_principles: [
      'Bitter cooling and sour foods to clear heat and drain dampness',
      'Beneficial: mung beans (绿豆), lotus seeds, bitter gourd, celery, chrysanthemum tea (菊花茶), coix seeds, loofah, purslane, water spinach, green tea, burdock root',
      'Avoid: alcohol, spicy food, lamb, chili, fried foods, litchi, durian',
      'Raw vegetables and cool foods are more suitable for this type than others'
    ],
    emotional_tendency: 'Irritable, short-tempered, and impulsive under stress.',
    emotional_guidance: 'Physical exercise is the best emotional outlet. Avoid suppressing anger. Chrysanthemum and lotus leaf teas calm Liver heat.',
    season_sensitivity: 'Significantly worsens in hot, humid summer. Relatively better in cool, dry autumn.',
    season_notes: {
      spring: 'Liver-heat can flare — increase bitter cooling foods.',
      summer: 'Most challenging season — cooling diet and cool environments essential.',
      autumn: 'Good recovery season — maintain heat-clearing habits.',
      winter: 'Don\'t over-warm; continue bitter cooling approach with adjustments.'
    }
  },

  'Blood Stasis': {
    cn: '血瘀质',
    organ_system: 'Heart & Liver blood stagnation / 心肝血瘀',
    key_principle: 'Invigorate blood circulation, resolve stasis, warm the meridians.',
    strengths: [
      'Determined and persistent character',
      'Detail-oriented and thorough',
      'Strong sense of purpose'
    ],
    vulnerabilities: [
      'Elevated cardiovascular disease risk',
      'Painful menstruation with dark clots',
      'Dark spots, age spots, spider veins',
      'Fixed, stabbing pain — often worse at night',
      'Poor peripheral circulation; cold extremities',
      'Dull, dark complexion and dark under-eye circles'
    ],
    lifestyle: [
      'Daily moderate movement — walking, dancing, gentle cardio (non-negotiable)',
      'Avoid prolonged sitting, cold environments, and sedentary lifestyle',
      'Emotional release practice — holding emotions stagnates blood',
      'Acupuncture and therapeutic massage are highly beneficial',
      'Avoid tight, restrictive clothing'
    ],
    diet_principles: [
      'Pungent (blood-moving) and mildly sweet foods; avoid cold and astringent',
      'Beneficial: hawthorn (山楂), rose bud tea, turmeric, black fungus (木耳), onion, vinegar-dressed dishes, peach, safflower tea (红花茶), eggplant, salmon, lotus root',
      'Avoid: ice cream and cold foods, astringent foods, bitter gourd in excess',
      'A small amount of rice wine (料酒) used in cooking can assist blood movement'
    ],
    emotional_tendency: 'Tendency to hold grudges, suppress emotions, or experience depression.',
    emotional_guidance: 'Cultivate emotional expression and forgiveness. Regular movement and social connection are therapeutic.',
    season_sensitivity: 'Worsens significantly in cold winter (cold contracts blood vessels). Improves with spring warmth.',
    season_notes: {
      spring: 'Best recovery season — increase movement and blood-moving foods.',
      summer: 'Warmth benefits circulation — stay active.',
      autumn: 'Begin warming diet before cold sets in.',
      winter: 'Most critical season — warmth, movement, and blood-moving foods are essential.'
    }
  },

  'Qi Stagnation': {
    cn: '气郁质',
    organ_system: 'Liver Qi stagnation / 肝气郁滞',
    key_principle: 'Move and soothe Qi flow; calm the Shen (spirit); address emotional roots.',
    strengths: [
      'Creative, imaginative, and artistic',
      'Highly empathetic and emotionally perceptive',
      'Intuitive and introspective'
    ],
    vulnerabilities: [
      'Depression and persistent low mood',
      'Anxiety and excessive worry',
      'PMS and breast tenderness',
      'Insomnia with difficulty falling asleep',
      'Chest tightness and frequent sighing',
      'Hypochondria and health anxiety'
    ],
    lifestyle: [
      'Social activities and meaningful human connection',
      'Nature walks — especially in open, expansive spaces',
      'Creative expression: music, art, journaling, dance',
      'Avoid prolonged isolation or overly routine-bound living',
      'Regular laughter and light-hearted entertainment'
    ],
    diet_principles: [
      'Sour (Liver-moving) and pungent (Qi-circulating) foods; avoid cold and heavy',
      'Beneficial: rose bud tea (玫瑰花茶), jasmine tea, bergamot (佛手柑), citrus peel (陈皮), hawthorn, leeks, fennel, turmeric, radish, kelp, buckwheat',
      'Avoid: cold drinks, heavy greasy food, excessive alcohol, excessive caffeine',
      'Avoid eating alone frequently — shared meals benefit Qi flow'
    ],
    emotional_tendency: 'Easily stressed; represses emotions; overthinks; sensitive to criticism.',
    emotional_guidance: 'Regular emotional release is medicine. Therapy, journaling, exercise, and trusted social bonds are core treatments.',
    season_sensitivity: 'Symptoms worsen in winter (low light, isolation) and periods of high stress.',
    season_notes: {
      spring: 'Best season for Qi Stagnation — increase outdoor activity and social engagement.',
      summer: 'Warmth and activity naturally relieve stagnation.',
      autumn: 'Watch for mood dips as light decreases — increase social connection.',
      winter: 'Most challenging — prioritise light exposure, movement, and social warmth.'
    }
  },

  'Special Diathesis': {
    cn: '特禀质',
    organ_system: 'Lung & Wei Qi (defensive energy) weakness with inherited sensitivity / 肺卫气虚特禀',
    key_principle: 'Tonify defensive Wei Qi; systematically identify and avoid all personal triggers.',
    strengths: [
      'Heightened sensory awareness and perception'
    ],
    vulnerabilities: [
      'Allergic rhinitis, asthma, and respiratory allergies',
      'Skin allergies, urticaria, and eczema',
      'Food intolerance and digestive allergies',
      'Drug sensitivity and unusual medication reactions',
      'Seasonal allergic reactions (pollen, mold)',
      'Cross-reactive immune responses'
    ],
    lifestyle: [
      'Maintain a detailed personal allergy and trigger diary',
      'Minimise known allergen exposure proactively',
      'Strengthen immunity gradually — consistent gentle exercise',
      'Maintain high indoor air quality (HEPA filtration)',
      'Gradual seasonal exposure hardening under professional guidance'
    ],
    diet_principles: [
      'Gentle Qi and Wei Qi-tonifying foods; strict avoidance of known personal allergens',
      'Beneficial: astragalus tea (黄芪茶), codonopsis (党参), purple sweet potato, well-cooked whole grains, pear (anti-allergenic properties)',
      'Avoid: all personal allergens (highly individual — must identify through elimination diet), shellfish if reactive, artificial additives and preservatives, extremely hot or cold foods',
      'Introduce new foods one at a time; track reactions carefully'
    ],
    emotional_tendency: 'Can be anxious and hypervigilant about health and environment.',
    emotional_guidance: 'Work to build confidence gradually. Accurate trigger knowledge reduces anxiety. Professional allergy guidance is key.',
    season_sensitivity: 'Spring (pollen season) and dry autumn (mold spores) are most challenging.',
    season_notes: {
      spring: 'Highest risk season — minimise outdoor exposure on high-pollen days.',
      summer: 'Generally manageable — watch for heat rash and food allergies.',
      autumn: 'Second most challenging — mold spores and dry air trigger reactions.',
      winter: 'Indoor allergens (dust mites, pet dander) become dominant concerns.'
    }
  }
};


// ============================================================
//  3. TOOL EXECUTOR
//  Called when the model returns a tool_call in its response.
// ============================================================
export function executeTool(toolName, toolArgs) {
  if (toolName !== 'generate_constitution_report') {
    return { error: `Unknown tool: ${toolName}` };
  }

  const { constitution, sections, language = 'bilingual' } = toolArgs;
  const data = CONSTITUTION_DB[constitution];

  if (!data) {
    return { error: `Unknown constitution: "${constitution}". Valid values: ${Object.keys(CONSTITUTION_DB).join(', ')}` };
  }

  const include = sections?.length
    ? sections
    : ['overview', 'strengths', 'vulnerabilities', 'lifestyle', 'diet_principles', 'emotions', 'seasons'];

  const report = {
    constitution,
    cn: data.cn,
    display_name: language === 'zh' ? data.cn : language === 'en' ? constitution : `${constitution} (${data.cn})`
  };

  if (include.includes('overview')) {
    report.overview = {
      organ_system: data.organ_system,
      key_principle: data.key_principle
    };
  }

  if (include.includes('strengths')) {
    report.strengths = data.strengths;
  }

  if (include.includes('vulnerabilities')) {
    report.vulnerabilities = data.vulnerabilities;
    report.health_risks_summary = `${data.vulnerabilities.length} key vulnerability areas identified.`;
  }

  if (include.includes('lifestyle')) {
    report.lifestyle_guidelines = data.lifestyle;
  }

  if (include.includes('diet_principles')) {
    report.diet_principles = data.diet_principles;
  }

  if (include.includes('emotions')) {
    report.emotional_profile = {
      tendency: data.emotional_tendency,
      guidance: data.emotional_guidance
    };
  }

  if (include.includes('seasons')) {
    report.seasonal_profile = {
      sensitivity_summary: data.season_sensitivity,
      seasonal_notes: data.season_notes
    };
  }

  return report;
}


// ============================================================
//  4. MAIN API WRAPPER — sendWithTools()
//
//  Replaces your existing fetch('/v1/chat/completions') block.
//  Handles: tool_call detection → local execution → result
//  injection → final streaming reply.
//
//  @param {Array}    messages     Full conversation history
//  @param {string}   systemPrompt Your existing getSystemPrompt() output
//  @param {Function} onToken      Callback(token: string) for streaming
//  @param {AbortSignal} signal    From AbortController (for stop button)
//  @returns {Promise<string>}     Final assistant reply text
// ============================================================
export async function sendWithTools(messages, systemPrompt, onToken, signal) {
  const MAX_ROUNDS = 3;
  let workingMessages = [...messages];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const isFirstRound = round === 0;

    const body = {
      model: 'qwen2.5-7b-instruct',
      messages: [{ role: 'system', content: systemPrompt }, ...workingMessages],
      stream: true,
      ...(isFirstRound && { tools: TCM_TOOLS, tool_choice: 'auto' })
    };

    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer null' },
      signal,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const { text, toolCalls } = await _parseStream(response, onToken);

    // No tool calls → this is the final answer
    if (!toolCalls?.length) {
      return text;
    }

    // Has tool calls → execute locally, inject results, loop
    workingMessages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.args) }
      }))
    });

    for (const tc of toolCalls) {
      const result = executeTool(tc.name, tc.args);
      workingMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result)
      });
    }
    // Loop: next round gets the tool result in context and produces final reply
  }

  throw new Error('[sendWithTools] Max rounds reached without a final reply.');
}


// ============================================================
//  5. INTERNAL — streaming parser
//  Accumulates both text deltas and tool_call deltas.
// ============================================================
async function _parseStream(response, onToken) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  const toolBufs = {}; // index → { id, name, argsStr }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (let line of lines) {
      line = line.trim();
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6);
      if (raw === '[DONE]') continue;

      let json;
      try { json = JSON.parse(raw); } catch { continue; }

      const delta = json.choices?.[0]?.delta ?? {};

      // Stream text tokens
      if (delta.content) {
        fullText += delta.content;
        if (typeof onToken === 'function') onToken(delta.content);
      }

      // Accumulate tool_call deltas (streamed in fragments)
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0;
          if (!toolBufs[i]) toolBufs[i] = { id: '', name: '', argsStr: '' };
          if (tc.id)                  toolBufs[i].id      += tc.id;
          if (tc.function?.name)      toolBufs[i].name    += tc.function.name;
          if (tc.function?.arguments) toolBufs[i].argsStr += tc.function.arguments;
        }
      }
    }
  }

  // Parse accumulated tool calls
  const toolCalls = Object.values(toolBufs)
    .filter(b => b.name)
    .map(b => {
      let args = {};
      try { args = JSON.parse(b.argsStr); } catch { /* malformed args */ }
      return { id: b.id || `call_${Date.now()}`, name: b.name, args };
    });

  return { text: fullText, toolCalls: toolCalls.length ? toolCalls : null };
}