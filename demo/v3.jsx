const { useState, useEffect, useRef, useCallback } = React;

// ─── Data ──────────────────────────────────────────────────────────────────────
const STANDS = [
  {
    id: 1, ref: "A-01", hall: "Hall Alpha", zone: "Zone Tech",
    size: 9, price: 2500, available: true, badge: "Entrée VIP",
    col: 0, row: 0, dims: "3 m × 3 m",
    features: ["Angle d'entrée", "WiFi dédié", "Éclairage LED", "Moquette incluse"],
    desc: "Stand d'angle à l'entrée principale du Hall Alpha. Flux de visiteurs maximum, visibilité optimale dès l'ouverture des portes.",
    profile: { budget: "low", size: "s", zone: "Zone Tech", audience: "tech", mood: "visibility" },
  },
  {
    id: 2, ref: "A-08", hall: "Hall Alpha", zone: "Zone Innovation",
    size: 18, price: 4800, available: true, badge: "Grande surface",
    col: 1, row: 0, dims: "6 m × 3 m",
    features: ["Double accès", "Zone démo", "TV 55\"", "3 badges expo"],
    desc: "Vaste espace au cœur du Hall Alpha, parfait pour des animations live et démonstrations produit.",
    profile: { budget: "mid", size: "m", zone: "Zone Innovation", audience: "demo", mood: "experience" },
  },
  {
    id: 3, ref: "B-03", hall: "Hall Beta", zone: "Zone Startup",
    size: 6, price: 1200, available: false, badge: "Compact",
    col: 2, row: 0, dims: "3 m × 2 m",
    features: ["Cloisons fournies", "Éclairage de base", "1 badge expo"],
    desc: "Stand compact idéal pour les startups. Zone très fréquentée, ambiance dynamique tout au long du salon.",
    profile: { budget: "low", size: "s", zone: "Zone Startup", audience: "startup", mood: "networking" },
  },
  {
    id: 4, ref: "A-15", hall: "Hall Alpha", zone: "Zone Premium",
    size: 36, price: 9500, available: true, badge: "VIP",
    col: 0, row: 1, dims: "6 m × 6 m",
    features: ["Lounge privé", "4 écrans 65\"", "Hôtesse dédiée", "Catering inclus", "6 badges"],
    desc: "L'espace d'exposition le plus prestigieux du salon. Lounge privatif et service haut de gamme inclus.",
    profile: { budget: "high", size: "l", zone: "Zone Premium", audience: "enterprise", mood: "prestige" },
  },
  {
    id: 5, ref: "B-11", hall: "Hall Beta", zone: "Zone Tech",
    size: 12, price: 3200, available: true, badge: "Populaire",
    col: 1, row: 1, dims: "4 m × 3 m",
    features: ["Allée centrale", "WiFi dédié", "Comptoir inclus", "2 badges expo"],
    desc: "Position stratégique sur l'allée principale. Fort trafic visiteurs garanti sur toute la durée du salon.",
    profile: { budget: "mid", size: "m", zone: "Zone Tech", audience: "tech", mood: "traffic" },
  },
  {
    id: 6, ref: "C-06", hall: "Hall Gamma", zone: "Zone Innovation",
    size: 24, price: 6100, available: true, badge: "Coup de cœur",
    col: 2, row: 1, dims: "6 m × 4 m",
    features: ["Forme en L", "Espace démo", "TV 65\"", "3 badges expo"],
    desc: "Configuration en L unique pour une présentation 360°. Idéal pour exposer des solutions tech innovantes.",
    profile: { budget: "mid", size: "l", zone: "Zone Innovation", audience: "demo", mood: "experience" },
  },
];

const fmt = (p) => p.toLocaleString("fr-FR") + " €";

// ─── Smart search — NLP-lite natural language parser ──────────────────────────
// Parses user queries like "stand pas cher pour ma startup tech hall alpha"
// into a structured intent, then scores every stand against it.
function parseSmartQuery(q) {
  const s = (q || "").toLowerCase();
  const intent = { budget: null, size: null, zone: null, audience: null, mood: null, hall: null, keywords: [] };
  if (!s.trim()) return intent;

  // Budget
  if (/\b(pas cher|low cost|economique|économique|petit budget|moins cher|abordable|cheap)\b/.test(s)) intent.budget = "low";
  else if (/\b(moyen|milieu de gamme|standard|intermédiaire|medium)\b/.test(s)) intent.budget = "mid";
  else if (/\b(premium|vip|luxe|prestige|haut de gamme|cher)\b/.test(s)) intent.budget = "high";
  const priceMatch = s.match(/(\d{1,2})\s*(?:k|000)/);
  if (priceMatch) {
    const p = parseInt(priceMatch[1], 10) * 1000;
    if (p < 3000) intent.budget = "low";
    else if (p <= 7000) intent.budget = "mid";
    else intent.budget = "high";
  }

  // Size
  if (/\b(petit|compact|small|mini|6 m|9 m)\b/.test(s)) intent.size = "s";
  else if (/\b(moyen|medium|12 m|18 m)\b/.test(s)) intent.size = "m";
  else if (/\b(grand|large|vaste|big|spacieux|24 m|36 m)\b/.test(s)) intent.size = "l";

  // Zone / hall
  if (/\btech\b/.test(s)) intent.zone = "Zone Tech";
  else if (/\binnovation\b/.test(s)) intent.zone = "Zone Innovation";
  else if (/\bstartup\b/.test(s)) intent.zone = "Zone Startup";
  else if (/\bpremium\b/.test(s)) intent.zone = "Zone Premium";
  if (/\balpha|hall a\b/.test(s)) intent.hall = "Hall Alpha";
  else if (/\bbeta|hall b\b/.test(s)) intent.hall = "Hall Beta";
  else if (/\bgamma|hall c\b/.test(s)) intent.hall = "Hall Gamma";

  // Audience
  if (/\b(entreprise|décideur|decideur|b2b|corporate|grande société|c-level)\b/.test(s)) intent.audience = "enterprise";
  else if (/\b(tech|dev|développeur|developpeur|ingénieur|ingenieur|code|api)\b/.test(s)) intent.audience = "tech";
  else if (/\b(startup|jeune pousse|investisseur|investor|vc|fundrais)\b/.test(s)) intent.audience = "startup";
  else if (/\b(grand public|clients?|visiteurs?|démo|demo|public)\b/.test(s)) intent.audience = "demo";

  // Mood / objective
  if (/\b(visibilité|visibilite|entrée|entree|passage|trafic|traffic|flux)\b/.test(s)) intent.mood = "visibility";
  else if (/\b(démo|demo|démonstration|demonstration|présent|presente|show|écran|ecran)\b/.test(s)) intent.mood = "experience";
  else if (/\b(networking|contacts?|meet|réseau|reseau|rencontr)\b/.test(s)) intent.mood = "networking";
  else if (/\b(prestige|vip|luxe|premium|haut de gamme|lounge)\b/.test(s)) intent.mood = "prestige";

  intent.keywords = s.split(/[\s,;]+/).filter((w) => w.length > 2);
  return intent;
}

