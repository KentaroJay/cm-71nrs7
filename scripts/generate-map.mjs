// One-off generator: TopoJSON → inline SVG for index.html.
// Runtime never executes this — run `node generate-map.mjs` once, before the experiment.
//
// Layout: mainland fitted to the viewBox; Okinawa projected separately into a
// bottom-left inset (no target city there) so the mainland stays readable on a phone.

import { readFileSync, writeFileSync } from "node:fs";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";

const W = 380;
const H = 420;

// 県境の見た目を保ったまま座標点を大幅に間引く（ページ重量対策）。
// quantileの引数は「残す点の割合」。粗くなりすぎたらここを上げる。
const SIMPLIFY_KEEP = 0.08;

const raw = JSON.parse(readFileSync(new URL("./japan.topojson", import.meta.url)));
const pre = presimplify(raw);
const topo = simplify(pre, quantile(pre, SIMPLIFY_KEEP));
const prefs = feature(topo, topo.objects.japan).features;

const OKINAWA_ID = 47;
const mainland = prefs.filter((f) => f.properties.id !== OKINAWA_ID);
// 沖縄は島が小さく間引きで消えるため、無圧縮ジオメトリから取る
const okinawa = feature(raw, raw.objects.japan).features
  .find((f) => f.properties.id === OKINAWA_ID);

// City-hall coordinates of the 20 designated cities. `pref` is the JIS code.
// dx/dy/anchor: ラベル位置。leader: ラベルが遠い場合の引出線。
// ox/oy: 過密地帯（京浜・大阪湾岸）でドット同士が重なるのを避ける微小変位（≤3px、実方位に沿う）。
const CITIES = [
  { id: "sapporo",    name: "札幌市",     pref: 1,  lng: 141.3545, lat: 43.0618, dx:  7,  dy:  3,  anchor: "start" },
  { id: "sendai",     name: "仙台市",     pref: 4,  lng: 140.8694, lat: 38.2682, dx:  7,  dy:  3,  anchor: "start" },
  { id: "saitama",    name: "さいたま市", pref: 11, lng: 139.6455, lat: 35.8617, dx: -4,  dy: -6,  anchor: "end", oy: -2 },
  { id: "chiba",      name: "千葉市",     pref: 12, lng: 140.1063, lat: 35.6073, dx:  7,  dy: -3,  anchor: "start", ox: 3, oy: -1 },
  { id: "yokohama",   name: "横浜市",     pref: 14, lng: 139.638,  lat: 35.4437, dx:  2,  dy: 22,  anchor: "middle", leader: true, ox: -1, oy: 2 },
  { id: "kawasaki",   name: "川崎市",     pref: 14, lng: 139.7029, lat: 35.5308, dx: 15,  dy: 18,  anchor: "middle", leader: true, ox: 1, oy: -3 },
  { id: "sagamihara", name: "相模原市",   pref: 14, lng: 139.3733, lat: 35.5711, dx: -11, dy:  0,  anchor: "end", ox: -2, oy: -1 },
  { id: "niigata",    name: "新潟市",     pref: 15, lng: 139.0364, lat: 37.9161, dx: -4,  dy: -5,  anchor: "end"   },
  { id: "shizuoka",   name: "静岡市",     pref: 22, lng: 138.3828, lat: 34.9756, dx: 12,  dy: 22,  anchor: "middle", leader: true },
  { id: "hamamatsu",  name: "浜松市",     pref: 22, lng: 137.7261, lat: 34.7108, dx: -4,  dy: 24,  anchor: "middle", leader: true },
  { id: "nagoya",     name: "名古屋市",   pref: 23, lng: 136.9066, lat: 35.1815, dx: -8,  dy: 18,  anchor: "middle", leader: true },
  { id: "kyoto",      name: "京都市",     pref: 26, lng: 135.7681, lat: 35.0116, dx:  2,  dy: -7,  anchor: "middle"},
  { id: "osaka",      name: "大阪市",     pref: 27, lng: 135.5023, lat: 34.6937, dx: 12,  dy: -3,  anchor: "start", oy: -2 },
  { id: "sakai",      name: "堺市",       pref: 27, lng: 135.483,  lat: 34.5733, dx: -3,  dy: 18,  anchor: "end", leader: true, ox: 1, oy: 2 },
  { id: "kobe",       name: "神戸市",     pref: 28, lng: 135.1955, lat: 34.6901, dx: -14, dy: 12,  anchor: "end", leader: true },
  { id: "okayama",    name: "岡山市",     pref: 33, lng: 133.9195, lat: 34.6551, dx: -1,  dy: -8,  anchor: "middle"},
  { id: "hiroshima",  name: "広島市",     pref: 34, lng: 132.4553, lat: 34.3853, dx: -2,  dy: -8,  anchor: "middle"},
  { id: "kitakyushu", name: "北九州市",   pref: 40, lng: 130.8752, lat: 33.8835, dx:  6,  dy: -4,  anchor: "start" },
  { id: "fukuoka",    name: "福岡市",     pref: 40, lng: 130.4017, lat: 33.5902, dx: -8,  dy:  1,  anchor: "end"   },
  { id: "kumamoto",   name: "熊本市",     pref: 43, lng: 130.7079, lat: 32.8032, dx:  6,  dy:  8,  anchor: "start" },
];

