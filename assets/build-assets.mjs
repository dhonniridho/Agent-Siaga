import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\//, '').replace(/%20/g, ' ');

const CHARACTER_FILES = [
  ['characters/player_idle_01.svg', 256, 320, 'Pemain: pose diam'],
  ...Array.from({ length: 6 }, (_, i) => [`characters/player_walk_0${i + 1}.svg`, 256, 320, `Pemain: jalan frame ${i + 1}`]),
  ['characters/player_jump_01.svg', 256, 320, 'Pemain: melompat'],
  ['characters/player_crouch_01.svg', 256, 320, 'Pemain: jongkok dan berlindung'],
  ['characters/player_hit_01.svg', 256, 320, 'Pemain: terkena benda dan pusing'],
  ['characters/player_win_01.svg', 256, 320, 'Pemain: senang dan menang'],
  ['characters/kapten_idle_01.svg', 320, 400, 'Kapten Siaga: netral'],
  ['characters/kapten_happy_01.svg', 320, 400, 'Kapten Siaga: senang'],
  ['characters/kapten_warn_01.svg', 320, 400, 'Kapten Siaga: peringatan'],
  ['characters/kapten_error_01.svg', 320, 400, 'Kapten Siaga: koreksi'],
  ['characters/kapten_point_01.svg', 320, 400, 'Kapten Siaga: menunjuk dan menjelaskan'],
  ...[
    ['blaze', '#ef4444'], ['aqua', '#06b6d4'], ['terra', '#22c55e'],
    ['tech', '#8b5cf6'], ['doc', '#ec4899'], ['scout', '#f59e0b'],
  ].map(([name]) => [`characters/avatar_${name}.svg`, 128, 128, `Avatar Agent ${name}`]),
];

const BACKGROUND_FILES = [
  ['backgrounds/menu_bg.svg', 1920, 1080, 'Latar layar awal'],
  ['backgrounds/guide_bg.svg', 1920, 1080, 'Latar panduan'],
  ['backgrounds/victory_bg.svg', 1920, 1080, 'Latar kemenangan'],
  ['backgrounds/quiz_arena.svg', 1920, 1080, 'Latar arena kuis'],
  ['backgrounds/z01_classroom_far.svg', 1920, 1080, 'Z01: lapisan jauh kelas'],
  ['backgrounds/z01_classroom_mid.svg', 1920, 1080, 'Z01: lapisan tengah kelas'],
  ['backgrounds/z01_classroom_front.svg', 1920, 1080, 'Z01: lantai dan objek depan kelas'],
  ['backgrounds/z01_exit_hallway.svg', 1920, 1080, 'Z01: lorong keluar dan finish'],
  ['backgrounds/z02_river_far.svg', 1920, 1080, 'Z02: langit dan hutan jauh'],
  ['backgrounds/z02_river_mid.svg', 1920, 1080, 'Z02: sungai dan hutan tengah'],
  ['backgrounds/z02_river_front.svg', 1920, 1080, 'Z02: air dan tepian depan'],
  ['backgrounds/z02_safe_highground.svg', 1920, 1080, 'Z02: tempat tinggi aman'],
  ['backgrounds/z03_hill_far.svg', 1920, 1080, 'Z03: bukit jauh'],
  ['backgrounds/z03_hill_mid.svg', 1920, 1080, 'Z03: lereng tengah'],
  ['backgrounds/z03_hill_front.svg', 1920, 1080, 'Z03: jalur lereng depan'],
  ['backgrounds/z03_safe_ground.svg', 1920, 1080, 'Z03: tanah stabil dan finish'],
  ['backgrounds/z04_volcano_far.svg', 1920, 1080, 'Z04: gunung jauh'],
  ['backgrounds/z04_volcano_mid.svg', 1920, 1080, 'Z04: gunung api dan kawah'],
  ['backgrounds/z04_volcano_front.svg', 1920, 1080, 'Z04: tanah berbatu dan abu'],
  ['backgrounds/z04_evacuation_spot.svg', 1920, 1080, 'Z04: titik evakuasi aman'],
];

const TILE_FILES = [
  ['tiles/classroom_floor.svg', 256, 256, 'Lantai kelas seamless'],
  ['tiles/road_straight.svg', 512, 256, 'Jalan lurus seamless'],
  ['tiles/road_edge_left.svg', 256, 256, 'Tepi kiri jalan seamless'],
  ['tiles/road_edge_right.svg', 256, 256, 'Tepi kanan jalan seamless'],
  ['tiles/road_corner_left.svg', 256, 256, 'Sudut kiri jalan seamless'],
  ['tiles/road_corner_right.svg', 256, 256, 'Sudut kanan jalan seamless'],
  ['tiles/ground_straight.svg', 512, 256, 'Tanah lurus seamless'],
  ['tiles/ground_edge_left.svg', 256, 256, 'Tepi kiri tanah seamless'],
  ['tiles/ground_edge_right.svg', 256, 256, 'Tepi kanan tanah seamless'],
  ['tiles/water_edge.svg', 256, 256, 'Tepi air dan daratan seamless'],
  ['tiles/safe_platform.svg', 512, 256, 'Platform tanah aman'],
  ['tiles/finish_platform.svg', 512, 256, 'Ujung finish rapi'],
];

