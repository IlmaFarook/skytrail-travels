const scenes = {
  hills: {
    sky: '#f1dfbd',
    sun: { cx: 298, cy: 92, r: 38, fill: '#d9622f' },
    layers: [
      { d: 'M0 150 C60 108 120 132 180 114 S300 88 400 124 V260 H0Z', fill: '#8aa77f' },
      { d: 'M0 186 C70 150 140 176 210 160 S330 140 400 170 V260 H0Z', fill: '#4f7d5c' },
      { d: 'M0 222 C80 196 160 216 240 206 S350 190 400 212 V260 H0Z', fill: '#24503f' },
    ],
    extra: (
      <g stroke="#f1dfbd" strokeWidth="1.4" opacity=".35" fill="none">
        <path d="M30 205 C90 188 150 202 220 192" />
        <path d="M60 232 C120 218 200 230 300 220" />
      </g>
    ),
  },
  beach: {
    sky: '#f9dfc8',
    sun: { cx: 205, cy: 132, r: 50, fill: '#e2582f' },
    layers: [
      { d: 'M0 148 H400 V260 H0Z', fill: '#3e8aa3' },
      { d: 'M0 178 H400 V260 H0Z', fill: '#2e7189' },
      { d: 'M0 214 C100 198 210 226 400 204 V260 H0Z', fill: '#ead0a0' },
    ],
    extra: (
      <g stroke="#fff" strokeWidth="2" opacity=".55" fill="none" strokeLinecap="round">
        <path d="M20 164 q14 -7 28 0 t28 0 t28 0 t28 0" />
        <path d="M230 160 q14 -7 28 0 t28 0 t28 0" />
        <path d="M110 192 q14 -7 28 0 t28 0 t28 0 t28 0" />
      </g>
    ),
  },
  rail: {
    sky: '#e6ecd9',
    sun: { cx: 88, cy: 82, r: 30, fill: '#eeab3f' },
    layers: [
      { d: 'M0 140 C80 100 160 130 250 105 S360 100 400 120 V260 H0Z', fill: '#98bb8f' },
      { d: 'M0 176 C90 142 170 166 260 150 S360 150 400 160 V260 H0Z', fill: '#5f9170' },
    ],
    extra: (
      <g>
        <rect x="110" y="186" width="240" height="8" fill="#f3ead6" />
        <rect x="110" y="194" width="240" height="46" fill="#d6c3a0" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${124 + i * 46} 240 V216 a18 18 0 0 1 36 0 V240Z`} fill="#3d7455" />
        ))}
      </g>
    ),
    after: [{ d: 'M0 232 C90 216 200 238 400 224 V260 H0Z', fill: '#24503f' }],
  },
  safari: {
    sky: '#f5d4a0',
    sun: { cx: 282, cy: 124, r: 62, fill: '#df5a14' },
    layers: [
      { d: 'M0 188 C120 178 260 196 400 184 V260 H0Z', fill: '#b9873c' },
      { d: 'M0 226 C100 214 300 236 400 220 V260 H0Z', fill: '#6a491f' },
    ],
    extra: (
      <g fill="#2f3b1d">
        <rect x="107" y="142" width="5" height="48" />
        <ellipse cx="110" cy="140" rx="56" ry="12" />
        <ellipse cx="86" cy="147" rx="30" ry="8" />
        <path d="M300 214 l4 -16 l4 16 M312 214 l3 -12 l3 12 M330 216 l4 -14 l4 14" stroke="#2f3b1d" strokeWidth="2" fill="none" />
      </g>
    ),
  },
  island: {
    sky: '#d7f0ee',
    sun: { cx: 322, cy: 68, r: 28, fill: '#f6c556' },
    layers: [
      { d: 'M0 138 H400 V260 H0Z', fill: '#2bb3b4' },
      { d: 'M0 176 H400 V260 H0Z', fill: '#1d8fa2' },
      { d: 'M0 216 H400 V260 H0Z', fill: '#11708a' },
    ],
    extra: (
      <g>
        <ellipse cx="168" cy="150" rx="62" ry="10" fill="#efdfb2" />
        <path d="M170 148 C176 122 168 104 160 88" stroke="#6a4727" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g stroke="#1d6b47" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d="M160 88 q-28 -4 -42 14" />
          <path d="M160 88 q-6 -26 20 -34" />
          <path d="M160 88 q26 -14 46 4" />
          <path d="M160 88 q-24 -18 -40 -8" />
        </g>
        <g fill="#8a5a34">
          <rect x="266" y="154" width="56" height="6" />
          <rect x="272" y="160" width="3" height="16" />
          <rect x="313" y="160" width="3" height="16" />
        </g>
        <path d="M262 154 L294 134 L326 154Z" fill="#c9a26a" />
      </g>
    ),
  },
  temple: {
    sky: '#f2d8e4',
    sun: { cx: 92, cy: 84, r: 34, fill: '#ee9466' },
    layers: [
      { d: 'M0 150 C100 130 200 150 400 120 V260 H0Z', fill: '#a5cd92' },
      { d: 'M0 182 C120 162 220 186 400 156 V260 H0Z', fill: '#74ad72' },
      { d: 'M0 212 C120 196 240 216 400 190 V260 H0Z', fill: '#4c8c58' },
      { d: 'M0 240 C130 228 260 244 400 226 V260 H0Z', fill: '#2f6a40' },
    ],
    extra: (
      <g fill="#4a3245">
        <rect x="288" y="110" width="64" height="22" />
        <path d="M292 110 L348 110 L338 92 L302 92Z" fill="#3a2639" />
        <path d="M304 92 L336 92 L328 76 L312 76Z" fill="#4a3245" />
        <path d="M313 76 L327 76 L320 62Z" fill="#3a2639" />
      </g>
    ),
  },

  fort: {
    sky: '#f8dcc4',
    sun: { cx: 92, cy: 92, r: 36, fill: '#e2652d' },
    layers: [
      { d: 'M0 150 H400 V260 H0Z', fill: '#3e8aa3' },
      { d: 'M0 192 H400 V260 H0Z', fill: '#2e7189' },
    ],
    extra: (
      <g>
        <rect x="0" y="130" width="400" height="40" fill="#d8c3a0" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={i * 30 + 6} y="122" width="16" height="8" fill="#d8c3a0" />)}
        <path d="M0 170 H400" stroke="#a88f68" strokeWidth="2" />
        <path d="M292 130 L297 72 H313 L318 130Z" fill="#f3ead6" />
        <rect x="295" y="92" width="21" height="9" fill="#c4512b" />
        <path d="M293 72 L305 56 L317 72Z" fill="#4a3245" />
        <rect x="302" y="62" width="6" height="8" fill="#f3ead6" />
        <g stroke="#fff" strokeWidth="2" opacity=".5" fill="none" strokeLinecap="round">
          <path d="M30 205 q14 -7 28 0 t28 0 t28 0" />
          <path d="M210 215 q14 -7 28 0 t28 0 t28 0" />
        </g>
      </g>
    ),
    after: [{ d: 'M0 238 C110 226 250 246 400 230 V260 H0Z', fill: '#ead0a0' }],
  },
  rock: {
    sky: '#f6dcb8',
    sun: { cx: 322, cy: 80, r: 36, fill: '#e0642a' },
    layers: [
      { d: 'M0 192 C80 172 180 188 260 176 S360 172 400 182 V260 H0Z', fill: '#78a272' },
    ],
    extra: (
      <g>
        <path d="M128 194 L150 82 Q158 66 182 66 H216 Q240 66 248 82 L274 194Z" fill="#9a6b4d" />
        <path d="M216 66 Q240 66 248 82 L274 194 H214Z" fill="#7d533a" opacity=".55" />
        <path d="M150 82 Q158 66 182 66 H216 Q240 66 248 82 Q200 74 150 82Z" fill="#4f7d5c" />
        <path d="M168 110 L164 150 M196 100 L194 160" stroke="#7d533a" strokeWidth="2" opacity=".5" />
        <rect x="178" y="58" width="36" height="10" fill="#8a5c40" />
      </g>
    ),
    after: [
      { d: 'M0 224 C100 204 200 228 300 214 S380 208 400 216 V260 H0Z', fill: '#24503f' },
    ],
  },
  tea: {
    sky: '#e4ecf0',
    sun: { cx: 304, cy: 72, r: 26, fill: '#f1c36a' },
    layers: [
      { d: 'M0 132 C90 100 180 126 270 104 S370 100 400 112 V260 H0Z', fill: '#a9c4a2' },
      { d: 'M0 172 C100 142 200 166 300 150 S380 148 400 156 V260 H0Z', fill: '#66a066' },
      { d: 'M0 216 C100 196 220 220 400 200 V260 H0Z', fill: '#3d7a4a' },
    ],
    extra: (
      <g>
        <g stroke="#9ccf94" strokeWidth="2" fill="none" opacity=".6">
          <path d="M0 184 C100 158 200 180 300 164 S380 162 400 168" />
          <path d="M0 196 C100 172 200 192 300 178 S380 176 400 182" />
          <path d="M0 236 C100 218 220 240 400 220" />
          <path d="M0 248 C100 232 220 252 400 236" />
        </g>
        <rect x="58" y="150" width="44" height="22" fill="#f3ead6" />
        <path d="M54 150 L80 132 L106 150Z" fill="#a03f1e" />
        <rect x="76" y="158" width="8" height="14" fill="#6a4727" />
      </g>
    ),
  },
  surf: {
    sky: '#fbd9b6',
    sun: { cx: 92, cy: 112, r: 46, fill: '#e2582f' },
    layers: [
      { d: 'M0 142 H400 V260 H0Z', fill: '#2e8aa5' },
      { d: 'M0 178 H400 V260 H0Z', fill: '#256f88' },
    ],
    extra: (
      <g>
        <path d="M160 214 C176 150 256 120 326 156 C282 154 262 182 270 214Z" fill="#bfe3ea" />
        <path d="M160 214 C176 150 256 120 326 156" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M250 150 C262 144 276 146 284 152" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
        <g fill="#2f2a26">
          <circle cx="238" cy="136" r="5" />
          <path d="M236 142 L230 160 L244 160 L242 142Z" />
          <path d="M222 164 H258 L252 168 H228Z" fill="#c4512b" />
        </g>
        <g stroke="#fff" strokeWidth="2" opacity=".5" fill="none" strokeLinecap="round">
          <path d="M20 160 q14 -7 28 0 t28 0 t28 0" />
          <path d="M290 200 q14 -7 28 0 t28 0" />
        </g>
      </g>
    ),
    after: [{ d: 'M0 238 C120 226 260 246 400 228 V260 H0Z', fill: '#ead0a0' }],
  },
  city: {
    sky: '#f4d9c8',
    sun: { cx: 306, cy: 96, r: 42, fill: '#df6a3a' },
    layers: [
      { d: 'M0 172 H400 V260 H0Z', fill: '#3e8aa3' },
      { d: 'M0 206 H400 V260 H0Z', fill: '#2e7189' },
    ],
    extra: (
      <g>
        <g fill="#4a3245">
          <rect x="26" y="112" width="30" height="60" />
          <rect x="60" y="94" width="26" height="78" />
          <rect x="90" y="126" width="34" height="46" />
          <rect x="128" y="82" width="28" height="90" />
        </g>
        <g fill="#f4d9c8" opacity=".55">
          {[0, 1, 2, 3].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={134 + c * 10} y={92 + r * 18} width="5" height="8" />))}
        </g>
        <path d="M196 172 V152 Q196 126 222 126 Q248 126 248 152 V172Z" fill="#efe0b8" />
        <rect x="219" y="112" width="6" height="16" fill="#efe0b8" />
        <g stroke="#fff" strokeWidth="2" opacity=".45" fill="none" strokeLinecap="round">
          <path d="M40 190 q14 -7 28 0 t28 0 t28 0" />
          <path d="M240 222 q14 -7 28 0 t28 0 t28 0" />
        </g>
      </g>
    ),
    after: [{ d: 'M0 238 C100 228 220 244 400 232 V260 H0Z', fill: '#ead0a0' }],
  },
  skyline: {
    sky: '#f2d6b8',
    sun: { cx: 90, cy: 104, r: 42, fill: '#e7733a' },
    layers: [
      { d: 'M0 178 H400 V260 H0Z', fill: '#e6c79c' },
    ],
    extra: (
      <g>
        <g fill="#7d8f99">
          <rect x="196" y="118" width="22" height="80" />
          <rect x="222" y="140" width="18" height="58" />
          <rect x="304" y="126" width="24" height="72" />
          <rect x="332" y="150" width="20" height="48" />
        </g>
        <path d="M256 198 L264 108 H278 L286 198Z" fill="#9fb0b8" />
        <path d="M261 140 L267 62 H275 L281 140Z" fill="#b9c7cd" />
        <path d="M265 84 L271 20 L277 84Z" fill="#d6dfe3" />
      </g>
    ),
    after: [
      { d: 'M0 204 C80 186 160 204 240 196 S360 192 400 204 V260 H0Z', fill: '#d9a56a' },
      { d: 'M0 236 C100 218 220 244 400 224 V260 H0Z', fill: '#b97f44' },
    ],
  },
  backwater: {
    sky: '#e2efdf',
    sun: { cx: 82, cy: 78, r: 30, fill: '#f0b44a' },
    layers: [
      { d: 'M0 152 C100 142 200 152 400 144 V260 H0Z', fill: '#4f8f5a' },
      { d: 'M0 172 H400 V260 H0Z', fill: '#4aa6a0' },
      { d: 'M0 208 H400 V260 H0Z', fill: '#2f8588' },
    ],
    extra: (
      <g>
        {[58, 112, 196, 330, 372].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 156 C${x + 4} 130 ${x - 2} 112 ${x - 8} ${96 + (i % 2) * 8}`} stroke="#6a4727" strokeWidth="4" fill="none" strokeLinecap="round" />
            <g stroke="#1d6b47" strokeWidth="4" fill="none" strokeLinecap="round">
              <path d={`M${x - 8} ${96 + (i % 2) * 8} q-22 -3 -32 10`} />
              <path d={`M${x - 8} ${96 + (i % 2) * 8} q-4 -20 16 -26`} />
              <path d={`M${x - 8} ${96 + (i % 2) * 8} q20 -10 34 4`} />
            </g>
          </g>
        ))}
        <path d="M138 200 Q148 216 170 216 H252 Q274 216 284 200Z" fill="#6a4727" />
        <path d="M150 200 V184 Q150 166 192 166 H238 Q274 166 274 184 V200Z" fill="#d8b86a" />
        <g fill="#6a4727" opacity=".7">
          <rect x="166" y="180" width="14" height="10" />
          <rect x="196" y="180" width="14" height="10" />
          <rect x="226" y="180" width="14" height="10" />
        </g>
        <g stroke="#fff" strokeWidth="2" opacity=".4" fill="none" strokeLinecap="round">
          <path d="M20 190 q14 -7 28 0 t28 0 t28 0" />
          <path d="M290 230 q14 -7 28 0 t28 0 t28 0" />
          <path d="M120 238 q14 -7 28 0 t28 0" />
        </g>
      </g>
    ),
  },
};