const TARGET_PREFS = new Set(CITIES.map((c) => c.pref));

// Mainland: fitExtentを全ジオメトリに掛けると小笠原等の離島で本土が縮むため、
// 主要4島のバウンディングボックスにフィットさせる（枠外の離島は描画時にクリップ）。
const MAIN_BBOX = {
  type: "MultiPoint",
  coordinates: [[128.3, 30.9], [146.2, 45.7]],
};
const mainProj = geoMercator().fitExtent([[4, 4], [W - 4, H - 4]], MAIN_BBOX);
const mainPath = geoPath(mainProj).digits(1);

// Okinawa inset: own projection fitted into a corner box (本州南方の空き海域=右下)。
// 大東・先島諸島まで含めるとフィットが薄まるため、沖縄本島周辺にフィットさせる。
const INSET = { x: W - 104, y: H - 92, w: 96, h: 84 };
const OKI_BBOX = { type: "MultiPoint", coordinates: [[126.7, 26.0], [128.35, 27.05]] };
const okiProj = geoMercator().fitExtent(
  [[INSET.x + 6, INSET.y + 6], [INSET.x + INSET.w - 6, INSET.y + INSET.h - 6]],
  OKI_BBOX
);
const okiPath = geoPath(okiProj).digits(1);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const prefPathEl = (f, d) => {
  const { id, nam_ja } = f.properties;
  const cls = TARGET_PREFS.has(id) ? "pref target" : "pref";
  return `    <path id="pref-${id}" class="${cls}" d="${d}"><title>${esc(nam_ja)}</title></path>`;
};

const paths = mainland
  .sort((a, b) => a.properties.id - b.properties.id)
  .map((f) => prefPathEl(f, mainPath(f)));

const cityEls = CITIES.map((c) => {
  const [px, py] = mainProj([c.lng, c.lat]);
  const x = Math.round((px + (c.ox || 0)) * 10) / 10;
  const y = Math.round((py + (c.oy || 0)) * 10) / 10;
  // 過密地帯でラベルをドットから離す場合は引出線を添える
  const leader = c.leader
    ? `      <line x1="0" y1="0" x2="${Math.round(c.dx * 0.8)}" y2="${c.dy - 8}" class="leader"/>\n`
    : "";
  return [
    `    <g class="city" id="city-${c.id}" transform="translate(${x},${y})">`,
    leader +
    `      <circle r="4" class="city-dot"/>`,
    `      <text x="${c.dx}" y="${c.dy}" text-anchor="${c.anchor}" class="city-label">${esc(c.name)}</text>`,
    `      <title>${esc(c.name)}</title>`,
    `    </g>`,
  ].join("\n");
});

const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="map-title" id="japan-map">
  <title id="map-title">政令指定都市の撮影達成状況マップ</title>
  <defs>
    <clipPath id="map-clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
    <pattern id="hatch-partial" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="var(--fill-partial)"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--fill-partial-ink)" stroke-width="1.6"/>
    </pattern>
  </defs>
  <g class="prefs" clip-path="url(#map-clip)">
${paths.join("\n")}
  </g>
  <g class="inset" clip-path="url(#inset-clip)">
    <clipPath id="inset-clip"><rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}"/></clipPath>
    <rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" class="inset-box"/>
    <path id="pref-47" class="pref" d="${okiPath(okinawa)}"><title>沖縄県</title></path>
    <text x="${INSET.x + 5}" y="${INSET.y + 12}" class="inset-label">沖縄県</text>
  </g>
  <g class="cities">
${cityEls.join("\n")}
  </g>
</svg>`;

// Inject between markers in index.html.
const htmlUrl = new URL("../index.html", import.meta.url);
const html = readFileSync(htmlUrl, "utf8");
const START = "<!-- MAP:START -->";
const END = "<!-- MAP:END -->";
const s = html.indexOf(START);
const e = html.indexOf(END);
if (s === -1 || e === -1) throw new Error("MAP:START / MAP:END markers not found in index.html");
writeFileSync(htmlUrl, html.slice(0, s + START.length) + "\n" + svg + "\n" + html.slice(e));
console.log(`Injected SVG (${(svg.length / 1024).toFixed(0)} KB) into index.html`);
