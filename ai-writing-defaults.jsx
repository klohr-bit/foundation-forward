import { useState } from "react";

const PURPLE = "#7C3AED";
const BG = "#FAFAF8";
const BORDER = "#E5E5E0";
const TEXT = "#0A0A0A";
const MUTED = "#6B7280";

const CATEGORY_META = {
  false_intimacy:  { label: "False Intimacy",        bg: "#FEF3C7", border: "#F59E0B", labelColor: "#78350F" },
  pseudo_depth:    { label: "Pseudo-Depth",           bg: "#FCE7F3", border: "#DB2777", labelColor: "#831843" },
  hedge_phrase:    { label: "Hedge Phrase",            bg: "#FEF9C3", border: "#CA8A04", labelColor: "#713F12" },
  enthusiasm:      { label: "Performed Enthusiasm",   bg: "#FFE4E6", border: "#E11D48", labelColor: "#881337" },
  fragmentation:   { label: "Structural Default",     bg: "#DBEAFE", border: "#2563EB", labelColor: "#1E3A8A" },
  inflation:       { label: "Inflation Phrase",       bg: "#FFEDD5", border: "#EA580C", labelColor: "#7C2D12" },
  pivot:           { label: "Pivot Construction",     bg: "#EDE9FE", border: "#7C3AED", labelColor: "#4C1D95" },
  checkin:         { label: "Closing Check-In",       bg: "#DCFCE7", border: "#16A34A", labelColor: "#14532D" },
  motivational:    { label: "Motivational Language",  bg: "#E0F2FE", border: "#0284C7", labelColor: "#0C4A6E" },
  contrarian:      { label: "Contrarian Hook",        bg: "#F1F5F9", border: "#64748B", labelColor: "#334155" },
};

async function analyzeText(text) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are an AI writing defaults analyst. Analyze the text below for AI writing defaults — the patterns AI tools consistently fall into.

Return ONLY valid JSON. No markdown fences, no preamble, no explanation. Exact structure:
{
  "defaults": [{"text": "exact phrase from text", "category": "category_key", "explanation": "one sentence why this is an AI default"}],
  "categoryCounts": {"false_intimacy":0,"pseudo_depth":0,"hedge_phrase":0,"enthusiasm":0,"fragmentation":0,"inflation":0,"pivot":0,"checkin":0,"motivational":0,"contrarian":0},
  "totalCount": 0,
  "anchors": [{"text": "phrase worth keeping", "why": "why it works and should be preserved"}],
  "rewriteSample": "first paragraph rewritten without defaults, preserving intention"
}

Category definitions:
false_intimacy — performed closeness without earning it: "I want to be real with you", "I see you", "let's be honest", "I get it"
pseudo_depth — signals profundity without delivering it: "at its core", "fundamentally", "the truth is", "when you really think about it", "at the end of the day"
hedge_phrase — undercuts authority unnecessarily: "worth noting", "one thing to consider", "something to keep in mind", "it's important to note", "I'd argue", "in my experience"
enthusiasm — performed hype and stock excitement: "excited to announce", "thrilled to share", "game-changing", "blown away", "can't wait"
fragmentation — single-sentence paragraphs used only for manufactured tension, not genuine rhythm or content clarity
inflation — ordinary outcomes inflated into revolution: "transform", "revolutionize", "change everything", "paradigm shift", "game changer", "unlock your potential"
pivot — the classic AI flip construction: "it's not X, it's Y", "not just X but Y", "less about X and more about Y"
checkin — closing questions that seek approval: "does that make sense?", "what do you think?", "sound good?", "make sense?"
motivational — generic encouragement: "sky's the limit", "you've got this", "anything is possible", "believe in yourself", "you can do this"
contrarian — contrarian posture used as a formulaic hook, not genuine position

Rules:
- "text" must be an exact substring of the input text
- Find 1–2 anchors: specific elements working well, that sound human and owned, worth preserving in a rewrite
- Rewrite only the first paragraph (or first 3 sentences if no paragraph break), removing defaults, keeping the author's intention and any anchor elements