function scoreStand(stand, intent) {
  let score = 0;
  const p = stand.profile || {};
  if (intent.budget && p.budget === intent.budget) score += 40;
  if (intent.size && p.size === intent.size) score += 25;
  if (intent.zone && stand.zone === intent.zone) score += 30;
  if (intent.hall && stand.hall === intent.hall) score += 25;
  if (intent.audience && p.audience === intent.audience) score += 30;
  if (intent.mood && p.mood === intent.mood) score += 20;
  const hay = (stand.ref + " " + stand.desc + " " + stand.features.join(" ") + " " + stand.badge).toLowerCase();
  for (const k of intent.keywords) if (hay.includes(k)) score += 4;
  return score;
}

function isIntentEmpty(i) {
  return !i.budget && !i.size && !i.zone && !i.hall && !i.audience && !i.mood && i.keywords.length === 0;
}

// ─── AI Quiz questions ─────────────────────────────────────────────────────────
const QUIZ = [
  {
    id: "budget",
    q: "Quel est votre budget pour ce stand ?",
    emoji: "💰",
    options: [
      { label: "Moins de 3 000 €", value: "low" },
      { label: "Entre 3 000 € et 7 000 €", value: "mid" },
      { label: "Plus de 7 000 €", value: "high" },
    ],
  },
  {
    id: "audience",
    q: "Qui souhaitez-vous principalement rencontrer ?",
    emoji: "🎯",
    options: [
      { label: "Décideurs & grandes entreprises", value: "enterprise" },
      { label: "Développeurs & tech community", value: "tech" },
      { label: "Investisseurs & partenaires", value: "startup" },
      { label: "Clients & visiteurs grand public", value: "demo" },
    ],
  },
  {
    id: "mood",
    q: "Quelle ambition principale pour votre stand ?",
    emoji: "🚀",
    options: [
      { label: "Maximum de visibilité", value: "visibility" },
      { label: "Démonstrations produit", value: "experience" },
      { label: "Networking & contacts", value: "networking" },
      { label: "Image prestige", value: "prestige" },
    ],
  },
];