const OBJECT_FILES = [
  ['objects/table.svg', 256, 256, 'Meja untuk berlindung'],
  ['objects/chair.svg', 192, 256, 'Kursi kelas'],
  ['objects/cabinet.svg', 256, 384, 'Lemari yang dapat jatuh'],
  ['objects/shelf.svg', 256, 384, 'Rak buku'],
  ['objects/lamp.svg', 256, 192, 'Lampu plafon jatuh'],
  ['objects/book.svg', 128, 96, 'Buku jatuh'],
  ['objects/flower_pot.svg', 160, 192, 'Pot bunga jatuh'],
  ['objects/roof_tile.svg', 192, 128, 'Genting jatuh'],
  ['objects/window.svg', 384, 384, 'Jendela kelas'],
  ['objects/exit_door.svg', 320, 512, 'Pintu keluar'],
  ['objects/driftwood.svg', 512, 192, 'Batang kayu hanyut'],
  ['objects/electric_water.svg', 384, 192, 'Genangan air berbahaya'],
  ['objects/emergency_backpack.svg', 256, 320, 'Tas siaga'],
  ['objects/safe_house.svg', 384, 384, 'Bangunan tempat aman'],
  ['objects/item_document.svg', 128, 128, 'Item dokumen penting'],
  ['objects/item_cash.svg', 128, 128, 'Item uang tunai'],
  ['objects/item_medicine.svg', 128, 128, 'Item obat'],
  ['objects/item_flashlight.svg', 128, 128, 'Item senter'],
  ['objects/item_first_aid.svg', 128, 128, 'Item kotak P3K'],
  ['objects/item_tv.svg', 128, 128, 'Item televisi tidak prioritas'],
  ['objects/item_game_console.svg', 128, 128, 'Item konsol game tidak prioritas'],
  ['objects/item_snack.svg', 128, 128, 'Item snack tidak prioritas'],
  ['objects/item_pillow.svg', 128, 128, 'Item bantal tidak prioritas'],
  ['objects/item_trophy.svg', 128, 128, 'Item piala tidak prioritas'],
  ['objects/rock_small.svg', 160, 160, 'Kerikil dan batu kecil'],
  ['objects/rock_large.svg', 320, 288, 'Batu besar jatuh'],
  ['objects/fallen_tree.svg', 512, 192, 'Pohon tumbang'],
  ['objects/landslide_pile.svg', 512, 384, 'Model baru tumpukan tanah longsor'],
  ['objects/slope_crack.svg', 512, 128, 'Retakan lereng'],
  ['objects/hill_warning_sign.svg', 192, 256, 'Tanda bahaya longsor'],
  ['objects/volcano.svg', 768, 768, 'Gunung berapi side-view'],
  ['objects/lava_stream.svg', 512, 192, 'Aliran lava'],
  ['objects/glowing_rock.svg', 192, 192, 'Batu pijar'],
  ['objects/ash_cloud.svg', 512, 384, 'Awan abu'],
  ['objects/evacuation_car.svg', 512, 256, 'Mobil evakuasi'],
  ['objects/bird_flock.svg', 384, 256, 'Hewan turun gunung'],
  ['objects/volcanic_crack.svg', 384, 128, 'Retakan vulkanik'],
  ['objects/evacuation_flag.svg', 192, 320, 'Bendera titik evakuasi'],
];

const EFFECT_FILES = [
  ['effects/dust_01.svg', 256, 256, 'Debu kecil'],
  ['effects/dust_02.svg', 256, 256, 'Debu sedang'],
  ['effects/dust_03.svg', 256, 256, 'Debu besar'],
  ['effects/splash_01.svg', 256, 192, 'Percikan air kecil'],
  ['effects/splash_02.svg', 256, 192, 'Percikan air sedang'],
  ['effects/splash_03.svg', 256, 192, 'Percikan air besar'],
  ['effects/water_ripple.svg', 384, 192, 'Riak air'],
  ['effects/dizzy_stars.svg', 256, 256, 'Bintang pusing'],
  ['effects/warning_shadow.svg', 384, 192, 'Bayangan peringatan'],
  ['effects/pebbles.svg', 256, 256, 'Kerikil beterbangan'],
  ['effects/rain_streaks.svg', 512, 512, 'Hujan'],
  ['effects/ash_particles.svg', 512, 512, 'Partikel abu'],
  ['effects/lava_glow.svg', 384, 384, 'Cahaya lava'],
  ['effects/hit_flash.svg', 256, 256, 'Kilatan terkena benda'],
  ['effects/sparkle.svg', 256, 256, 'Kilau keberhasilan'],
  ['effects/confetti.svg', 512, 512, 'Konfeti kemenangan'],
];

const UI_FILES = [
  ['ui/logo_agent_siaga.svg', 640, 192, 'Logo Agent Siaga'],
  ['ui/icon_home.svg', 64, 64, 'Ikon rumah'],
  ['ui/icon_speaker.svg', 64, 64, 'Ikon speaker aktif'],
  ['ui/icon_speaker_off.svg', 64, 64, 'Ikon speaker dicoret'],
  ['ui/icon_target.svg', 64, 64, 'Ikon target'],
  ['ui/icon_star.svg', 64, 64, 'Ikon bintang'],
  ['ui/icon_heart_full.svg', 64, 64, 'Ikon hati penuh'],
  ['ui/icon_heart_empty.svg', 64, 64, 'Ikon hati kosong'],
  ['ui/icon_backpack.svg', 64, 64, 'Ikon tas siaga'],
  ['ui/icon_check.svg', 64, 64, 'Ikon centang'],
  ['ui/icon_close.svg', 64, 64, 'Ikon tutup'],
  ['ui/icon_pause.svg', 64, 64, 'Ikon pause'],
  ['ui/icon_arrow_left.svg', 64, 64, 'Panah kiri'],
  ['ui/icon_arrow_right.svg', 64, 64, 'Panah kanan'],
  ['ui/icon_player_name_arrow.svg', 256, 128, 'Panah nama pemain'],
  ['ui/icon_finish_flag.svg', 128, 160, 'Bendera finish'],
  ['ui/button_primary.svg', 480, 128, 'Tombol utama'],
  ['ui/button_secondary.svg', 480, 128, 'Tombol sekunder'],
  ['ui/button_next.svg', 360, 112, 'Tombol lanjut'],
  ['ui/button_replay.svg', 360, 112, 'Tombol ulangi'],
  ['ui/panel_hud.svg', 960, 160, 'Panel HUD'],
  ['ui/panel_info_board.svg', 1024, 512, 'Papan informasi'],
  ['ui/panel_quiz_question.svg', 1280, 360, 'Panel pertanyaan kuis'],
  ['ui/quiz_answer_idle.svg', 640, 192, 'Bingkai jawaban normal'],
  ['ui/quiz_answer_selected.svg', 640, 192, 'Bingkai jawaban dipilih'],
  ['ui/quiz_answer_correct.svg', 640, 192, 'Bingkai jawaban benar'],
  ['ui/quiz_answer_wrong.svg', 640, 192, 'Bingkai jawaban salah'],
  ['ui/zone_badge_z01.svg', 128, 128, 'Lencana Zona 01'],
  ['ui/zone_badge_z02.svg', 128, 128, 'Lencana Zona 02'],
  ['ui/zone_badge_z03.svg', 128, 128, 'Lencana Zona 03'],
  ['ui/zone_badge_z04.svg', 128, 128, 'Lencana Zona 04'],
];