Text to analyze:
${text}`
      }]
    })
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text || "{}";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse response");
  return JSON.parse(match[0]);
}

function buildSegments(text, defaults) {
  const ranges = [];
  defaults.forEach(d => {
    const lower = text.toLowerCase();
    const phrase = d.text.toLowerCase();
    let pos = 0;
    while (true) {
      const idx = lower.indexOf(phrase, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + d.text.length, category: d.category, explanation: d.explanation });
      pos = idx + 1;
    }
  });
  ranges.sort((a, b) => a.start - b.start);

  const clean = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; }
  }

  const segments = [];
  let cursor = 0;
  for (const r of clean) {
    if (r.start > cursor) segments.push({ type: "text", content: text.slice(cursor, r.start) });
    segments.push({ type: "mark", content: text.slice(r.start, r.end), category: r.category, explanation: r.explanation });
    cursor = r.end;
  }
  if (cursor < text.length) segments.push({ type: "text", content: text.slice(cursor) });
  return segments;
}

function HighlightedText({ text, defaults }) {
  const [hovered, setHovered] = useState(null);
  const segments = buildSegments(text, defaults);

  return (
    <p style={{ margin: 0, lineHeight: 1.85, fontSize: 15, color: TEXT, whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        const meta = CATEGORY_META[seg.category] || CATEGORY_META.hedge_phrase;
        return (
          <span
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              backgroundColor: meta.bg,
              borderBottom: `2px solid ${meta.border}`,
              borderRadius: 2,
              padding: "1px 2px",
              cursor: "default",
              position: "relative",
            }}
          >
            {seg.content}
            {hovered === i && (
              <span style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#111827",
                color: "#F9FAFB",
                fontSize: 12,
                lineHeight: 1.55,
                fontWeight: 400,
                borderRadius: 8,
                padding: "8px 12px",
                zIndex: 100,
                pointerEvents: "none",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                width: 220,
                whiteSpace: "normal",
              }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4, color: meta.bg }}>{meta.label}</span>
                {seg.explanation}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);

  const analyze = async () => {
    const trimmed = text.trim();
    if (trimmed.split(/\s+/).length < 20) {
      setError("Paste at least a paragraph to get a useful diagnostic.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    setResults(null);
    try {
      const data = await analyzeText(trimmed);
      setResults({ ...data, originalText: trimmed });
    } catch {
      setError("Analysis failed. Try again.");
    }
    setAnalyzing(false);
  };

  const totalCount = results?.totalCount || 0;
  const nonZeroCats = results
    ? Object.entries(results.categoryCounts || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: BG, minHeight: "100vh", color: TEXT }}>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #EDE9FE; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
        textarea { outline: none; }
        textarea::placeholder { color: #C0BEB8; }
        .hover-dim:hover { opacity: 0.82; }
        input[type="email"]:focus { border-color: ${PURPLE} !important; outline: none; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        padding: "0 40px", height: 58,
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(250,250,248,0.94)",
        backdropFilter: "blur(10px)",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>Yours, Not Theirs</span>
        <a href="#" style={{ fontSize: 13, fontWeight: 600, color: PURPLE, textDecoration: "none", letterSpacing: "-0.01em" }}>
          Build your Voice Signature →
        </a>
      </nav>

      {/* ── Hero ── */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "64px 32px 40px" }}>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          backgroundColor: "#EDE9FE", color: PURPLE,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "4px 12px 4px 10px", borderRadius: 100, marginBottom: 28,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: PURPLE, flexShrink: 0 }} />
          Free Tool — AI Writing Defaults
        </div>

        <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.038em", marginBottom: 20, color: "#080808" }}>
          AI defaults are hiding<br />
          in your writing.{" "}
          <span style={{ color: PURPLE }}>Most people<br />
          can't see them.</span>
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#505050", marginBottom: 40, maxWidth: 500 }}>
          I missed mine. So did every expert I asked.
          That's why I built this. Paste your writing.
          Find out what's been hiding in yours.
        </p>

        {/* ── Paste card ── */}
        <div style={{
          backgroundColor: "#FFF",
          border: `1.5px solid ${error ? "#FCA5A5" : BORDER}`,
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); if (error) setError(null); }}
            placeholder="Paste your writing here — a LinkedIn post, newsletter excerpt, email, any content you've touched AI with..."
            rows={7}
            style={{
              width: "100%", padding: "22px 24px", border: "none",
              fontSize: 15, lineHeight: 1.75, color: TEXT,
              backgroundColor: "transparent", fontFamily: "inherit", resize: "vertical",
            }}
          />
          <div style={{
            padding: "12px 18px 16px", borderTop: "1px solid #F0F0EB",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: "#C0BEB8", fontWeight: 500 }}>
              {text.trim() ? `${text.trim().split(/\s+/).filter(Boolean).length} words` : "Minimum one paragraph"}
            </span>
            <button
              onClick={analyze}
              disabled={analyzing || !text.trim()}
              className="hover-dim"
              style={{
                backgroundColor: !text.trim() ? "#C4B5FD" : PURPLE,
                color: "#FFF", border: "none", borderRadius: 9,
                padding: "10px 22px", fontSize: 13, fontWeight: 700,
                letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8,
                transition: "background 0.2s",
              }}
            >
              {analyzing ? (
                <>
                  <span style={{
                    width: 13, height: 13, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#FFF",
                    animation: "spin 0.75s linear infinite", display: "inline-block",
                  }} />
                  Analyzing
                </>
              ) : "Find My Defaults →"}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ marginTop: 10, fontSize: 13, color: "#DC2626", fontWeight: 500 }}>{error}</p>
        )}
      </div>

      {/* ── Results ── */}
      {results && (
        <div className="fade-up" style={{ maxWidth: 700, margin: "0 auto", padding: "0 32px 88px" }}>

          {/* Count summary */}
          <div style={{
            backgroundColor: totalCount === 0 ? "#F0FDF4" : BG,
            border: `1.5px solid ${totalCount === 0 ? "#86EFAC" : BORDER}`,
            borderRadius: 12, padding: "20px 24px", marginBottom: 28,
          }}>
            {totalCount === 0 ? (
              <p style={{ fontWeight: 700, fontSize: 15, color: "#15803D" }}>No AI defaults detected. This reads clean.</p>
            ) : (
              <>
                <p style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em", marginBottom: 14 }}>
                  {totalCount} AI default{totalCount !== 1 ? "s" : ""} found.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {nonZeroCats.map(([cat, count]) => {
                    const m = CATEGORY_META[cat] || CATEGORY_META.hedge_phrase;
                    return (
                      <span key={cat} style={{
                        backgroundColor: m.bg, border: `1.5px solid ${m.border}`,
                        color: m.labelColor, fontSize: 12, fontWeight: 700,
                        padding: "4px 11px", borderRadius: 100,
                      }}>
                        {count} {m.label}{count > 1 ? "s" : ""}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Highlighted text */}
          {totalCount > 0 && results.defaults?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                Your Writing — Defaults Highlighted
              </p>
              <div style={{ backgroundColor: "#FFF", border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: "24px 28px" }}>
                <HighlightedText text={results.originalText} defaults={results.defaults} />
              </div>
              <p style={{ fontSize: 12, color: "#B8B6AE", marginTop: 8 }}>Hover any highlight to see the default type and why it flags.</p>
            </div>
          )}

          {/* Anchors */}
          {results.anchors?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                What to Keep
              </p>
              {results.anchors.map((anchor, i) => (
                <div key={i} style={{
                  backgroundColor: "#F0FDF4", border: "1.5px solid #86EFAC",
                  borderRadius: 10, padding: "16px 20px", marginBottom: 10,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#15803D", marginBottom: 5 }}>"{anchor.text}"</p>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{anchor.why}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rewrite */}
          {totalCount > 0 && results.rewriteSample && (
            <div style={{ marginBottom: 38 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                First Paragraph — Defaults Removed
              </p>
              <div style={{
                backgroundColor: "#FFF", border: `1.5px solid ${PURPLE}`,
                borderRadius: 12, padding: "30px 28px 24px", position: "relative",
              }}>
                <span style={{
                  position: "absolute", top: 0, left: 20,
                  transform: "translateY(-50%)",
                  backgroundColor: PURPLE, color: "#FFF",
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                  padding: "3px 12px", borderRadius: 100,
                }}>
                  Rewritten — Default Human Voice
                </span>
                <p style={{ fontSize: 15, lineHeight: 1.85, color: TEXT }}>{results.rewriteSample}</p>
              </div>
              <p style={{ fontSize: 12, color: "#B8B6AE", marginTop: 8 }}>
                Neutral human voice, not yours. Build your Voice Signature to get rewrites in your voice.
              </p>
            </div>
          )}

          {/* Email capture */}
          {!emailDone ? (
            <div style={{
              backgroundColor: "#F5F3FF", border: "1.5px solid #DDD6FE",
              borderRadius: 14, padding: "28px 28px", marginBottom: 20,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 8 }}>
                Get your full defaults report.
              </h3>
              <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.65, marginBottom: 20 }}>
                Extended diagnostic, the complete AI Defaults reference guide, and a 7-day email series on stopping defaults before they fire.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && email.includes("@") && setEmailDone(true)}
                  placeholder="your@email.com"
                  style={{
                    flex: 1, minWidth: 200, padding: "11px 16px",
                    fontSize: 14, borderRadius: 9, border: "1.5px solid #DDD6FE",
                    fontFamily: "inherit", backgroundColor: "#FFF", color: TEXT,
                    transition: "border-color 0.15s",
                  }}
                />
                <button
                  onClick={() => email.includes("@") && setEmailDone(true)}
                  className="hover-dim"
                  style={{
                    backgroundColor: PURPLE, color: "#FFF", border: "none",
                    borderRadius: 9, padding: "11px 22px",
                    fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em",
                  }}
                >
                  Send My Report
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: "#F0FDF4", border: "1.5px solid #86EFAC",
              borderRadius: 14, padding: "20px 24px", marginBottom: 20,
            }}>
              <p style={{ fontWeight: 700, color: "#15803D", fontSize: 15 }}>Report on its way. Check your inbox.</p>
            </div>
          )}

          {/* Paid CTA */}
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <p style={{ fontSize: 14, color: MUTED, marginBottom: 16, lineHeight: 1.65 }}>
              Want AI to stop doing this automatically,<br />in your voice, across every tool you use?
            </p>
            <a href="#" className="hover-dim" style={{
              display: "inline-block", backgroundColor: "#0A0A0A", color: "#FFF",
              padding: "14px 32px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              textDecoration: "none", letterSpacing: "-0.015em",
              transition: "opacity 0.15s",
            }}>
              Build your Voice Signature →
            </a>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#C0BEB8" }}>
          A{" "}
          <strong style={{ color: MUTED, fontWeight: 600 }}>Yours, Not Theirs</strong>
          {" "}free tool.{" "}
          <span style={{ color: "#D0CEC8" }}>yoursnottheirs.com/ai-writing-defaults</span>
        </p>
      </footer>

    </div>
  );
}
