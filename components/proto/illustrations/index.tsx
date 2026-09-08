import { Illustration } from "../../../lib/proto/types";

const STROKE = "#94A3B8";
const ACCENT = "#2F6FED";
const FILL_SOFT = "#EFF4FF";

export function NetworkIllustration() {
  const left = [40, 90, 140];
  const mid = [70, 115];
  const right = [50, 100, 150];
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%">
      {left.map((ly) =>
        mid.map((my) => (
          <line key={`${ly}-${my}`} x1={70} y1={ly} x2={150} y2={my} stroke={STROKE} strokeWidth="1.4" />
        ))
      )}
      {mid.map((my) =>
        right.map((ry) => (
          <line key={`${my}-${ry}`} x1={150} y1={my} x2={230} y2={ry} stroke={STROKE} strokeWidth="1.4" />
        ))
      )}
      {left.map((y, i) => (
        <circle key={`l${i}`} cx={70} cy={y} r={9} fill={FILL_SOFT} stroke={ACCENT} strokeWidth="2" />
      ))}
      {mid.map((y, i) => (
        <circle key={`m${i}`} cx={150} cy={y} r={9} fill={FILL_SOFT} stroke={ACCENT} strokeWidth="2" />
      ))}
      {right.map((y, i) => (
        <circle key={`r${i}`} cx={230} cy={y} r={9} fill={FILL_SOFT} stroke={ACCENT} strokeWidth="2" />
      ))}
      <text x="70" y="150" textAnchor="middle" fontSize="10" fill="#64748B">入力層</text>
      <text x="150" y="150" textAnchor="middle" fontSize="10" fill="#64748B">中間層</text>
      <text x="230" y="150" textAnchor="middle" fontSize="10" fill="#64748B">出力層</text>
    </svg>
  );
}

export function GraphIllustration() {
  const points = "20,140 60,120 100,95 140,100 180,60 220,68 260,30 300,40";
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%">
      <line x1="20" y1="150" x2="300" y2="150" stroke={STROKE} strokeWidth="1.4" />
      <line x1="20" y1="150" x2="20" y2="20" stroke={STROKE} strokeWidth="1.4" />
      <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.split(" ").map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill={ACCENT} />;
      })}
      <line x1="20" y1="112" x2="300" y2="112" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
      <text x="300" y="106" textAnchor="end" fontSize="10" fill="#94A3B8">従来手法</text>
    </svg>
  );
}

export function ComparisonIllustration() {
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%">
      <rect x="30" y="40" width="100" height="100" rx="10" fill="#F1F5F9" stroke={STROKE} strokeWidth="1.4" />
      <rect x="190" y="20" width="100" height="120" rx="10" fill={FILL_SOFT} stroke={ACCENT} strokeWidth="2" />
      <rect x="55" y="100" width="50" height="30" fill="#CBD5E1" />
      <rect x="215" y="70" width="50" height="60" fill={ACCENT} opacity="0.55" />
      <text x="80" y="160" textAnchor="middle" fontSize="10" fill="#64748B">従来</text>
      <text x="240" y="160" textAnchor="middle" fontSize="10" fill="#64748B">新手法</text>
      <path d="M140 90 L178 90" stroke={STROKE} strokeWidth="2" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={STROKE} />
        </marker>
      </defs>
    </svg>
  );
}

export function ProcessIllustration() {
  const steps = [
    { x: 40, label: "刺激" },
    { x: 160, label: "反応" },
    { x: 280, label: "変化" },
  ];
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%">
      {steps.map((s, i) => (
        <g key={s.label}>
          <circle cx={s.x} cy={90} r={26} fill={i === 1 ? FILL_SOFT : "#F1F5F9"} stroke={i === 1 ? ACCENT : STROKE} strokeWidth="2" />
          <text x={s.x} y={150} textAnchor="middle" fontSize="11" fill="#475569">{s.label}</text>
          {i < steps.length - 1 && (
            <path d={`M${s.x + 30} 90 L${steps[i + 1].x - 30} 90`} stroke={STROKE} strokeWidth="2" markerEnd="url(#arrow2)" />
          )}
        </g>
      ))}
      <defs>
        <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={STROKE} />
        </marker>
      </defs>
    </svg>
  );
}

export function ArticleIllustration({ type }: { type: Illustration }) {
  switch (type) {
    case "network":
      return <NetworkIllustration />;
    case "graph":
      return <GraphIllustration />;
    case "comparison":
      return <ComparisonIllustration />;
    case "process":
      return <ProcessIllustration />;
  }
}