const GROUPS = [
  ['characters', CHARACTER_FILES],
  ['backgrounds', BACKGROUND_FILES],
  ['tiles', TILE_FILES],
  ['objects', OBJECT_FILES],
  ['effects', EFFECT_FILES],
  ['ui', UI_FILES],
];

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const svg = (width, height, body, title = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">${title ? `<title>${esc(title)}</title>` : ''}${body}</svg>`;
const stripAttr = (extra, attr) => extra.replace(new RegExp(`\\s${attr}="[^"]*"`, 'g'), '');
const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${stripAttr(extra, 'fill')}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${stripAttr(extra, 'fill')}/>`;
const pathEl = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${stripAttr(extra, 'fill')}/>`;
const line = (x1, y1, x2, y2, stroke, width = 8, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${stripAttr(stripAttr(extra, 'stroke'), 'stroke-width')}/>`;
const group = (body, transform = '') => `<g ${transform ? `transform="${transform}"` : ''}>${body}</g>`;
const outline = '#24324a';

function characterAsset(file, width, height) {
  const name = path.basename(file, '.svg');
  if (name.startsWith('avatar_')) {
    const colors = { avatar_blaze: '#ef4444', avatar_aqua: '#06b6d4', avatar_terra: '#22c55e', avatar_tech: '#8b5cf6', avatar_doc: '#ec4899', avatar_scout: '#f59e0b' };
    const color = colors[name] || '#6366f1';
    return svg(width, height, `${circle(64, 64, 56, '#fff')} ${circle(64, 55, 26, '#f3c49f', `stroke="${outline}" stroke-width="5"`)} ${rect(30, 78, 68, 32, color, 16, `stroke="${outline}" stroke-width="5"`)} ${pathEl('M35 48 Q64 15 93 48 Q64 34 35 48Z', color, `stroke="${outline}" stroke-width="5" stroke-linejoin="round"`)} ${circle(54, 57, 4, outline)}${circle(74, 57, 4, outline)}`, name);
  }
  if (name.startsWith('kapten_')) {
    const happy = name.includes('happy');
    const warn = name.includes('warn');
    const error = name.includes('error');
    const point = name.includes('point');
    const mouth = happy ? 'M138 164 Q160 184 182 164' : error ? 'M140 180 Q160 160 180 180' : 'M142 170 Q160 178 178 170';
    return svg(width, height, `${circle(160, 104, 64, '#f3c49f', `stroke="${outline}" stroke-width="8"`)} ${pathEl('M92 102 Q160 18 228 102 Q160 66 92 102Z', '#1769aa', `stroke="${outline}" stroke-width="8" stroke-linejoin="round"`)} ${rect(72, 176, 176, 152, warn ? '#f59e0b' : '#22a06b', 48, `stroke="${outline}" stroke-width="8"`)} ${rect(105, 236, 110, 54, '#facc15', 18, `stroke="${outline}" stroke-width="6"`)} ${circle(136, 112, 8, outline)}${circle(184, 112, 8, outline)}<path d="${mouth}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round"/>${point ? line(238, 230, 302, 182, '#facc15', 12) : ''}${error ? `<path d="M105 88 L132 105 M215 88 L188 105" stroke="${outline}" stroke-width="8"/>` : ''}`, name);
  }
  const pose = name.includes('crouch') ? 'crouch' : name.includes('jump') ? 'jump' : name.includes('hit') ? 'hit' : name.includes('win') ? 'win' : name.includes('walk') ? 'walk' : 'idle';
  const frame = Number(name.slice(-2)) || 1;
  const legShift = pose === 'walk' ? (frame % 2 ? 22 : -22) : 0;
  const bodyY = pose === 'crouch' ? 154 : pose === 'jump' ? 124 : 144;
  const bodyH = pose === 'crouch' ? 76 : 112;
  const skin = '#f3c49f';
  const suit = '#2563eb';
  return svg(width, height, `${circle(128, 68, 38, skin, `stroke="${outline}" stroke-width="7"`)} ${pathEl('M87 60 Q128 10 169 60 Q128 43 87 60Z', '#24324a', `stroke="${outline}" stroke-width="7"`)} ${circle(116, 69, 5, outline)}${circle(140, 69, 5, outline)} ${rect(86, bodyY, 84, bodyH, suit, 24, `stroke="${outline}" stroke-width="7"`)} ${rect(108, bodyY + 26, 40, 28, '#facc15', 8, `stroke="${outline}" stroke-width="5"`)} ${line(90, bodyY + 25, pose === 'hit' ? 48 : 68, bodyY + 62, suit, 18, `stroke="${outline}" stroke-width="7"`)} ${line(166, bodyY + 25, pose === 'hit' ? 208 : 188, bodyY + 62, suit, 18, `stroke="${outline}" stroke-width="7"`)} ${line(106, bodyY + bodyH - 4, 102 + legShift, 292, '#1e3a8a', 22, `stroke="${outline}" stroke-width="7"`)} ${line(150, bodyY + bodyH - 4, 154 - legShift, 292, '#1e3a8a', 22, `stroke="${outline}" stroke-width="7"`)} ${pose === 'hit' ? circle(216, 48, 18, '#facc15', `stroke="${outline}" stroke-width="5"`) : ''}${pose === 'win' ? `${line(100, 145, 62, 102, '#22c55e', 16, `stroke="${outline}" stroke-width="7"`)}${line(156, 145, 194, 102, '#22c55e', 16, `stroke="${outline}" stroke-width="7"`)}` : ''}`, name);
}

function backgroundAsset(file, width, height) {
  const stem = path.basename(file, '.svg');
  let sky = '#9be7ff';
  let ground = '#65b86a';
  let accent = '#2f855a';
  if (stem.includes('z01')) { sky = '#fff1c7'; ground = '#d9a066'; accent = '#f59e0b'; }
  if (stem.includes('z02')) { sky = '#bfefff'; ground = '#4cae72'; accent = '#1384b4'; }
  if (stem.includes('z03')) { sky = '#cde7ff'; ground = '#7b5a3a'; accent = '#b7793f'; }
  if (stem.includes('z04')) { sky = '#ffd2a8'; ground = '#65534a'; accent = '#e85d2a'; }
  if (stem.includes('quiz')) { sky = '#6c72d9'; ground = '#292d66'; accent = '#facc15'; }
  if (stem.includes('victory')) { sky = '#7c6ee6'; ground = '#48bb78'; accent = '#facc15'; }
  const far = pathEl('M0 620 Q260 430 520 600 T1040 560 T1500 590 T1920 500 V1080 H0Z', accent, 'opacity=".72"');
  const mid = pathEl('M0 740 Q220 570 480 710 T980 680 T1450 730 T1920 650 V1080 H0Z', ground);
  const clouds = `${circle(260, 180, 70, '#fff', 'opacity=".7"')}${circle(330, 170, 92, '#fff', 'opacity=".7"')}${circle(420, 190, 62, '#fff', 'opacity=".7"')}`;
  let details = '';
  if (stem.includes('classroom')) details = `${rect(160, 180, 420, 280, '#fffaf0', 18, `stroke="${outline}" stroke-width="10"`)}${rect(680, 210, 360, 250, '#f8fafc', 18, `stroke="${outline}" stroke-width="10"`)}${line(210, 520, 1680, 520, '#a16207', 18)}`;
  if (stem.includes('river')) details = `${pathEl('M0 820 Q460 690 920 810 T1920 760 V1080 H0Z', '#38bdf8', 'opacity=".82"')}${circle(1420, 680, 70, '#2f855a')}${circle(1520, 650, 92, '#2f855a')}`;
  if (stem.includes('hill')) details = `${pathEl('M1080 790 L1350 270 L1660 790Z', '#7b5a3a', `stroke="${outline}" stroke-width="10"`)}${line(1150, 760, 1320, 570, '#c08457', 18)}${line(1380, 620, 1510, 760, '#c08457', 18)}`;
  if (stem.includes('volcano')) details = `${pathEl('M1080 800 L1350 260 L1650 800Z', '#684c44', `stroke="${outline}" stroke-width="10"`)}${pathEl('M1285 420 Q1350 350 1415 420 Q1370 455 1325 455Z', '#f97316')}${circle(1360, 240, 70, '#374151', 'opacity=".7"')}`;
  if (stem.includes('menu') || stem.includes('guide')) details = `${circle(1510, 290, 120, '#facc15', `stroke="${outline}" stroke-width="10"`)}${pathEl('M1520 580 L1740 760 L1640 800 L1460 630Z', '#fff', `stroke="${outline}" stroke-width="10"`)}`;
  if (stem.includes('victory')) details += `${circle(940, 360, 120, '#facc15', `stroke="${outline}" stroke-width="12"`)}${circle(940, 360, 68, '#fff7ae')}`;
  if (stem.includes('evacuation') || stem.includes('safe')) details += `${rect(1480, 560, 230, 170, '#f8fafc', 16, `stroke="${outline}" stroke-width="10"`)}${pathEl('M1460 575 L1595 455 L1730 575Z', '#ef4444', `stroke="${outline}" stroke-width="10"`)}`;
  return svg(width, height, `${rect(0, 0, width, height, sky)}${clouds}${far}${mid}${details}`, stem);
}

function tileAsset(file, width, height) {
  const stem = path.basename(file, '.svg');
  const road = stem.includes('road');
  const water = stem.includes('water');
  const finish = stem.includes('finish');
  const base = road ? '#64748b' : water ? '#38bdf8' : '#74b957';
  const edge = road ? '#f8fafc' : water ? '#d9f99d' : '#8b5e34';
  const stripe = finish ? `${rect(0, 0, width, height, '#22c55e')}${Array.from({ length: 6 }, (_, i) => rect(i * width / 6, 0, width / 12, height, '#fff'))}` : '';
  return svg(width, height, `${rect(0, 0, width, height, base)}${stripe}${line(0, 18, width, 18, edge, 12)}${line(0, height - 18, width, height - 18, edge, 12)}${road ? line(width / 2, 0, width / 2, height, '#fef3c7', 8, 'stroke-dasharray="26 24"') : ''}${water ? pathEl(`M0 ${height * .42} Q${width * .25} ${height * .25} ${width * .5} ${height * .42} T${width} ${height * .42}`, '#e0f2fe', 'opacity=".8"') : ''}`, stem);
}

function objectAsset(file, width, height) {
  const stem = path.basename(file, '.svg');
  let body = '';
  if (stem === 'table') body = `${rect(24, 28, 208, 48, '#d89a58', 10, `stroke="${outline}" stroke-width="8"`)}${line(52, 76, 48, 232, '#8b5a2b', 18)}${line(204, 76, 208, 232, '#8b5a2b', 18)}`;
  else if (stem === 'chair') body = `${rect(42, 34, 108, 124, '#f59e0b', 12, `stroke="${outline}" stroke-width="8"`)}${rect(42, 150, 108, 42, '#d97706', 10, `stroke="${outline}" stroke-width="8"`)}${line(58, 190, 50, 246, '#8b5a2b', 12)}${line(134, 190, 142, 246, '#8b5a2b', 12)}`;
  else if (stem === 'cabinet' || stem === 'shelf') body = `${rect(22, 18, width - 44, height - 36, stem === 'cabinet' ? '#64748b' : '#a16207', 14, `stroke="${outline}" stroke-width="8"`)}${Array.from({ length: 3 }, (_, i) => rect(42, 42 + i * (height - 100) / 3, width - 84, (height - 125) / 3, '#f1f5f9', 8, `stroke="${outline}" stroke-width="5"`)).join('')}`;
  else if (stem === 'lamp') body = `${line(width / 2, 0, width / 2, 58, '#475569', 10)}${rect(24, 62, width - 48, 72, '#fde68a', 18, `stroke="${outline}" stroke-width="8"`)}`;
  else if (stem === 'book') body = `${rect(14, 28, width - 28, height - 44, '#ef4444', 8, `stroke="${outline}" stroke-width="6"`)}${line(width / 2, 32, width / 2, height - 20, '#fff', 5)}`;
  else if (stem === 'flower_pot') body = `${pathEl(`M24 96 L${width - 24} 96 L${width - 48} ${height - 20} L48 ${height - 20}Z`, '#c75b39', `stroke="${outline}" stroke-width="8"`)}${line(width / 2, 96, width / 2, 30, '#2f855a', 10)}${circle(width / 2, 26, 22, '#facc15', `stroke="${outline}" stroke-width="6"`)}`;
  else if (stem === 'roof_tile') body = `${pathEl('M20 90 Q96 12 172 90 L154 116 L38 116Z', '#e76f51', `stroke="${outline}" stroke-width="8"`)}`;
  else if (stem === 'window') body = `${rect(20, 20, width - 40, height - 40, '#bae6fd', 12, `stroke="${outline}" stroke-width="10"`)}${line(width / 2, 24, width / 2, height - 24, outline, 8)}${line(24, height / 2, width - 24, height / 2, outline, 8)}`;
  else if (stem === 'exit_door') body = `${rect(28, 16, width - 56, height - 16, '#7c3aed', 14, `stroke="${outline}" stroke-width="10"`)}${circle(width - 72, height / 2, 10, '#facc15')}`;
  else if (stem === 'driftwood' || stem === 'fallen_tree') body = `${line(40, height - 42, width - 40, 42, '#7c4a27', stem === 'driftwood' ? 42 : 48, `stroke="${outline}"`)}${stem === 'fallen_tree' ? `${line(210, 120, 120, 38, '#2f855a', 26)}${line(300, 105, 382, 36, '#2f855a', 26)}` : ''}`;
  else if (stem === 'electric_water') body = `${pathEl(`M0 ${height * .6} Q${width * .25} ${height * .2} ${width * .5} ${height * .6} T${width} ${height * .6} V${height} H0Z`, '#38bdf8', `stroke="${outline}" stroke-width="8"`)}${pathEl('M190 18 L148 102 L190 96 L156 174', '#facc15', `stroke="${outline}" stroke-width="6" stroke-linejoin="round"`)}`;
  else if (stem === 'emergency_backpack') body = `${rect(44, 52, width - 88, height - 68, '#ef4444', 28, `stroke="${outline}" stroke-width="8"`)}${pathEl('M82 54 Q128 8 174 54', 'none', `stroke="${outline}" stroke-width="12" fill="none"`)}${rect(94, 132, 68, 26, '#fff', 6)}${rect(116, 111, 24, 68, '#fff', 6)}`;
  else if (stem === 'safe_house') body = `${rect(42, 124, width - 84, height - 144, '#f8fafc', 12, `stroke="${outline}" stroke-width="8"`)}${pathEl(`M24 132 L${width / 2} 36 L${width - 24} 132Z`, '#ef4444', `stroke="${outline}" stroke-width="8"`)}${rect(width / 2 - 22, 196, 44, 70, '#7c5127', 6)}`;
  else if (stem.startsWith('item_')) body = `${circle(width / 2, height / 2, 52, stem.includes('tv') || stem.includes('game') || stem.includes('trophy') ? '#94a3b8' : '#facc15', `stroke="${outline}" stroke-width="7"`)}${rect(38, 38, width - 76, height - 76, '#fff', 12, 'opacity=".65"')}${line(48, height / 2, width - 48, height / 2, outline, 6)}`;
  else if (stem.includes('rock')) body = `${pathEl(`M22 ${height - 24} L44 62 L${width * .62} 20 L${width - 18} ${height - 28}Z`, stem === 'rock_large' ? '#64748b' : '#94a3b8', `stroke="${outline}" stroke-width="8" stroke-linejoin="round"`)}`;
  else if (stem === 'landslide_pile') body = `${pathEl(`M12 ${height - 24} Q120 90 250 142 T${width - 18} ${height - 24}Z`, '#9a6138', `stroke="${outline}" stroke-width="8"`)}${circle(150, 214, 24, '#70513a')}${circle(330, 230, 30, '#b87942')}`;
  else if (stem === 'slope_crack' || stem === 'volcanic_crack') body = `${pathEl('M18 82 L92 42 L148 88 L212 24 L286 72 L366 18', 'none', `stroke="#f97316" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"`)}`;
  else if (stem === 'hill_warning_sign') body = `${line(width / 2, 100, width / 2, height - 20, '#475569', 14)}${pathEl(`M24 30 L${width - 24} 30 L${width / 2} 174Z`, '#facc15', `stroke="${outline}" stroke-width="8"`)}${line(width / 2, 70, width / 2, 120, outline, 10)}`;
  else if (stem === 'volcano') body = `${pathEl(`M${width * .12} ${height * .9} L${width * .5} ${height * .12} L${width * .88} ${height * .9}Z`, '#684c44', `stroke="${outline}" stroke-width="12"`)}${pathEl(`M${width * .4} ${height * .36} Q${width * .5} ${height * .25} ${width * .6} ${height * .36} Q${width * .54} ${height * .42} ${width * .46} ${height * .42}Z`, '#f97316')}`;
  else if (stem === 'lava_stream') body = `${pathEl(`M20 54 Q140 24 250 64 T${width - 20} 48 L${width - 20} ${height - 28} Q350 ${height - 60} 260 ${height - 30} T20 ${height - 42}Z`, '#f97316', `stroke="${outline}" stroke-width="8"`)}`;
  else if (stem === 'glowing_rock') body = `${pathEl(`M22 ${height - 22} L46 62 L${width / 2} 24 L${width - 18} ${height - 28}Z`, '#f97316', `stroke="${outline}" stroke-width="8"`)}`;
  else if (stem === 'ash_cloud') body = `${circle(120, 190, 80, '#374151', 'opacity=".85"')}${circle(230, 140, 96, '#4b5563', 'opacity=".85"')}${circle(350, 190, 74, '#374151', 'opacity=".85"')}`;
  else if (stem === 'evacuation_car') body = `${rect(42, 120, width - 84, 72, '#ef4444', 18, `stroke="${outline}" stroke-width="8"`)}${pathEl('M120 120 L172 72 L330 72 L382 120Z', '#fff', `stroke="${outline}" stroke-width="8"`)}${circle(112, 202, 26, '#1f2937', `stroke="${outline}" stroke-width="8"`)}${circle(400, 202, 26, '#1f2937', `stroke="${outline}" stroke-width="8"`)}`;
  else if (stem === 'bird_flock') body = `${pathEl('M30 120 Q70 76 110 120 Q70 102 30 120Z', '#1f2937')}${pathEl('M138 80 Q178 36 218 80 Q178 62 138 80Z', '#1f2937')}${pathEl('M246 134 Q286 90 326 134 Q286 116 246 134Z', '#1f2937')}`;
  else if (stem === 'evacuation_flag') body = `${line(40, 28, 40, height - 18, '#475569', 12)}${pathEl('M46 34 L162 70 L46 110Z', '#22c55e', `stroke="${outline}" stroke-width="7"`)}`;
  else body = `${rect(20, 20, width - 40, height - 40, '#cbd5e1', 16, `stroke="${outline}" stroke-width="8"`)}`;
  return svg(width, height, body, stem);
}

function effectAsset(file, width, height) {
  const stem = path.basename(file, '.svg');
  if (stem.startsWith('dust')) return svg(width, height, `${circle(78, 150, 44, '#c4a484', 'opacity=".62"')}${circle(128, 110, 54, '#d6d3d1', 'opacity=".72"')}${circle(190, 150, 38, '#a8a29e', 'opacity=".58"')}`, stem);
  if (stem.startsWith('splash')) return svg(width, height, `${pathEl(`M20 ${height - 18} Q${width / 2} 40 ${width - 20} ${height - 18}`, 'none', `stroke="#bae6fd" stroke-width="16" fill="none"`)}${line(width / 2, height - 22, width / 2 - 18, 28, '#e0f2fe', 10)}${line(width / 2, height - 22, width / 2 + 24, 44, '#e0f2fe', 10)}`, stem);
  if (stem === 'water_ripple') return svg(width, height, `${pathEl('M28 104 Q96 48 176 104 T356 104', 'none', `stroke="#bae6fd" stroke-width="12" fill="none"`)}${pathEl('M62 148 Q128 102 196 148 T322 148', 'none', `stroke="#e0f2fe" stroke-width="9" fill="none"`)}`, stem);
  if (stem === 'dizzy_stars') return svg(width, height, `${pathEl('M128 12 L142 92 L220 78 L154 126 L198 190 L128 148 L58 190 L102 126 L36 78 L114 92Z', '#facc15', `stroke="${outline}" stroke-width="6"`)}`, stem);
  if (stem === 'warning_shadow') return svg(width, height, `${pathEl(`M18 ${height - 30} Q${width / 2} 12 ${width - 18} ${height - 30} Q${width / 2} ${height - 58} 18 ${height - 30}Z`, '#facc15', 'opacity=".62"')}`, stem);
  if (stem === 'pebbles') return svg(width, height, `${circle(58, 158, 22, '#94a3b8', `stroke="${outline}" stroke-width="5"`)}${circle(132, 88, 16, '#64748b', `stroke="${outline}" stroke-width="5"`)}${circle(208, 138, 28, '#a4774d', `stroke="${outline}" stroke-width="5"`)}${circle(174, 202, 12, '#b87942', `stroke="${outline}" stroke-width="4"`)}`, stem);
  if (stem === 'rain_streaks') return svg(width, height, Array.from({ length: 12 }, (_, i) => line(20 + (i % 6) * 90, 20 + Math.floor(i / 6) * 240, 0 + (i % 6) * 90, 170 + Math.floor(i / 6) * 240, '#e0f2fe', 8, 'opacity=".72"')).join(''), stem);
  if (stem === 'ash_particles') return svg(width, height, Array.from({ length: 18 }, (_, i) => circle(36 + (i * 83) % 440, 32 + (i * 137) % 440, 5 + (i % 4) * 2, '#4b5563', 'opacity=".65"')).join(''), stem);
  if (stem === 'lava_glow') return svg(width, height, `${circle(width / 2, height / 2, width * .38, '#fb923c', 'opacity=".26"')}${circle(width / 2, height / 2, width * .22, '#f97316', 'opacity=".55"')}`, stem);
  if (stem === 'hit_flash') return svg(width, height, `${circle(width / 2, height / 2, width * .35, '#fff', 'opacity=".75"')}${pathEl(`M${width * .5} 8 L${width * .62} ${height * .38} L${width * .92} ${height * .5} L${width * .62} ${height * .62} L${width * .5} ${height - 8} L${width * .38} ${height * .62} L${width * .08} ${height * .5} L${width * .38} ${height * .38}Z`, '#facc15', `stroke="${outline}" stroke-width="6"`)}`, stem);
  if (stem === 'sparkle') return svg(width, height, `${pathEl('M128 6 L144 104 L250 128 L144 152 L128 250 L112 152 L6 128 L112 104Z', '#facc15', `stroke="${outline}" stroke-width="6"`)}`, stem);
  return svg(width, height, Array.from({ length: 22 }, (_, i) => rect((i * 71) % width, (i * 97) % height, 20, 12, ['#facc15', '#22c55e', '#ef4444', '#38bdf8'][i % 4], 4, `transform="rotate(${i * 17} ${(i * 71) % width} ${(i * 97) % height})"`)).join(''), stem);
}

function uiAsset(file, width, height) {
  const stem = path.basename(file, '.svg');
  if (stem === 'logo_agent_siaga') return svg(width, height, `${circle(92, 96, 64, '#facc15', `stroke="${outline}" stroke-width="8"`)}${pathEl('M64 100 Q92 36 120 100', '#2563eb', `stroke="${outline}" stroke-width="8"`)}${rect(182, 46, 412, 100, '#2563eb', 24, `stroke="${outline}" stroke-width="8"`)}<text x="388" y="112" text-anchor="middle" font-family="Arial,sans-serif" font-size="58" font-weight="900" fill="#fff">AGENT SIAGA</text>`, stem);
  if (stem.startsWith('icon_')) {
    let icon = circle(width / 2, height / 2, 26, '#facc15', `stroke="${outline}" stroke-width="5"`);
    if (stem.includes('heart')) icon = pathEl('M32 42 C14 20 4 58 32 82 L64 108 L96 82 C124 58 114 20 96 42 L64 70Z', stem.includes('empty') ? 'none' : '#ef4444', `stroke="${outline}" stroke-width="6"`);
    else if (stem.includes('star')) icon = pathEl('M32 4 L40 24 L62 25 L45 38 L50 60 L32 48 L14 60 L19 38 L2 25 L24 24Z', '#facc15', `stroke="${outline}" stroke-width="5"`);
    else if (stem.includes('home')) icon = `${pathEl('M8 34 L32 12 L56 34 V62 H8Z', '#60a5fa', `stroke="${outline}" stroke-width="5"`)}${rect(26, 44, 12, 18, '#fff', 2)}`;
    else if (stem.includes('speaker')) icon = `${pathEl('M10 38 H28 L48 20 V76 L28 58 H10Z', '#60a5fa', `stroke="${outline}" stroke-width="5"`)}${stem.includes('off') ? line(52, 22, 12, 80, '#ef4444', 8) : `${pathEl('M56 32 Q72 48 56 64', 'none', `stroke="${outline}" stroke-width="5" fill="none"`)}`}`;
    else if (stem.includes('target')) icon = `${circle(32, 32, 26, 'none', `stroke="#ef4444" stroke-width="7"`)}${circle(32, 32, 10, '#ef4444')}`;
    else if (stem.includes('check')) icon = pathEl('M10 36 L26 54 L56 16', 'none', `stroke="#22c55e" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
    else if (stem.includes('close')) icon = `${line(14, 14, 50, 50, '#ef4444', 8)}${line(50, 14, 14, 50, '#ef4444', 8)}`;
    else if (stem.includes('pause')) icon = `${rect(16, 12, 12, 40, '#2563eb', 3)}${rect(40, 12, 12, 40, '#2563eb', 3)}`;
    else if (stem.includes('arrow_left')) icon = pathEl('M54 32 H14 M14 32 L32 14 M14 32 L32 50', 'none', `stroke="${outline}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
    else if (stem.includes('arrow_right')) icon = pathEl('M10 32 H50 M50 32 L32 14 M50 32 L32 50', 'none', `stroke="${outline}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"`);
    else if (stem.includes('backpack')) icon = `${rect(14, 18, 36, 38, '#ef4444', 9, `stroke="${outline}" stroke-width="5"`)}${pathEl('M22 18 Q32 4 42 18', 'none', `stroke="${outline}" stroke-width="5" fill="none"`)}`;
    return svg(width, height, icon, stem);
  }
  if (stem === 'icon_player_name_arrow') return svg(width, height, `${pathEl('M18 38 H198 L230 64 L198 90 H18 Z', '#fff', `stroke="${outline}" stroke-width="7"`)}${pathEl('M172 88 L128 120 L142 82Z', '#fff', `stroke="${outline}" stroke-width="7"`)}`, stem);
  if (stem === 'icon_finish_flag') return svg(width, height, `${line(28, 14, 28, 148, '#475569', 8)}${pathEl('M34 22 H112 L34 72Z', '#22c55e', `stroke="${outline}" stroke-width="5"`)}`, stem);
  if (stem.startsWith('button_')) return svg(width, height, `${rect(8, 10, width - 16, height - 20, stem.includes('secondary') ? '#f8fafc' : '#2563eb', 28, `stroke="${outline}" stroke-width="8"`)}${line(62, height - 24, width - 62, height - 24, stem.includes('secondary') ? '#cbd5e1' : '#1e3a8a', 8)}`, stem);
  if (stem.startsWith('panel_')) return svg(width, height, `${rect(10, 10, width - 20, height - 20, stem.includes('quiz') ? '#4338ca' : '#fff', 28, `stroke="${outline}" stroke-width="10"`)}${stem.includes('info') ? `${line(50, 76, width - 50, 76, '#f59e0b', 12)}${line(50, 124, width - 160, 124, '#cbd5e1', 10)}` : ''}`, stem);
  if (stem.startsWith('quiz_answer')) {
    const color = stem.includes('correct') ? '#bbf7d0' : stem.includes('wrong') ? '#fecaca' : stem.includes('selected') ? '#fef08a' : '#fff';
    return svg(width, height, `${rect(8, 8, width - 16, height - 16, color, 26, `stroke="${outline}" stroke-width="9"`)}`, stem);
  }
  if (stem.startsWith('zone_badge')) {
    const color = { zone_badge_z01: '#f59e0b', zone_badge_z02: '#0ea5e9', zone_badge_z03: '#a16207', zone_badge_z04: '#ef4444' }[stem] || '#6366f1';
    return svg(width, height, `${circle(64, 64, 54, color, `stroke="${outline}" stroke-width="8"`)}<text x="64" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="900" fill="#fff">${stem.slice(-2)}</text>`, stem);
  }
  return svg(width, height, rect(0, 0, width, height, '#fff'), stem);
}

function categoryOf(file) {
  return file.split('/')[0];
}

function renderAsset([file, width, height, use]) {
  const category = categoryOf(file);
  if (category === 'characters') return characterAsset(file, width, height);
  if (category === 'backgrounds') return backgroundAsset(file, width, height);
  if (category === 'tiles') return tileAsset(file, width, height);
  if (category === 'objects') return objectAsset(file, width, height);
  if (category === 'effects') return effectAsset(file, width, height);
  return uiAsset(file, width, height);
}

function hitboxFor(category, file) {
  if (category === 'characters') return { x: 0.28, y: 0.18, width: 0.44, height: 0.74 };
  if (category === 'objects') {
    if (/electric_water|lava_stream|slope_crack|volcanic_crack|rock|fallen_tree|landslide_pile|lamp|roof_tile/.test(file)) return { x: 0.1, y: 0.18, width: 0.8, height: 0.7 };
    return { x: 0.12, y: 0.1, width: 0.76, height: 0.82 };
  }
  return null;
}

function pivotFor(category) {
  if (category === 'characters' || category === 'objects') return [0.5, 0.9];
  return [0.5, 0.5];
}

const allFiles = GROUPS.flatMap(([category, entries]) => entries.map(([file, width, height, use]) => ({ file, category, width, height, use })));
const manifest = {
  version: '2d-stage-1',
  style: 'flat-cartoon-2d',
  orientation: 'side-view',
  format: 'svg',
  notes: [
    'Aset edukasi dan materi lama tidak diubah.',
    'Semua teks materi tetap dirender oleh aplikasi agar mudah dibaca dan tidak mengubah isi edukasi.',
    'Pivot dan hitbox dinyatakan relatif terhadap viewBox, dengan titik 0,0 di kiri atas.',
  ],
  assets: allFiles.map((entry) => ({
    ...entry,
    pivot: pivotFor(entry.category),
    hitbox: hitboxFor(entry.category, entry.file),
  })),
};

const preview = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AGENT SIAGA · Preview Aset 2D</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #eef2ff; color: #172033; }
    body { margin: 0; padding: 28px; }
    header { max-width: 1280px; margin: 0 auto 24px; }
    h1 { margin: 0 0 6px; color: #3730a3; }
    p { margin: 0; color: #526079; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
    button { border: 2px solid #c7d2fe; background: #fff; color: #3730a3; border-radius: 999px; padding: 8px 14px; cursor: pointer; font-weight: 800; }
    button.active, button:hover { background: #4f46e5; color: #fff; border-color: #4f46e5; }
    .grid { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #dbe4ff; border-radius: 18px; padding: 12px; box-shadow: 0 8px 24px #3730a312; }
    .art { aspect-ratio: 4 / 3; display: grid; place-items: center; background: linear-gradient(135deg, #f8fafc, #e0e7ff); border-radius: 12px; overflow: hidden; }
    .art img { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; }
    .name { font-size: 12px; font-weight: 900; color: #3730a3; margin-top: 10px; word-break: break-word; }
    .use { font-size: 12px; color: #526079; margin-top: 4px; min-height: 32px; }
    .meta { font-size: 11px; color: #7c879f; margin-top: 8px; }
  </style>
</head>
<body>
  <header>
    <h1>AGENT SIAGA · Aset 2D</h1>
    <p>Preview SVG flat/cartoon untuk tahap aset. Kode game 3D lama tidak disentuh.</p>
    <div class="toolbar" id="filters"></div>
  </header>
  <main class="grid" id="grid"></main>
  <script>
    const assets = ${JSON.stringify(manifest.assets)};
    const filters = ['all', ...new Set(assets.map((asset) => asset.category))];
    const filterBox = document.getElementById('filters');
    const grid = document.getElementById('grid');
    let selected = 'all';
    function render() {
      filterBox.innerHTML = filters.map((filter) => '<button class="' + (filter === selected ? 'active' : '') + '" data-filter="' + filter + '">' + (filter === 'all' ? 'Semua' : filter) + '</button>').join('');
      filterBox.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.filter; render(); }));
      const visible = selected === 'all' ? assets : assets.filter((asset) => asset.category === selected);
      grid.innerHTML = visible.map((asset) => '<article class="card"><div class="art"><img loading="lazy" src="./' + asset.file + '" alt="' + asset.use + '"></div><div class="name">' + asset.file + '</div><div class="use">' + asset.use + '</div><div class="meta">' + asset.width + '×' + asset.height + ' · pivot ' + asset.pivot.join(', ') + '</div></article>').join('');
    }
    render();
  </script>
</body>
</html>`;

for (const entry of allFiles) {
  const target = path.join(ROOT, entry.file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, renderAsset([entry.file, entry.width, entry.height, entry.use]), 'utf8');
}
await writeFile(path.join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(path.join(ROOT, 'preview.html'), preview, 'utf8');
console.log(`Generated ${allFiles.length} SVG assets, manifest.json, and preview.html`);