const destinationScene = {
  Kandy: 'hills',
  Mirissa: 'beach',
  Ella: 'rail',
  'Yala National Park': 'safari',
  Yala: 'safari',
  Maldives: 'island',
  Bali: 'temple',
  Sigiriya: 'rock',
  Galle: 'fort',
  'Nuwara Eliya': 'tea',
  Trincomalee: 'beach',
  'Arugam Bay': 'surf',
  Colombo: 'city',
  Dubai: 'skyline',
  Kerala: 'backwater',
};

export function sceneFor(name) {
  return destinationScene[name] || 'hills';
}

const tones = {
  dusk: { sky: '#efb9a9', sun: '#fbe2ae' },
  mist: { sky: '#dde2da', sun: '#a3b5a8' },
};

export function toneFor(category) {
  if (category === 'Honeymoon') return 'dusk';
  if (category === 'Corporate') return 'mist';
  return undefined;
}

export default function PlaceArt({ place, scene, tone, flip = false, className = '', label }) {
  const key = scene || sceneFor(place);
  const base = scenes[key];
  const t = tones[tone];
  const s = t ? { ...base, sky: t.sky, sun: { ...base.sun, fill: t.sun } } : base;
  return (
    <svg
      className={`place-art ${className}`}
      style={flip ? { scale: '-1 1' } : undefined}
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect width="400" height="260" fill={s.sky} />
      <circle cx={s.sun.cx} cy={s.sun.cy} r={s.sun.r} fill={s.sun.fill} />
      {s.layers.map((l, i) => <path key={i} d={l.d} fill={l.fill} />)}
      {s.extra}
      {s.after?.map((l, i) => <path key={`a${i}`} d={l.d} fill={l.fill} />)}
    </svg>
  );
}