// ─── AI recommendation engine ─────────────────────────────────────────────────
function getRecommendation(answers, viewedIds) {
  const available = STANDS.filter((s) => s.available);
  let scores = available.map((s) => {
    let score = 0;
    if (answers.budget && s.profile.budget === answers.budget) score += 40;
    if (answers.audience && s.profile.audience === answers.audience) score += 30;
    if (answers.mood && s.profile.mood === answers.mood) score += 20;
    // slight bonus for stands not yet viewed
    if (!viewedIds.includes(s.id)) score += 5;
    return { stand: s, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.stand || available[0];
}

// ─── Hall Plan SVG ─────────────────────────────────────────────────────────────
function HallPlan({ selectedId }) {
  const SW = 78, SH = 60, GX = 18, GY = 16, PX = 20, PY = 30;
  const W = PX * 2 + 3 * SW + 2 * GX;
  const H = PY + 2 * SH + GY + 26;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <rect x="0" y="0" width={W} height={H} rx="10" fill="#0B1912" stroke="rgba(232,184,75,0.12)" strokeWidth="1" />
      <text x={W / 2} y={16} textAnchor="middle" fill="rgba(232,184,75,0.35)" fontSize="7.5" fontFamily="'Bebas Neue', Impact, sans-serif" letterSpacing="2.5">PLAN D'EXPOSITION · GITEX AFRICA 2026</text>
      {[PX + SW + GX / 2, PX + 2 * SW + 1.5 * GX].map((ax, i) => (
        <line key={i} x1={ax} y1={PY - 6} x2={ax} y2={H - 18} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3,4" />
      ))}
      <text x={W / 2} y={H - 7} textAnchor="middle" fill="rgba(242,237,228,0.18)" fontSize="7" fontFamily="'Nunito', sans-serif">▲ ENTRÉE PRINCIPALE</text>
      {STANDS.map((s) => {
        const x = PX + s.col * (SW + GX);
        const y = PY + s.row * (SH + GY);
        const isSel = s.id === selectedId;
        const isBusy = !s.available;
        return (
          <g key={s.id}>
            {isSel && (
              <>
                <rect x={x - 4} y={y - 4} width={SW + 8} height={SH + 8} rx="7" fill="rgba(232,184,75,0.06)" stroke="#E8B84B" strokeWidth="1.5" opacity="0.9" />
                <rect x={x - 4} y={y - 4} width={SW + 8} height={SH + 8} rx="7" fill="none" stroke="rgba(232,184,75,0.3)" strokeWidth="4" filter="url(#glow)" />
              </>
            )}
            <rect x={x} y={y} width={SW} height={SH} rx="4"
              fill={isSel ? "rgba(232,184,75,0.18)" : isBusy ? "rgba(30,30,30,0.6)" : "rgba(33,184,100,0.07)"}
              stroke={isSel ? "#E8B84B" : isBusy ? "rgba(100,100,100,0.25)" : "rgba(33,184,100,0.28)"}
              strokeWidth={isSel ? 1.5 : 1}
            />
            {isBusy && <line x1={x + 6} y1={y + 6} x2={x + SW - 6} y2={y + SH - 6} stroke="rgba(255,77,45,0.3)" strokeWidth="1" />}
            <text x={x + SW / 2} y={y + 21} textAnchor="middle" fill={isSel ? "#E8B84B" : isBusy ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)"} fontSize="12.5" fontFamily="'Bebas Neue', Impact, sans-serif" letterSpacing="1">{s.ref}</text>
            <text x={x + SW / 2} y={y + 35} textAnchor="middle" fill={isSel ? "rgba(232,184,75,0.65)" : "rgba(255,255,255,0.22)"} fontSize="7.5" fontFamily="'Nunito', sans-serif">{s.size} m²</text>
            <text x={x + SW / 2} y={y + 47} textAnchor="middle" fill={isSel ? "rgba(232,184,75,0.45)" : "rgba(255,255,255,0.15)"} fontSize="7" fontFamily="'Nunito', sans-serif">{s.hall.split(" ")[1]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── AI Chatbot ────────────────────────────────────────────────────────────────
function AIChatbot({ onClose, onSelectStand, viewedIds, currentScreen, timeOnScreen, selectedStand, filters }) {
  const [phase, setPhase] = useState("free"); // free | quiz | result | menu
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [recommendation, setRecommendation] = useState(null);
  const [freeMsg, setFreeMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [typing, setTyping] = useState(false);

  const contextHint = currentScreen === "detail" && selectedStand
    ? `regardez le stand **${selectedStand.ref}** (${selectedStand.badge}, ${fmt(selectedStand.price)})`
    : currentScreen === "list" && timeOnScreen > 15
    ? "hésitez entre plusieurs options"
    : currentScreen === "booking"
    ? "finalisez votre réservation"
    : "parcourez nos stands disponibles";

  const filterHint = filters && (filters.budget !== "all" || filters.size !== "all" || filters.zone !== "all")
    ? ` Je vois que vous filtrez déjà par ${[
        filters.budget !== "all" && "budget",
        filters.size !== "all" && "taille",
        filters.zone !== "all" && "zone",
      ].filter(Boolean).join(", ")}.`
    : "";

  const addBotMsg = (msg, delay = 600) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setChatHistory((h) => [...h, { from: "bot", text: msg }]);
    }, delay);
  };

  const handleMenuChoice = (choice) => {
    setChatHistory((h) => [...h, { from: "user", text: choice === "quiz" ? "Je ne sais pas quoi choisir" : choice === "free" ? "J'ai une question" : "Montrez-moi les meilleurs" }]);
    if (choice === "quiz") {
      setPhase("quiz");
      setQuizStep(0);
      addBotMsg("Super ! Je vais vous poser 3 questions rapides pour trouver le stand parfait pour vous. 🎯");
    } else if (choice === "best") {
      const best = STANDS.filter((s) => s.available).sort((a, b) => b.price - a.price).slice(0, 2);
      addBotMsg(`Nos 2 stands stars du moment : **${best[0].ref}** (${best[0].badge}, ${fmt(best[0].price)}) et **${best[1].ref}** (${best[1].badge}, ${fmt(best[1].price)}). Voulez-vous en voir un en détail ?`);
    } else {
      setPhase("free");
      addBotMsg("Bien sûr ! Posez-moi votre question, je suis là pour vous aider. 💬");
    }
  };

  const handleQuizAnswer = (questionId, value, label) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    setChatHistory((h) => [...h, { from: "user", text: label }]);

    if (quizStep < QUIZ.length - 1) {
      const next = quizStep + 1;
      setQuizStep(next);
      addBotMsg(QUIZ[next].emoji + " " + QUIZ[next].q);
    } else {
      // All answered → recommend
      const rec = getRecommendation(newAnswers, viewedIds);
      setRecommendation(rec);
      setPhase("result");
      addBotMsg(`Parfait ! En analysant vos réponses, mon algorithme recommande le stand **${rec.ref}** — ${rec.badge}. ${rec.desc.split(".")[0]}.`, 900);
    }
  };

  const handleFreeMsg = (override) => {
    const raw = (override ?? freeMsg).trim();
    if (!raw) return;
    const msg = raw.toLowerCase();
    setChatHistory((h) => [...h, { from: "user", text: raw }]);
    setFreeMsg("");

    // 1. Contextual about currently viewed stand
    if (currentScreen === "detail" && selectedStand && /\b(ce stand|celui|celui-ci|ce stand là|ce stand-là|le mien|ça|cela|pourquoi)\b/.test(msg)) {
      addBotMsg(`Le stand **${selectedStand.ref}** — ${selectedStand.badge} — fait ${selectedStand.size} m² (${selectedStand.dims}) à ${fmt(selectedStand.price)}. ${selectedStand.desc} Inclus : ${selectedStand.features.join(", ")}.`);
      return;
    }

    // 2. Comparison requests
    if (/\b(compar|différence|difference|versus|vs|ou|ou plutôt)\b/.test(msg)) {
      const avail = STANDS.filter((s) => s.available).sort((a, b) => a.price - b.price);
      const low = avail[0], high = avail[avail.length - 1];
      addBotMsg(`Comparons : **${low.ref}** à ${fmt(low.price)} (${low.size} m², ${low.zone}) vs **${high.ref}** à ${fmt(high.price)} (${high.size} m², ${high.zone}). Le premier est économique et compact, le second est prestige et très spacieux. Lequel vous parle le plus ?`);
      return;
    }

    // 3. Availability
    if (/\b(disponible|libre|reste|encore)\b/.test(msg)) {
      const dispo = STANDS.filter((s) => s.available);
      addBotMsg(`Il reste **${dispo.length} stands disponibles** sur ${STANDS.length} : ${dispo.map((s) => s.ref).join(", ")}. Souhaitez-vous un filtre précis (budget, taille, zone) ?`);
      return;
    }

    // 4. Greeting
    if (/^(bonjour|salut|hello|hi|yo|coucou|hey)\b/.test(msg)) {
      addBotMsg(`Bonjour ! 👋 Dites-moi ce que vous cherchez en quelques mots (ex. *"stand pas cher pour une startup tech"* ou *"vaste espace premium pour une démo"*) et je trouve la meilleure option pour vous.`);
      return;
    }

    // 5. Help / capabilities
    if (/\b(aide|aider|aidez|help|comment|peux-tu|tu peux|que fais)\b/.test(msg)) {
      addBotMsg("Je peux vous aider à : trouver le stand idéal selon vos critères (décrivez-les en langage naturel), comparer deux stands, vérifier la disponibilité, expliquer les équipements inclus, ou résumer un stand que vous regardez. Essayez par exemple : *\"grand stand VIP avec lounge\"*.");
      return;
    }

    // 6. SMART MATCH — parse and rank
    const intent = parseSmartQuery(raw);
    if (!isIntentEmpty(intent)) {
      const available = STANDS.filter((s) => s.available);
      const ranked = available.map((s) => ({ stand: s, score: scoreStand(s, intent) }))
        .sort((a, b) => b.score - a.score);
      const top = ranked[0];
      if (top && top.score > 0) {
        const nd = ranked[1] && ranked[1].score > 0 ? ` En second choix : **${ranked[1].stand.ref}** à ${fmt(ranked[1].stand.price)}.` : "";
        const criteria = [
          intent.budget && `budget ${intent.budget === "low" ? "serré" : intent.budget === "mid" ? "moyen" : "premium"}`,
          intent.zone && intent.zone.replace("Zone ", ""),
          intent.hall,
          intent.audience && `cible ${intent.audience}`,
          intent.mood && `objectif ${intent.mood}`,
        ].filter(Boolean).join(" · ");
        addBotMsg(`D'après votre demande (${criteria || "mots-clés"}), je recommande le stand **${top.stand.ref}** — ${top.stand.badge}, ${top.stand.size} m² à ${fmt(top.stand.price)}. ${top.stand.desc.split(".")[0]}.${nd}`);
        setRecommendation(top.stand);
        return;
      }
    }

    // 7. Fallback — price overview
    if (/\b(prix|budget|co[uû]t|tarif|cher|€|euros?)\b/.test(msg)) {
      addBotMsg("Nos stands vont de **1 200 €** (B-03, 6 m² compact) à **9 500 €** (A-15, 36 m² VIP). Quel budget avez-vous en tête ? Dites-moi par exemple *\"autour de 4k\"* et je vous propose les meilleures options.");
      return;
    }

    // 8. Default fallback
    addBotMsg(`Je n'ai pas saisi votre demande. Essayez de décrire vos critères en quelques mots : budget, taille, audience, zone. Exemple : *"stand tech pas cher pour networking"*.${filterHint}`);
  };

  useEffect(() => {
    // Initial contextual greeting
    setTimeout(() => {
      setChatHistory([{ from: "bot", text: `Bonjour ! 👋 Je vois que vous ${contextHint}.${filterHint} Décrivez-moi ce que vous cherchez en langage naturel et je trouve le stand idéal. 💡` }]);
    }, 300);
  }, []);

  const suggestions = currentScreen === "detail" && selectedStand
    ? ["Pourquoi ce stand ?", "Compare avec un autre", "Que contient-il ?"]
    : ["Stand pas cher startup tech", "Grand espace VIP avec lounge", "Meilleur pour démo produit"];

  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, typing]);

  const currentQ = QUIZ[quizStep];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      background: "rgba(7,14,10,0.82)", backdropFilter: "blur(6px)",
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#0D1A12",
        border: "1px solid rgba(232,184,75,0.18)",
        borderRadius: "22px 22px 0 0",
        maxWidth: 430, width: "100%", margin: "0 auto",
        maxHeight: "82vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
        animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(232,184,75,0.2), rgba(33,232,120,0.15))",
              border: "1px solid rgba(232,184,75,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>🤖</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, color: "#F2EDE4" }}>ASSISTANT GITEX</div>
              <div style={{ fontSize: 10, color: "#21E878", fontWeight: 700, letterSpacing: 1 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#21E878", marginRight: 4, boxShadow: "0 0 6px rgba(33,232,120,0.8)", verticalAlign: "middle" }} />
                IA ACTIVE
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(242,237,228,0.5)",
            width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Chat messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
              animation: "fadeUp 0.3s ease both",
            }}>
              {msg.from === "bot" && (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, marginRight: 8, marginTop: 2 }}>🤖</div>
              )}
              <div style={{
                maxWidth: "75%",
                background: msg.from === "user" ? "linear-gradient(135deg, #E8B84B, #CF9E30)" : "rgba(255,255,255,0.05)",
                color: msg.from === "user" ? "#070E0A" : "#F2EDE4",
                borderRadius: msg.from === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                padding: "10px 13px",
                fontSize: 13.5,
                fontWeight: msg.from === "user" ? 700 : 500,
                lineHeight: 1.55,
                border: msg.from === "bot" ? "1px solid rgba(255,255,255,0.07)" : "none",
              }}>
                {msg.text.split("**").map((part, pi) =>
                  pi % 2 === 1
                    ? <strong key={pi} style={{ color: msg.from === "user" ? "#070E0A" : "#E8B84B" }}>{part}</strong>
                    : part
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8B84B", animation: `pulse 1.2s ${d * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Interactive area */}
        <div style={{ padding: "12px 16px 24px", flexShrink: 0 }}>

          {/* FREE phase with smart suggestions (v3 default) */}
          {phase === "free" && (
            <div>
              {recommendation && (
                <div style={{
                  background: "rgba(232,184,75,0.07)", border: "1px solid rgba(232,184,75,0.25)",
                  borderRadius: 12, padding: "10px 12px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 10,
                  animation: "fadeUp 0.3s ease both",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#E8B84B", letterSpacing: 1.2, marginBottom: 2 }}>RECOMMANDATION IA</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F2EDE4" }}>Stand {recommendation.ref} · {fmt(recommendation.price)}</div>
                  </div>
                  <button onClick={() => { onSelectStand(recommendation); onClose(); }} style={{
                    background: "linear-gradient(135deg, #E8B84B, #CF9E30)", border: "none",
                    color: "#070E0A", borderRadius: 8, padding: "8px 12px", fontSize: 11.5,
                    fontWeight: 800, cursor: "pointer",
                  }}>Voir →</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 2 }}>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => handleFreeMsg(s)} style={{
                    background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.22)",
                    borderRadius: 50, padding: "7px 13px", fontSize: 11.5, fontWeight: 600,
                    color: "#E8B84B", cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "'Nunito', sans-serif",
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={freeMsg}
                  onChange={(e) => setFreeMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFreeMsg()}
                  placeholder="Posez votre question ou décrivez le stand idéal…"
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                    padding: "12px 14px", color: "#F2EDE4", fontSize: 13.5,
                    fontFamily: "'Nunito', sans-serif", outline: "none",
                  }}
                />
                <button onClick={() => handleFreeMsg()} style={{
                  background: "linear-gradient(135deg, #E8B84B, #CF9E30)",
                  border: "none", borderRadius: 10, padding: "12px 16px",
                  cursor: "pointer", fontSize: 16,
                }}>➤</button>
              </div>
            </div>
          )}

          {/* MENU phase */}
          {phase === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "rgba(242,237,228,0.3)", textTransform: "uppercase", marginBottom: 4 }}>Que puis-je faire pour vous ?</div>
              {[
                { key: "quiz", icon: "✨", label: "Vous ne savez pas quoi choisir ?", sub: "Quiz IA · 3 questions · recommandation personnalisée" },
                { key: "best", icon: "⭐", label: "Voir les stands les plus populaires", sub: "Sélection de nos coups de cœur" },
                { key: "free", icon: "💬", label: "Poser une question", sub: "Prix, disponibilité, surface, équipements…" },
              ].map(({ key, icon, label, sub }) => (
                <button key={key} onClick={() => handleMenuChoice(key)} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12,
                  color: "#F2EDE4",
                }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "rgba(242,237,228,0.4)", fontWeight: 500 }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* QUIZ phase */}
          {phase === "quiz" && currentQ && !typing && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(242,237,228,0.35)", marginBottom: 10 }}>
                Question {quizStep + 1} / {QUIZ.length} · {currentQ.emoji} {currentQ.q}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {currentQ.options.map((opt) => (
                  <button key={opt.value} onClick={() => handleQuizAnswer(currentQ.id, opt.value, opt.label)} style={{
                    background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.2)",
                    borderRadius: 10, padding: "11px 14px", cursor: "pointer",
                    textAlign: "left", color: "#F2EDE4", fontSize: 13, fontWeight: 600,
                    transition: "all 0.15s",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RESULT phase */}
          {phase === "result" && recommendation && !typing && (
            <div>
              <div style={{
                background: "rgba(232,184,75,0.07)", border: "1px solid rgba(232,184,75,0.25)",
                borderRadius: 14, padding: "16px", marginBottom: 10,
                animation: "pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#E8B84B", letterSpacing: 1 }}>Stand {recommendation.ref}</span>
                  <span style={{ background: "rgba(33,232,120,0.12)", color: "#21E878", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(33,232,120,0.2)" }}>✓ RECOMMANDÉ</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(242,237,228,0.5)", marginBottom: 6 }}>{recommendation.hall} · {recommendation.zone}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "rgba(242,237,228,0.7)", fontWeight: 600 }}>
                  <span>📐 {recommendation.size} m²</span>
                  <span>💶 {fmt(recommendation.price)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { onSelectStand(recommendation); onClose(); }} style={{
                  flex: 2, background: "linear-gradient(135deg, #E8B84B, #CF9E30)",
                  color: "#070E0A", border: "none", borderRadius: 10, padding: "13px",
                  fontSize: 13, fontWeight: 800, cursor: "pointer",
                }}>Voir ce stand →</button>
                <button onClick={() => { setPhase("menu"); setAnswers({}); setQuizStep(0); setChatHistory([]); }} style={{
                  flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(242,237,228,0.6)", borderRadius: 10, padding: "13px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>Recommencer</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Chatbot Trigger Bubble ────────────────────────────────────────────────────
function ChatBubble({ onOpen, pulse }) {
  return (
    <div style={{
      position: "fixed", bottom: 90, right: 20, zIndex: 900,
      animation: pulse ? "bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both" : "fadeUp 0.4s ease both",
    }}>
      {pulse && (
        <div style={{
          position: "absolute", bottom: "100%", right: 0, marginBottom: 10,
          background: "#0D1A12", border: "1px solid rgba(232,184,75,0.3)",
          borderRadius: "14px 14px 4px 14px", padding: "10px 14px",
          width: 220, animation: "slideDown 0.4s ease both",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#F2EDE4", marginBottom: 3 }}>Besoin d'aide ? 👋</div>
          <div style={{ fontSize: 11.5, color: "rgba(242,237,228,0.55)", fontWeight: 500, lineHeight: 1.5 }}>
            Je peux vous recommander le stand idéal en 3 questions !
          </div>
          <div style={{ position: "absolute", bottom: -6, right: 14, width: 10, height: 10, background: "#0D1A12", border: "1px solid rgba(232,184,75,0.3)", borderTop: "none", borderLeft: "none", transform: "rotate(45deg)" }} />
        </div>
      )}
      <button onClick={onOpen} style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg, #E8B84B, #CF9E30)",
        border: "none", cursor: "pointer", fontSize: 22,
        boxShadow: pulse ? "0 0 0 0 rgba(232,184,75,0.4), 0 8px 24px rgba(232,184,75,0.3)" : "0 4px 16px rgba(232,184,75,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: pulse ? "ringPulse 1.5s ease-in-out infinite" : "none",
        position: "relative",
      }}>
        🤖
        {pulse && (
          <div style={{
            position: "absolute", top: -3, right: -3, width: 14, height: 14,
            borderRadius: "50%", background: "#21E878",
            border: "2px solid #070E0A", animation: "pulse 1.5s ease-in-out infinite",
          }} />
        )}
      </button>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
function GitexApp() {
  const [screen, setScreen] = useState("list");
  const [sel, setSel] = useState(null);
  const [budgetF, setBudgetF] = useState("all");
  const [sizeF, setSizeF] = useState("all");
  const [zoneF, setZoneF] = useState("all");
  const [smartQ, setSmartQ] = useState("");
  const smartIntent = parseSmartQuery(smartQ);
  const hasSmart = !isIntentEmpty(smartIntent);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  const [bookRef] = useState("GA26-" + Math.random().toString(36).slice(2, 8).toUpperCase());

  // AI chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTriggered, setChatTriggered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [viewedIds, setViewedIds] = useState([]);
  const [screenEntryTime, setScreenEntryTime] = useState(Date.now());
  const [timeOnScreen, setTimeOnScreen] = useState(0);
  const inactivityTimer = useRef(null);
  const screenTimer = useRef(null);

  // Track viewed stands
  const openDetail = (stand) => {
    setSel(stand);
    setScreen("detail");
    setViewedIds((prev) => prev.includes(stand.id) ? prev : [...prev, stand.id]);
  };

  // Track time on screen
  useEffect(() => {
    setScreenEntryTime(Date.now());
    screenTimer.current = setInterval(() => {
      setTimeOnScreen((t) => t + 1);
    }, 1000);
    return () => clearInterval(screenTimer.current);
  }, [screen]);

  // Inactivity / abandonment detection
  const resetInactivityTimer = useCallback(() => {
    if (chatOpen || chatTriggered) return;
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (!chatOpen) {
        setChatTriggered(true);
        setShowBubble(true);
      }
    }, 4000); // 4 seconds of inactivity
  }, [chatOpen, chatTriggered]);

  useEffect(() => {
    const events = ["mousemove", "scroll", "click", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer(); // start timer immediately

    // Also trigger after 25s on list screen regardless of activity
    const quickTrigger = setTimeout(() => {
      if (screen === "list" && !chatTriggered && !chatOpen) {
        setChatTriggered(true);
        setShowBubble(true);
      }
    }, 6000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityTimer.current);
      clearTimeout(quickTrigger);
    };
  }, [resetInactivityTimer, screen, chatTriggered, chatOpen]);

  // Show bubble after 3s always (non-intrusive)
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 3000);
    return () => clearTimeout(t);
  }, []);

  let filtered = STANDS.filter((s) => {
    if (budgetF === "low" && s.price > 3000) return false;
    if (budgetF === "mid" && (s.price <= 3000 || s.price > 7000)) return false;
    if (budgetF === "high" && s.price <= 7000) return false;
    if (sizeF === "s" && s.size > 9) return false;
    if (sizeF === "m" && (s.size <= 9 || s.size > 18)) return false;
    if (sizeF === "l" && s.size <= 18) return false;
    if (zoneF !== "all" && s.zone !== zoneF) return false;
    return true;
  });

  if (hasSmart) {
    filtered = filtered
      .map((s) => ({ s, score: scoreStand(s, smartIntent) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
  }

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    padding: "14px 16px", color: "#F2EDE4", fontSize: 14,
    fontFamily: "'Nunito', sans-serif", outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        html, body { background: #070E0A; }

        .ga-wrap { max-width: 430px; margin: 0 auto; background: #070E0A; min-height: 100vh; font-family: 'Nunito', sans-serif; color: #F2EDE4; overflow-x: hidden; position: relative; }

        .ga-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px; margin-bottom: 12px; transition: background 0.2s, border-color 0.2s, transform 0.15s; cursor: pointer; }
        .ga-card:active { transform: scale(0.985); }
        .ga-card:hover { background: rgba(232,184,75,0.05); border-color: rgba(232,184,75,0.28); }

        .chip { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(242,237,228,0.55); border-radius: 50px; padding: 7px 15px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: 'Nunito', sans-serif; }
        .chip.on { background: #E8B84B; border-color: #E8B84B; color: #070E0A; }
        .chip:hover:not(.on) { border-color: rgba(232,184,75,0.5); color: #E8B84B; }

        .frow { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 2px; }

        .btn-gold { background: linear-gradient(135deg, #E8B84B 0%, #CF9E30 100%); color: #070E0A; border: none; border-radius: 50px; padding: 16px 32px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; width: 100%; transition: all 0.2s; letter-spacing: 0.2px; }
        .btn-gold:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(232,184,75,0.28); }
        .btn-gold:active:not(:disabled) { transform: translateY(0); }
        .btn-gold:disabled { opacity: 0.38; cursor: default; }

        .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(242,237,228,0.6); border-radius: 50px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.15s; }
        .btn-ghost:hover { border-color: rgba(232,184,75,0.45); color: #E8B84B; }

        .btn-sm { background: linear-gradient(135deg, #E8B84B, #CF9E30); color: #070E0A; border: none; border-radius: 50px; padding: 9px 18px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.15s; }
        .btn-sm:hover:not(:disabled) { transform: scale(1.04); box-shadow: 0 4px 14px rgba(232,184,75,0.3); }
        .btn-sm:disabled { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.22); cursor: default; transform: none; }

        input:focus { border-color: rgba(232,184,75,0.55) !important; box-shadow: 0 0 0 3px rgba(232,184,75,0.08) !important; }

        .flabel { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: rgba(242,237,228,0.32); text-transform: uppercase; margin-bottom: 9px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.4); opacity: 0; } 65% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes checkDraw { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(232,184,75,0.5), 0 8px 24px rgba(232,184,75,0.3); } 70% { box-shadow: 0 0 0 14px rgba(232,184,75,0), 0 8px 24px rgba(232,184,75,0.3); } 100% { box-shadow: 0 0 0 0 rgba(232,184,75,0), 0 8px 24px rgba(232,184,75,0.3); } }

        .fu  { animation: fadeUp 0.38s ease both; }
        .fu1 { animation: fadeUp 0.38s 0.07s ease both; }
        .fu2 { animation: fadeUp 0.38s 0.14s ease both; }
        .fu3 { animation: fadeUp 0.38s 0.21s ease both; }
        .fu4 { animation: fadeUp 0.38s 0.28s ease both; }
        .pop { animation: pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .pulse { animation: pulse 2s ease-in-out infinite; }

        .fixed-cta { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; padding: 16px 20px 32px; background: linear-gradient(to top, #070E0A 55%, transparent); z-index: 20; }

        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 10px 0; }
        .tag { background: rgba(232,184,75,0.1); color: #E8B84B; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 50px; border: 1px solid rgba(232,184,75,0.2); letter-spacing: 0.4px; }
        .avail-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

        button:hover .chat-btn-hover { border-color: rgba(232,184,75,0.35) !important; background: rgba(232,184,75,0.06) !important; }
      `}</style>

      <div className="ga-wrap">

        {/* ══════════════════════════════════════════════
            SCREEN 1 — LISTE DES STANDS
        ══════════════════════════════════════════════ */}
        {screen === "list" && (
          <div style={{ paddingBottom: 48 }}>
            <div style={{ padding: "38px 20px 22px", background: "linear-gradient(155deg, rgba(232,184,75,0.07) 0%, transparent 55%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span className="avail-dot pulse" style={{ background: "#21E878", boxShadow: "0 0 10px rgba(33,232,120,0.7)" }} />
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 3, color: "#21E878", textTransform: "uppercase" }}>Gitex Africa 2026 · Live</span>
              </div>
              <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 44, lineHeight: 0.96, marginBottom: 10, letterSpacing: 0.5 }}>
                Trouvez votre<br /><span style={{ color: "#E8B84B" }}>Stand idéal</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(242,237,228,0.42)", fontWeight: 500 }}>
                <span>📍 Marrakech</span>
                <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />
                <span>14 – 16 Avr 2026</span>
                <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />
                <span style={{ color: "#21E878", fontWeight: 700 }}>{STANDS.filter((s) => s.available).length} disponibles</span>
              </div>
            </div>

            <div style={{ padding: "22px 20px 0" }}>
              {/* SMART SEARCH — natural language */}
              <div style={{
                position: "relative", marginBottom: 12,
                background: "linear-gradient(135deg, rgba(232,184,75,0.08), rgba(33,232,120,0.04))",
                border: `1px solid ${hasSmart ? "rgba(232,184,75,0.55)" : "rgba(232,184,75,0.22)"}`,
                borderRadius: 14, transition: "border-color 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <input
                    value={smartQ}
                    onChange={(e) => setSmartQ(e.target.value)}
                    placeholder="Décrivez votre stand idéal en langage naturel…"
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "#F2EDE4", fontSize: 13.5, fontWeight: 500,
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  />
                  {smartQ && (
                    <button onClick={() => setSmartQ("")} style={{
                      background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(242,237,228,0.7)",
                      width: 22, height: 22, borderRadius: "50%", cursor: "pointer", fontSize: 12,
                    }}>✕</button>
                  )}
                </div>
                {hasSmart && (
                  <div style={{
                    padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 5,
                    fontSize: 10.5, color: "rgba(242,237,228,0.55)",
                  }}>
                    <span style={{ fontWeight: 800, letterSpacing: 1, color: "#21E878", textTransform: "uppercase" }}>IA · </span>
                    {[
                      smartIntent.budget && `budget ${smartIntent.budget}`,
                      smartIntent.size && `taille ${smartIntent.size}`,
                      smartIntent.zone && smartIntent.zone.replace("Zone ", ""),
                      smartIntent.hall,
                      smartIntent.audience,
                      smartIntent.mood,
                    ].filter(Boolean).map((t, i) => (
                      <span key={i} style={{
                        background: "rgba(232,184,75,0.15)", color: "#E8B84B",
                        padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                      }}>{t}</span>
                    ))}
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{filtered.length} match</span>
                  </div>
                )}
              </div>
              {!hasSmart && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
                  {["startup tech pas cher", "grand espace VIP", "démo produit", "networking entreprise"].map((s) => (
                    <button key={s} onClick={() => setSmartQ(s)} className="chip" style={{ flexShrink: 0 }}>{s}</button>
                  ))}
                </div>
              )}

              {/* AI assistant banner */}
              <div onClick={() => setChatOpen(true)} style={{
                background: "linear-gradient(135deg, rgba(232,184,75,0.06), rgba(33,232,120,0.04))",
                border: "1px solid rgba(232,184,75,0.18)",
                borderRadius: 14, padding: "12px 14px", marginBottom: 18,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>💬</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F2EDE4", marginBottom: 2 }}>Chat IA contextuel</div>
                  <div style={{ fontSize: 11.5, color: "rgba(242,237,228,0.45)", fontWeight: 500 }}>Posez n'importe quelle question — je connais vos filtres et votre sélection →</div>
                </div>
                <div style={{ color: "#E8B84B", fontSize: 18, fontWeight: 700 }}>›</div>
              </div>

              {/* Filters */}
              <div style={{ marginBottom: 14 }}>
                <div className="flabel">Budget</div>
                <div className="frow">
                  {[["all","Tout budget"],["low","< 3 000 €"],["mid","3 – 7 K €"],["high","+ 7 000 €"]].map(([v, l]) => (
                    <button key={v} className={`chip ${budgetF === v ? "on" : ""}`} onClick={() => setBudgetF(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="flabel">Taille</div>
                <div className="frow">
                  {[["all","Toutes"],["s","S · ≤ 9 m²"],["m","M · 9–18 m²"],["l","L · > 18 m²"]].map(([v, l]) => (
                    <button key={v} className={`chip ${sizeF === v ? "on" : ""}`} onClick={() => setSizeF(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div className="flabel">Zone</div>
                <div className="frow">
                  {[["all","Toutes"],["Zone Tech","Tech"],["Zone Innovation","Innovation"],["Zone Startup","Startup"],["Zone Premium","Premium"]].map(([v, l]) => (
                    <button key={v} className={`chip ${zoneF === v ? "on" : ""}`} onClick={() => setZoneF(v)}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "rgba(242,237,228,0.28)", marginBottom: 16, fontWeight: 700, letterSpacing: 0.5 }}>
                {filtered.length} stand{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
              </div>

              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "56px 20px", color: "rgba(242,237,228,0.22)" }}>
                  <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.35, fontFamily: "'Bebas Neue', sans-serif" }}>◎</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucun résultat</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Essayez d'élargir vos critères de recherche.</div>
                </div>
              )}

              {filtered.map((s, i) => (
                <div key={s.id} className="ga-card fu" style={{ animationDelay: `${i * 0.055}s`, opacity: s.available ? 1 : 0.48 }} onClick={() => openDetail(s)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 13 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: 1, lineHeight: 1, color: s.available ? "#F2EDE4" : "rgba(242,237,228,0.28)" }}>{s.ref}</span>
                        <span className="tag">{s.badge}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(242,237,228,0.42)", fontWeight: 600 }}>{s.hall} · {s.zone}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 23, color: s.available ? "#E8B84B" : "rgba(242,237,228,0.2)", letterSpacing: 0.5, lineHeight: 1 }}>{fmt(s.price)}</div>
                      <div style={{ fontSize: 10, color: "rgba(242,237,228,0.28)", fontWeight: 700, marginTop: 3, letterSpacing: 0.5 }}>HT · 3 JOURS</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="0.5" y="0.5" width="11" height="11" rx="2" stroke="rgba(242,237,228,0.3)" strokeWidth="1"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{s.size} m²</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span className="avail-dot" style={{ background: s.available ? "#21E878" : "#FF4D2D", boxShadow: s.available ? "0 0 6px rgba(33,232,120,0.65)" : "none" }} />
                        <span style={{ fontSize: 12, color: s.available ? "#21E878" : "#FF4D2D", fontWeight: 700 }}>{s.available ? "Disponible" : "Indisponible"}</span>
                      </div>
                    </div>
                    <button className="btn-sm" disabled={!s.available} onClick={(e) => { e.stopPropagation(); openDetail(s); }}>Voir →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SCREEN 2 — DÉTAIL DU STAND
        ══════════════════════════════════════════════ */}
        {screen === "detail" && sel && (
          <div style={{ paddingBottom: 120 }}>
            <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn-ghost" onClick={() => setScreen("list")}>← Liste</button>
              <span style={{ fontSize: 12, color: "rgba(242,237,228,0.28)", fontWeight: 700, letterSpacing: 1 }}>DÉTAIL</span>
            </div>
            <div style={{ padding: "22px 20px 0" }}>
              <div className="fu" style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="tag">{sel.badge}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="avail-dot" style={{ background: sel.available ? "#21E878" : "#FF4D2D", boxShadow: sel.available ? "0 0 8px rgba(33,232,120,0.7)" : "none" }} />
                    <span style={{ fontSize: 12, color: sel.available ? "#21E878" : "#FF4D2D", fontWeight: 700 }}>{sel.available ? "Disponible" : "Indisponible"}</span>
                  </div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 52, letterSpacing: 2, lineHeight: 0.95, color: "#F2EDE4" }}>Stand {sel.ref}</div>
                <div style={{ fontSize: 14, color: "rgba(242,237,228,0.45)", marginTop: 6, fontWeight: 600 }}>{sel.hall} · {sel.zone}</div>
              </div>

              <div className="fu1" style={{ marginBottom: 18, background: "#0B1912", borderRadius: 16, padding: "14px 14px 12px", border: "1px solid rgba(232,184,75,0.1)" }}>
                <div className="flabel" style={{ marginBottom: 10 }}>Plan d'exposition</div>
                <HallPlan selectedId={sel.id} />
                <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10 }}>
                  {[{ color: "rgba(232,184,75,0.28)", stroke: "#E8B84B", label: "Sélectionné" }, { color: "rgba(33,184,100,0.08)", stroke: "rgba(33,184,100,0.28)", label: "Disponible" }, { color: "rgba(30,30,30,0.6)", stroke: "rgba(100,100,100,0.25)", label: "Occupé" }].map(({ color, stroke, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 2.5, background: color, border: `1px solid ${stroke}` }} />
                      <span style={{ fontSize: 10, color: "rgba(242,237,228,0.35)", fontWeight: 600 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fu1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[{ label: "Surface", value: sel.size + " m²", sub: sel.dims }, { label: "Prix HT", value: fmt(sel.price), sub: "3 jours" }, { label: "Hall", value: sel.hall.split(" ")[1], sub: sel.zone.replace("Zone ", "") }].map(({ label, value, sub }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, color: "rgba(242,237,228,0.3)", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 19, color: "#E8B84B", letterSpacing: 0.5, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 9.5, color: "rgba(242,237,228,0.32)", marginTop: 4 }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div className="fu2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                <div className="flabel" style={{ marginBottom: 8 }}>Description</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(242,237,228,0.68)", fontWeight: 500 }}>{sel.desc}</div>
              </div>

              <div className="fu3" style={{ marginBottom: 16 }}>
                <div className="flabel" style={{ marginBottom: 12 }}>Équipements inclus</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {sel.features.map((f) => (
                    <div key={f} style={{ background: "rgba(33,232,120,0.05)", border: "1px solid rgba(33,232,120,0.15)", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, color: "rgba(242,237,228,0.68)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#21E878", fontSize: 10, fontWeight: 800 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI helper on detail page */}
              <div className="fu4">
                <button onClick={() => setChatOpen(true)} style={{
                  width: "100%", background: "rgba(232,184,75,0.04)", border: "1px solid rgba(232,184,75,0.15)",
                  borderRadius: 12, padding: "12px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10, color: "#F2EDE4",
                  marginBottom: 16,
                }}>
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 1 }}>Ce stand vous convient-il ?</div>
                    <div style={{ fontSize: 11, color: "rgba(242,237,228,0.4)", fontWeight: 500 }}>L'IA peut comparer et vous guider →</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="fixed-cta">
              <button className="btn-gold" disabled={!sel.available} onClick={() => setScreen("confirm")}>
                {sel.available ? "Réserver ce stand →" : "Stand indisponible"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SCREEN 3 — CONFIRMATION
        ══════════════════════════════════════════════ */}
        {screen === "confirm" && sel && !done && (
          <div style={{ paddingBottom: 120 }}>
            <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
              <button className="btn-ghost" onClick={() => setScreen("detail")}>← Modifier</button>
              <span style={{ fontSize: 12, color: "rgba(242,237,228,0.28)", fontWeight: 700, letterSpacing: 1 }}>RÉSERVATION</span>
            </div>
            <div style={{ padding: "22px 20px 0" }}>
              <div className="fu" style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, color: "#E8B84B", textTransform: "uppercase", marginBottom: 6 }}>Étape finale</div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 42, lineHeight: 0.95, color: "#F2EDE4" }}>Confirmer la<br />réservation</div>
              </div>

              <div className="fu1" style={{ background: "rgba(232,184,75,0.04)", border: "1px solid rgba(232,184,75,0.18)", borderRadius: 16, padding: "20px", marginBottom: 24 }}>
                <div className="flabel" style={{ color: "rgba(232,184,75,0.55)", marginBottom: 14 }}>Récapitulatif</div>
                {[
                  ["Stand sélectionné", `${sel.ref} · ${sel.badge}`],
                  ["Hall / Zone", `${sel.hall} · ${sel.zone}`],
                  ["Surface", `${sel.size} m² (${sel.dims})`],
                  ["Événement", "Gitex Africa · Marrakech · 14–16 Avr 2026"],
                  ["Montant HT", fmt(sel.price)],
                  ["TVA (20 %)", fmt(sel.price * 0.2)],
                ].map(([k, v], i, arr) => (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: "rgba(242,237,228,0.4)", fontWeight: 600 }}>{k}</span>
                      <span style={{ fontSize: 13, color: "#F2EDE4", fontWeight: 700, textAlign: "right", maxWidth: "58%" }}>{v}</span>
                    </div>
                    {i < arr.length - 1 && <div className="divider" />}
                  </div>
                ))}
                <div style={{ height: 1, background: "rgba(232,184,75,0.2)", margin: "10px 0 14px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "rgba(242,237,228,0.6)", fontWeight: 700 }}>Total TTC</span>
                  <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 24, color: "#E8B84B", letterSpacing: 0.5 }}>{fmt(sel.price * 1.2)}</span>
                </div>
              </div>

              <div className="fu2" style={{ marginBottom: 24 }}>
                <div className="flabel" style={{ marginBottom: 14 }}>Informations exposant</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(242,237,228,0.45)", display: "block", marginBottom: 7 }}>Nom de l'entreprise *</label>
                  <input style={inputStyle} placeholder="Ex. : Acme Technologies" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(242,237,228,0.45)", display: "block", marginBottom: 7 }}>Email de contact *</label>
                  <input style={inputStyle} type="email" placeholder="Ex. : contact@acme.com" value={contact} onChange={(e) => setContact(e.target.value)} />
                </div>
              </div>

              <div className="fu3" style={{ fontSize: 12, color: "rgba(242,237,228,0.25)", textAlign: "center", lineHeight: 1.65, fontWeight: 500 }}>
                En confirmant, vous acceptez les conditions générales<br />de réservation de GITEX Africa 2026.
              </div>
            </div>

            <div className="fixed-cta">
              <button className="btn-gold" disabled={!company.trim() || !contact.trim()} onClick={() => setDone(true)}>
                Confirmer la réservation →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SCREEN 3b — SUCCÈS
        ══════════════════════════════════════════════ */}
        {screen === "confirm" && sel && done && (
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", background: "radial-gradient(ellipse at 50% 30%, rgba(33,232,120,0.06) 0%, transparent 60%)" }}>
            <div className="pop" style={{ width: 86, height: 86, borderRadius: "50%", background: "rgba(33,232,120,0.08)", border: "2px solid rgba(33,232,120,0.6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26, boxShadow: "0 0 48px rgba(33,232,120,0.18)" }}>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <path d="M10 19L16.5 26L28 13" stroke="#21E878" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="32" strokeDashoffset="0" style={{ animation: "checkDraw 0.55s 0.35s ease both" }} />
              </svg>
            </div>
            <div className="fu" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 46, letterSpacing: 1, lineHeight: 0.95, color: "#F2EDE4", marginBottom: 12 }}>
              Réservation<br /><span style={{ color: "#21E878" }}>Confirmée !</span>
            </div>
            <div className="fu1" style={{ fontSize: 14, color: "rgba(242,237,228,0.45)", fontWeight: 500, lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
              Votre stand <strong style={{ color: "#F2EDE4" }}>{sel.ref}</strong> est réservé pour GITEX Africa 2026 à Marrakech.
            </div>
            <div className="fu2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 24px", marginBottom: 32, width: "100%" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "rgba(242,237,228,0.3)", textTransform: "uppercase", marginBottom: 6 }}>Référence</div>
              <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 30, letterSpacing: 3, color: "#E8B84B" }}>{bookRef}</div>
            </div>
            <button className="fu3 btn-ghost" onClick={() => { setScreen("list"); setSel(null); setDone(false); setCompany(""); setContact(""); }}>
              Retour à l'accueil
            </button>
          </div>
        )}

      </div>

      {/* ── Floating chatbot bubble ── */}
      {!chatOpen && showBubble && screen !== "confirm" && (
        <ChatBubble onOpen={() => { setChatOpen(true); setChatTriggered(false); }} pulse={chatTriggered} />
      )}

      {/* ── AI Chatbot overlay ── */}
      {chatOpen && (
        <AIChatbot
          onClose={() => setChatOpen(false)}
          onSelectStand={(stand) => { openDetail(stand); }}
          viewedIds={viewedIds}
          currentScreen={screen}
          timeOnScreen={timeOnScreen}
          selectedStand={sel}
          filters={{ budget: budgetF, size: sizeF, zone: zoneF }}
        />
      )}
    </>
  );
}
