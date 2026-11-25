'use strict';
/* VoiceUp Admin: website monitoring dan tindak lanjut. Semua teks dirender lewat textContent (anti-XSS).
   Hak akses SESUNGGUHNYA dijaga server (Apps Script); menu di sini hanya penyesuaian tampilan. */
const S = 'SUPER_ADMIN', O = 'ADMIN_OSIS', P = 'PETUGAS_SENSITIF';
const ROLE_NAME = { [S]: 'Super Admin', [O]: 'Admin OSIS', [P]: 'Petugas Penanganan Laporan Sensitif' };
const STATUS = ['Diterima', 'Ditelaah', 'Diproses', 'Selesai', 'Ditutup'];
const st = { user: null, meta: { kategori: [], jenis: [], tahunAjaran: [] }, notif: 0, q: '', metaP: null, timer: null };
const SS = { get() { try { return JSON.parse(sessionStorage.getItem('aluna_adm')); } catch (e) { return null; } }, set(v) { try { sessionStorage.setItem('aluna_adm', JSON.stringify(v)); } catch (e) {} }, del() { try { sessionStorage.removeItem('aluna_adm'); } catch (e) {} } };

function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const k in a || {}) { const v = a[k]; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); }
  kids.flat(3).forEach(c => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
const $ = s => document.querySelector(s);
const IC = {
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>', inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>', trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-2.6-1.6-4.6-4-5.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 20a2 2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>', back: '<path d="M15 5l-7 7 7 7"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="M5 13l4 4L19 7"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'
};
function ic(n) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = IC[n] || ''; return s; }
const dt = i => i ? new Date(i).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const dd = i => i ? new Date(i).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '';

async function api(action, data) {
  if (!window.CONFIG || CONFIG.API_URL.indexOf('GANTI') === 0) throw new Error('Alamat server belum diatur di config.js');
  const s = SS.get(); let r;
  try { r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, token: s && s.token }, data || {})) }); }
  catch (e) { throw new Error('Tidak ada koneksi internet.'); }
  let j; try { j = await r.json(); } catch (e) { throw new Error('Server tidak merespons dengan benar.'); }
  if (!j.ok) { if (/Sesi berakhir/.test(j.error || '')) { SS.del(); st.user = null; showLogin('Sesi berakhir, silakan login lagi.'); } throw new Error(j.error || 'Terjadi kesalahan'); }
  return j;
}

/* ---------- komponen umum ---------- */
function modal(o) {
  const ov = h('div', { class: 'modal-ov', role: 'dialog', 'aria-modal': 'true' });
  const close = () => ov.remove();
  ov.append(h('div', { class: 'modal ' + (o.tone || '') }, h('button', { class: 'x', 'aria-label': 'Tutup', onclick: close }, ic('x')), h('h3', {}, o.title), h('div', { class: 'stack' }, o.body),
    h('div', { class: 'macts' }, (o.actions || []).map(a => h('button', { class: 'btn ' + (a.kind || 'ghost'), onclick: () => { if (!a.keep) close(); if (a.fn) a.fn(); } }, a.label)))));
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.body.append(ov); return close;
}
const notice = (ok, title, msg, fn) => modal({ tone: ok ? 'ok' : 'bad', title, body: Array.isArray(msg) ? msg : h('p', {}, msg), actions: [{ label: 'Mengerti', kind: 'teal', fn }] });
function formModal(o) {
  const inp = {}, err = h('div', { class: 'err', role: 'alert' });
  const body = o.fields.map(f => {
    let el;
    if (f.type === 'select') el = h('select', { class: 'in' }, f.options.map(op => h('option', { value: op.v !== undefined ? op.v : op }, op.t !== undefined ? op.t : op)));
    else if (f.type === 'textarea') el = h('textarea', { class: 'in', rows: f.rows || 4, placeholder: f.ph || '' });
    else if (f.type === 'check') el = h('input', { type: 'checkbox' });
    else el = h('input', { class: 'in', type: f.type || 'text', placeholder: f.ph || '', autocomplete: 'off' });
    if (f.v !== undefined) { if (f.type === 'check') el.checked = !!f.v; else el.value = f.v; }
    inp[f.k] = el; return h('label', { class: 'f' + (f.type === 'check' ? ' chk' : '') }, f.type === 'check' ? [el, f.label] : [f.label, el]);
  });
  const close = modal({ title: o.title, body: [o.intro ? h('p', { class: 'muted' }, o.intro) : null, body, err], actions: [{ label: 'Batal' }, { label: o.ok || 'Simpan', kind: 'teal', keep: true, fn: async () => {
    const v = {}; err.textContent = '';
    for (const f of o.fields) { v[f.k] = f.type === 'check' ? inp[f.k].checked : inp[f.k].value.trim(); if (f.req && !v[f.k]) { err.textContent = f.label + ' wajib diisi.'; return; } }
    try { const r = await o.submit(v); close(); if (o.done) o.done(r); else notice(true, 'Berhasil', o.okMsg || 'Data berhasil disimpan.'); if (o.after) o.after(r); }
    catch (e) { notice(false, 'Gagal menyimpan', e.message); }
  } }] });
}
function skel() { return h('div', { class: 'stack' }, h('div', { class: 'skel' }), h('div', { class: 'skel' })); }
async function load(box, fn, build) {
  box.replaceChildren(skel());
  try { box.replaceChildren(build(await fn())); } catch (e) { box.replaceChildren(h('div', { class: 'card empty' }, e.message, h('div', {}, h('button', { class: 'btn ghost sm', onclick: () => load(box, fn, build) }, 'Coba lagi')))); }
}
/* ---------- paginasi (maksimal 10 data per halaman) ---------- */
const PER = 10;
function pageNums(total, page) {
  const a = [...new Set([1, total, page - 1, page, page + 1])].filter(n => n >= 1 && n <= total).sort((x, y) => x - y), out = [];
  a.forEach((n, i) => { if (i && n - a[i - 1] > 1) out.push('...'); out.push(n); }); return out;
}
function pagerBar(total, page, go) {
  const pages = Math.ceil(total / PER), from = (page - 1) * PER + 1, to = Math.min(page * PER, total);
  return h('div', { class: 'pager noprint', role: 'navigation', 'aria-label': 'Paginasi' }, h('small', { class: 'muted' }, 'Menampilkan ' + from + '-' + to + ' dari ' + total + ' data'),
    h('div', { class: 'pgs' }, h('button', { class: 'pg wide', disabled: page <= 1, onclick: () => go(page - 1) }, 'Sebelumnya'),
      pageNums(pages, page).map(n => n === '...' ? h('span', { class: 'muted' }, '...') : h('button', { class: 'pg', 'aria-label': 'Halaman ' + n, 'aria-current': n === page ? 'page' : null, onclick: () => go(n) }, n)),
      h('button', { class: 'pg wide', disabled: page >= pages, onclick: () => go(page + 1) }, 'Berikutnya')));
}
function tbl(cols, rows, onRow) {
  if (!rows.length) return h('div', { class: 'card empty' }, 'Belum ada data.');
  const mk = list => h('div', { class: 'tblw' }, h('table', {}, h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c.t)))),
    h('tbody', {}, list.map(r => h('tr', onRow ? { class: 'click', tabindex: 0, onclick: () => onRow(r), onkeydown: e => { if (e.key === 'Enter') onRow(r); } } : {}, cols.map(c => h('td', {}, c.f(r))))))));
  if (rows.length <= PER) return mk(rows);
  const wrap = h('div', { class: 'stack pgw' }), full = mk(rows); full.classList.add('printonly');   // saat dicetak: seluruh data, bukan satu halaman
  let page = 1;
  const draw = user => { const t = mk(rows.slice((page - 1) * PER, page * PER)); t.classList.add('noprint'); wrap.replaceChildren(t, full, pagerBar(rows.length, page, p => { page = p; draw(true); })); if (user) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  draw(false); return wrap;
}
function pagedList(items, render) {
  if (items.length <= PER) return h('div', { class: 'stack' }, items.map(render));
  const wrap = h('div', { class: 'stack pgw' }); let page = 1;
  const draw = user => { wrap.replaceChildren(h('div', { class: 'stack' }, items.slice((page - 1) * PER, page * PER).map(render)), pagerBar(items.length, page, p => { page = p; draw(true); })); if (user) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  draw(false); return wrap;
}
const bars = (t, o) => {
  const ks = Object.keys(o).sort((a, b) => o[b] - o[a]), mx = o[ks[0]] || 1, card = h('div', { class: 'card stack' }); let page = 1;
  const draw = () => {
    const items = ks.slice((page - 1) * PER, page * PER).map(k => { const i = h('i'); i.style.width = Math.max(4, o[k] * 100 / mx) + '%'; return h('div', { class: 'bar' }, h('div', { class: 'lab' }, h('span', {}, k), h('b', {}, o[k])), h('div', { class: 'tr' }, i)); });
    card.replaceChildren(...[h('h3', {}, t), ...(items.length ? items : [h('p', { class: 'muted' }, 'Belum ada data.')]), ks.length > PER ? pagerBar(ks.length, page, p => { page = p; draw(); }) : null].filter(Boolean));   // replaceChildren tidak meratakan array/null
  };
  draw(); return card;
};
const head = (t, ...r) => r.filter(Boolean).length ? h('div', { class: 'actions' }, r) : null;
const printBtn = big => h('button', { class: 'btn teal noprint' + (big ? '' : ' sm'), onclick: () => window.print() }, ic('print'), big ? 'Cetak laporan' : 'Cetak / simpan PDF');

/* ---------- login ---------- */
function showLogin(msg) {
  const u = h('input', { class: 'in', autocomplete: 'username', autocapitalize: 'none' }), p = h('input', { class: 'in', type: 'password', autocomplete: 'current-password' }), er = h('div', { class: 'err', role: 'alert' }, msg || '');
  const go = async () => {
    er.textContent = ''; if (!u.value.trim() || !p.value) return er.textContent = 'Isi username dan password.';
    b.disabled = true; b.textContent = 'Memeriksa...';
    try { const r = await api('login', { username: u.value, password: p.value }); SS.set({ token: r.token }); st.user = r.user; r.wajibGanti ? showForceChange() : start(true); }
    catch (e) { er.textContent = e.message; b.disabled = false; b.textContent = 'Masuk'; }
  };
  const b = h('button', { class: 'btn teal', onclick: go }, 'Masuk');
  [u, p].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
  $('#app').replaceChildren(h('div', { class: 'login' }, h('div', { class: 'box card' }, h('div', { class: 'plate' }, h('img', { src: LOGO_WIDE, alt: 'VoiceUp' })), h('h1', { class: 'sr' }, 'VoiceUp'), h('p', { class: 'muted', style: null }, 'Masuk untuk monitoring dan tindak lanjut aspirasi.'),
    h('label', { class: 'f' }, 'Username', u), h('label', { class: 'f' }, 'Password', p), er, b, h('p', { class: 'muted' }, 'Lupa password? Hubungi Super Admin sekolah.'), h('small', { class: 'muted' }, 'SMP Negeri 1 Kota Bandar Lampung - Copyright@2026 VoiceUp'))));
}
function pwForm(forced) {
  return { title: 'Ganti password', fields: [{ k: 'lama', label: 'Password saat ini', type: 'password', req: 1 }, { k: 'baru', label: 'Password baru (min. 8 karakter, huruf dan angka)', type: 'password', req: 1 }, { k: 'ulang', label: 'Ulangi password baru', type: 'password', req: 1 }],
    submit: async v => { if (v.baru !== v.ulang) throw new Error('Ulangi password tidak sama.'); await api('changePassword', { lama: v.lama, baru: v.baru }); }, okMsg: 'Password berhasil diganti.', after: () => { if (forced) start(true); } };
}
function showForceChange() {
  $('#app').replaceChildren(h('div', { class: 'login' }, h('div', { class: 'box card' }, h('h2', {}, 'Ganti password awal'), h('p', { class: 'muted' }, 'Demi keamanan, password sementara wajib diganti sebelum melanjutkan.'),
    h('button', { class: 'btn teal', onclick: () => formModal(pwForm(true)) }, 'Ganti sekarang'), h('button', { class: 'btn ghost', onclick: logout }, 'Keluar'))));
  formModal(pwForm(true));
}
async function logout() { try { await api('logout'); } catch (e) {} SS.del(); st.user = null; showLogin(); }

/* ---------- shell dan routing ---------- */
const MENU = [
  { id: 'dashboard', t: 'Dashboard Admin', i: 'chart', r: [S, O, P] }, { id: 'inbox', t: 'Inbox Aspirasi', i: 'inbox', r: [S, O] }, { id: 'sensitif', t: 'Laporan Sensitif', i: 'shield', r: [S, P] },
  { id: 'respons', t: 'Manajemen Respons', i: 'chat', r: [S, O] }, { id: 'analisis', t: 'Analisis Isu', i: 'trend', r: [S, O] }, { id: 'kegiatan', t: 'Info Kegiatan', i: 'cal', r: [S, O] },
  { id: 'ta', t: 'Tahun Ajaran', i: 'cal', r: [S] }, { id: 'kategori', t: 'Kategori', i: 'tag', r: [S] }, { id: 'pengguna', t: 'Pengguna', i: 'users', r: [S] }, { id: 'audit', t: 'Audit Log', i: 'list', r: [S] },
  { id: 'notif', t: 'Notifikasi', i: 'bell', r: [S, O, P] }, { id: 'pengaturan', t: 'Pengaturan', i: 'gear', r: [S] }, { id: 'akun', t: 'Akun Saya', i: 'user', r: [S, O, P] }];
const PAGES = { dashboard: pDash, inbox: v => pInbox(v, false), sensitif: v => pInbox(v, true), respons: pRespons, analisis: pAnalisis, kegiatan: pKegiatan, ta: pTa, kategori: pKategori, pengguna: pPengguna, audit: pAudit, notif: pNotif, pengaturan: pPengaturan, akun: pAkun, detail: pDetail };
function theme() { const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('aluna_theme', t); } catch (e) {} drawShell(); route(); }
const GRP1 = ['dashboard', 'inbox', 'sensitif', 'respons', 'analisis', 'kegiatan'], GRP2 = ['ta', 'kategori', 'pengguna', 'audit', 'pengaturan'];
const TITLES = { inbox: 'Kelola saran, kritik, dan pengaduan reguler', sensitif: 'Akses terbatas, setiap pembukaan dicatat', respons: 'Setujui dan pantau respons sekolah', analisis: 'Dasar pengambilan keputusan sekolah', kegiatan: 'Tampil di aplikasi siswa', ta: 'Atur tahun ajaran aktif', kategori: 'Atur kategori dan target penanganan', pengguna: 'Kelola akun petugas dan admin', audit: 'Jejak aktivitas aplikasi', notif: 'Pemberitahuan untukmu', pengaturan: 'Pengaturan, cadangan, dan ekspor', akun: 'Profil dan keamanan akun' };
function drawShell() {
  const parts = (location.hash.replace('#/', '') || 'dashboard').split('/'), cur = parts[0], dark = document.documentElement.getAttribute('data-theme') === 'dark', role = st.user.role;
  const ok = MENU.filter(m => m.r.indexOf(role) >= 0), home = role === P ? 'sensitif' : 'inbox';
  const link = m => h('a', { href: '#/' + m.id, 'aria-current': cur === m.id || (cur === 'detail' && m.id === home) ? 'page' : null, onclick: () => side.classList.remove('open') }, ic(m.i), m.t);
  const g2 = ok.filter(m => GRP2.indexOf(m.id) >= 0), m0 = MENU.filter(m => m.id === cur)[0];
  const title = cur === 'dashboard' ? 'Dashboard' : cur === 'detail' ? 'Detail Laporan' : (m0 ? m0.t : 'ALUNA');
  const sub = cur === 'dashboard' ? new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : cur === 'detail' ? decodeURIComponent(parts[1] || '') : (TITLES[cur] || '');
  const side = h('aside', { class: 'side', id: 'side' }, h('div', { class: 'brand' }, h('img', { src: LOGO, alt: '' }), h('b', {}, 'VoiceUp')),
    h('div', { class: 'navs' }, h('div', { class: 'sec' }, 'Menu'), ok.filter(m => GRP1.indexOf(m.id) >= 0).map(link), g2.length ? [h('div', { class: 'sec' }, 'Pengelolaan'), g2.map(link)] : null,
    h('div', { class: 'sec' }, 'Akun'), link(MENU.filter(m => m.id === 'akun')[0]), h('a', { href: '#', onclick: e => { e.preventDefault(); logout(); } }, ic('out'), 'Keluar')),
    h('div', { class: 'darkcard' }, h('img', { src: LOGO, alt: '' }), h('b', {}, 'Ruang Aman Untuk Setiap Suara'), h('p', {}, 'Tangani setiap laporan tepat waktu dan jaga kerahasiaannya.'), h('a', { class: 'btn teal sm', href: '#/' + home }, role === P ? 'Buka laporan saya' : 'Buka inbox')));
  const search = h('input', { placeholder: 'Cari laporan...', 'aria-label': 'Cari laporan', onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { st.q = e.target.value.trim(); location.hash = '#/' + home; if (cur === home) route(); } } });
  const hdr = h('header', { class: 'hdr noprint' }, h('button', { class: 'cbtn menu-btn', 'aria-label': 'Buka menu', onclick: () => side.classList.toggle('open') }, ic('menu')),
    h('div', { class: 'grow' }, h('h1', {}, title), h('p', { class: 'muted' }, sub)), h('label', { class: 'search' }, ic('search'), search),
    h('button', { class: 'cbtn', 'aria-label': dark ? 'Mode terang' : 'Mode gelap', onclick: theme }, ic(dark ? 'sun' : 'moon')),
    h('a', { class: 'cbtn', id: 'bell', href: '#/notif', 'aria-label': 'Notifikasi' + (st.notif ? ', ' + st.notif + ' baru' : '') }, ic('bell'), st.notif ? h('i', { class: 'dot-n' }) : null),
    h('div', { class: 'user' }, h('div', { class: 'avatar', 'aria-hidden': 'true' }, st.user.nama.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()), h('div', {}, h('b', {}, st.user.nama), h('small', {}, ROLE_NAME[role].split(' ').slice(0, 2).join(' ')))));
  $('#app').replaceChildren(h('div', { class: 'shell' }, side, h('div', { class: 'main' }, hdr, h('main', { class: 'content', id: 'view', tabindex: -1 }))));
}
function route() {
  if (!st.user) return;
  const parts = (location.hash.replace('#/', '') || 'dashboard').split('/'), id = parts[0];
  const m = MENU.filter(x => x.id === id)[0];
  if (id !== 'detail' && (!m || m.r.indexOf(st.user.role) < 0)) { location.hash = '#/dashboard'; return; }
  if (!$('#view')) drawShell(); else drawShell();
  const v = $('#view'); (PAGES[id] || pDash)(v, decodeURIComponent(parts[1] || '')); window.scrollTo(0, 0);
}
function updateBell() {   // perbarui titik notifikasi saja; JANGAN menggambar ulang kerangka agar halaman yang sedang dibuka tidak terhapus
  const b = $('#bell'); if (!b) return;
  const d = b.querySelector('.dot-n');
  if (st.notif && !d) b.append(h('i', { class: 'dot-n' })); else if (!st.notif && d) d.remove();
  b.setAttribute('aria-label', 'Notifikasi' + (st.notif ? ', ' + st.notif + ' baru' : ''));
}
async function pollNotif() { try { const r = await api('notifications'); if (r.belumDibaca !== st.notif) { st.notif = r.belumDibaca; updateBell(); } } catch (e) {} }
async function start(fromLogin) {
  if (!fromLogin) { try { const me = await api('me'); st.user = me.user; } catch (e) { return showLogin(); } }
  st.metaP = api('meta').then(m => { st.meta = m; }).catch(() => {});   // berjalan paralel, tidak menahan tampilan
  pollNotif(); if (!st.timer) st.timer = setInterval(pollNotif, 60000);
  if (!location.hash) location.hash = '#/dashboard'; route();
}
window.addEventListener('hashchange', route);

/* ---------- dashboard ---------- */
const NS = 'http://www.w3.org/2000/svg';
function groupChart(months, series) {
  const mx = Math.max(1, ...months.flatMap(m => series.map(s => s.vals[m] || 0))), top = Math.ceil(mx / 4) * 4;
  const lbl = m => { const p = m.split('-'); return new Date(p[0], p[1] - 1, 1).toLocaleDateString('id-ID', { month: 'short' }); };
  return h('div', { class: 'plot', role: 'img', 'aria-label': 'Grafik laporan per bulan' }, h('div', { class: 'yax' }, [4, 3, 2, 1, 0].map(i => h('span', {}, top / 4 * i))),
    h('div', { class: 'cols2' }, months.map(m => h('div', { class: 'grp', tabindex: 0 }, h('div', { class: 'bars2' }, series.map((s, i) => { const b = h('i', { class: i ? 'b' : (series.length === 1 ? 'b' : '') }); b.style.height = ((s.vals[m] || 0) * 100 / top) + '%'; return b; })),
      h('span', { class: 'gl' }, lbl(m)), h('div', { class: 'tt' }, series.map((s, i) => h('div', {}, h('i', { class: 'sw ' + (i || series.length === 1 ? 'b' : 'a') }), h('b', {}, s.vals[m] || 0), ' ' + s.name)))))));
}
function ringChart(items, total) {
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('class', 'ringsvg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Sebaran status laporan');
  items.forEach((it, i) => {
    const r = 90 - i * 19, C = 2 * Math.PI * r, mk = (cls, frac) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', 100); c.setAttribute('cy', 100); c.setAttribute('r', r); c.setAttribute('class', cls); c.setAttribute('stroke-dasharray', (C * 0.75 * frac) + ' ' + C); c.setAttribute('transform', 'rotate(135 100 100)'); return c; };
    svg.append(mk('rt', 1)); if (total && it.n) svg.append(mk('ra' + i, Math.max(.03, it.n / total)));
  });
  return svg;
}
function pDash(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('', printBtn(true)), h('div', { class: 'printonly' }, h('b', {}, 'Laporan ringkasan VoiceUp - SMP Negeri 1 Kota Bandar Lampung'), h('div', {}, 'Dicetak ' + dt(new Date().toISOString()))), box));
  const role = st.user.role, adm = role !== P;
  load(box, async () => {
    const d = await api('dashboard');   // satu panggilan: angka, grafik, daftar perhatian, lokasi
    if (d.perhatian) return { d: d, s: { mingguan: d.mingguan || {}, bulanan: {} }, i: { daftar: d.perhatian }, a: { perLokasi: d.lokasi || {} } };
    const r = await Promise.all([api('stats', { ta: 'all' }).catch(() => null), api('inbox', {}).catch(() => ({ daftar: [] })), adm ? api('analysis').catch(() => null) : null]);   // cadangan bila backend belum diperbarui
    return { d: d, s: r[0], i: r[1], a: r[2] };
  }, x => {
    const d = x.d, FIN = ['Selesai', 'Ditutup'];
    const kpi = (icon, label, val, pill, cls, sub, primary) => h('div', { class: 'kpi' + (primary ? ' primary' : '') }, h('div', { class: 'row between' }, h('span', { class: 'kic' }, ic(icon)), pill ? h('span', { class: 'pill ' + cls }, pill) : null), h('div', { class: 'kl' }, label), h('div', { class: 'kv' }, val), h('div', { class: 'ks' }, sub));
    const wk = x.s ? x.s.mingguan : {}, wks = Object.keys(wk).sort(); let wow = null;
    if (adm && wks.length >= 2 && wk[wks[wks.length - 2]]) wow = Math.round((wk[wks[wks.length - 1]] - wk[wks[wks.length - 2]]) * 100 / wk[wks[wks.length - 2]]);
    const kpis = h('div', { class: 'kgrid' },
      kpi('inbox', 'Total laporan', d.total, wow === null ? null : (wow > 0 ? '+' : '') + wow + '%', wow !== null && wow > 0 ? 'warn' : 'good', wow === null ? 'Seluruh laporan dalam kewenanganmu' : 'dibanding minggu lalu', true),
      kpi('bell', 'Belum ditangani', d.belumDitangani, d.belumDitangani ? 'Perlu aksi' : 'Aman', d.belumDitangani ? 'warn' : 'good', 'berstatus Diterima'),
      kpi('clock', 'Melewati SLA', d.terlambat, d.terlambat ? 'Terlambat' : 'Tepat waktu', d.terlambat ? 'bad' : 'good', 'target penanganan terlampaui'),
      kpi('chat', 'Sudah direspon', d.persenRespons + '%', d.ratingRata2 !== null ? d.ratingRata2 + '/5 puas' : null, 'good', 'laporan dengan respons publik'));
    // grafik batang
    const bl = d.bulanan || {}, ms = Object.keys(bl).sort().slice(-7); let months, series;
    if (ms.length) { months = ms; series = [{ name: 'Masuk', vals: Object.fromEntries(ms.map(m => [m, bl[m].masuk])) }, { name: 'Selesai', vals: Object.fromEntries(ms.map(m => [m, bl[m].selesai])) }]; }
    else if (x.s && Object.keys(x.s.bulanan).length) { months = Object.keys(x.s.bulanan).sort().slice(-7); series = [{ name: 'Masuk', vals: x.s.bulanan }]; }
    const chart = months ? h('div', { class: 'card' }, h('div', { class: 'row between wrap' }, h('div', {}, h('h3', {}, 'Tren Aspirasi'), h('small', { class: 'muted' }, 'Laporan masuk dan selesai per bulan')),
      h('div', { class: 'legend' }, series.length > 1 ? [h('span', {}, h('i', { class: 'sw a' }), 'Masuk'), h('span', {}, h('i', { class: 'sw b' }), 'Selesai')] : h('span', {}, h('i', { class: 'sw b' }), 'Masuk'))), groupChart(months, series)) : null;
    // perlu perhatian + peringatan
    const rows = x.i.daftar.filter(r => FIN.indexOf(r.status) < 0).sort((a, b) => (b.terlambat - a.terlambat) || ((b.urgensi === 'Mendesak') - (a.urgensi === 'Mendesak')) || b.waktu.localeCompare(a.waktu)).slice(0, 5);
    const warn = d.peringatan.length ? h('div', { class: 'card stack' }, h('h3', {}, 'Peringatan dini'), d.peringatan.map(w => h('div', { class: 'warn ' + w.tingkat }, w.pesan))) : null;
    const att = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', {}, h('h3', {}, 'Perlu perhatian'), h('small', { class: 'muted' }, 'Terlambat dan mendesak lebih dulu')), h('a', { href: '#/' + (role === P ? 'sensitif' : 'inbox'), class: 'btn ghost sm' }, 'Lihat semua')),
      rows.length ? rows.map(r => h('a', { class: 'li', href: '#/detail/' + encodeURIComponent(r.ref) }, h('span', { class: 'av' + (r.sensitif ? ' s' : '') }, r.jenis[0]), h('div', { class: 'grow' }, h('b', {}, r.judul), h('small', { class: 'muted' }, r.kategori + ' - ' + dd(r.waktu))),
        h('span', { class: 'badge ' + r.status }, r.status), r.terlambat ? h('span', { class: 'pill bad' }, 'Terlambat') : h('span', { class: 'muted sla' }, 'SLA ' + dd(r.slaDue)))) : h('div', { class: 'empty' }, 'Tidak ada laporan yang menunggu. Kerja bagus!'));
    // cincin status
    const s = d.status, fin = (s.Selesai || 0) + (s.Ditutup || 0), items = [{ l: 'Diterima', n: s.Diterima || 0 }, { l: 'Ditelaah', n: s.Ditelaah || 0 }, { l: 'Diproses', n: s.Diproses || 0 }, { l: 'Selesai', n: fin }];
    const pc = n => d.total ? Math.round(n * 100 / d.total) + '%' : '0%';
    const ring = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', {}, h('h3', {}, 'Statistik Status'), h('small', { class: 'muted' }, 'Sebaran tindak lanjut laporan')), h('span', { class: 'pill soft' }, 'Semua')),
      h('div', { class: 'ringw' }, ringChart(items, d.total), h('div', { class: 'ringc' }, h('b', {}, d.total), h('small', {}, 'Total laporan'), h('span', { class: 'pill good' }, d.persenRespons + '% direspon'))),
      items.map((it, i) => h('div', { class: 'lrow' }, h('i', { class: 'dotc d' + i }), it.l, h('span', { class: 'n' }, it.n), h('span', { class: 'pill ' + (i === 3 ? 'good' : i === 0 && it.n ? 'warn' : 'soft') }, pc(it.n)))));
    // gelembung lokasi
    let loc = null;
    if (adm) {
      const lk = x.a ? x.a.perLokasi : {}, ks = Object.keys(lk).sort((a, b) => lk[b] - lk[a]).slice(0, 4), mx = lk[ks[0]] || 1;
      const sizes = [[0, 0, 108], [78, 30, 76], [30, 88, 58]];
      loc = h('div', { class: 'card' }, h('div', {}, h('h3', {}, 'Sebaran Lokasi'), h('small', { class: 'muted' }, 'Area sekolah yang paling sering dilaporkan')),
        ks.length ? h('div', { class: 'bubw' }, h('div', { class: 'bub' }, ks.slice(0, 3).map((k, i) => { const e = h('div', { class: 'b' + i }, lk[k]), z = Math.max(52, sizes[i][2] * (lk[k] / mx * .5 + .5)); e.style.left = sizes[i][0] + 'px'; e.style.top = sizes[i][1] + 'px'; e.style.width = z + 'px'; e.style.height = z + 'px'; return e; })),
          h('div', { class: 'lst' }, ks.map(k => { const b = h('i'); b.style.width = (lk[k] * 100 / mx) + '%'; return h('div', {}, h('div', { class: 'nm' }, h('span', {}, k), h('b', {}, lk[k])), h('div', { class: 'tr' }, b)); }))) : h('div', { class: 'empty' }, 'Belum ada data lokasi.'));
    }
    return h('div', { class: 'dash' }, h('div', { class: 'stack' }, kpis, chart, warn, att), h('div', { class: 'stack' }, ring, loc));
  });
}

/* ---------- inbox dan detail ---------- */
async function pInbox(v, sens) {
  if (st.metaP) await st.metaP;
  const box = h('div'), q0 = st.q || '', f = { status: '', kategoriId: '', jenis: '', q: q0, terlambat: false };
  const sel = (k, ph, opts) => h('select', { class: 'in', 'aria-label': ph, onchange: e => { f[k] = e.target.value; go(); } }, h('option', { value: '' }, ph), opts.map(o => h('option', { value: o.v !== undefined ? o.v : o }, o.t !== undefined ? o.t : o)));
  const q = h('input', { class: 'in', placeholder: 'Cari judul / nomor referensi', value: q0, 'aria-label': 'Cari', oninput: e => { f.q = e.target.value; clearTimeout(q._t); q._t = setTimeout(go, 350); } });
  const late = h('label', { class: 'row' }, h('input', { type: 'checkbox', onchange: e => { f.terlambat = e.target.checked; go(); } }), 'Hanya yang terlambat');
  v.append(h('div', { class: 'stack' }, head(sens ? 'Laporan Sensitif' : 'Inbox Aspirasi'), sens ? h('div', { class: 'warn kritis' }, 'Isi laporan ini rahasia. Setiap pembukaan dicatat di audit log.') : null,
    h('div', { class: 'filters' }, q, sel('status', 'Semua status', STATUS), sel('kategoriId', 'Semua kategori', st.meta.kategori.map(k => ({ v: k.id, t: k.nama }))), sel('jenis', 'Semua jenis', st.meta.jenis), late), box));
  function go() {
    load(box, () => api('inbox', f), r => {
      const l = r.daftar.filter(x => x.sensitif === sens);
      return h('div', { class: 'stack' }, h('small', { class: 'muted' }, l.length + ' laporan'), tbl([
        { t: 'Referensi', f: x => x.ref }, { t: 'Tanggal', f: x => dd(x.waktu) }, { t: 'Jenis / Kategori', f: x => [x.jenis, h('div', { class: 'muted' }, x.kategori)] },
        { t: 'Judul', f: x => x.judul }, { t: 'Status', f: x => [h('span', { class: 'badge ' + x.status }, x.status), x.terlambat && ['Selesai', 'Ditutup'].indexOf(x.status) < 0 ? h('span', { class: 'tag late' }, 'Terlambat') : null, x.urgensi === 'Mendesak' ? h('span', { class: 'tag urg' }, 'Mendesak') : null] },
        { t: 'Target SLA', f: x => dd(x.slaDue) }], l, x => { location.hash = '#/detail/' + encodeURIComponent(x.ref); }));
    });
  }
  st.q = '';
  go();
}

function pDetail(v, ref) {
  const box = h('div'); v.append(box);
  const reload = () => load(box, () => api('detail', { ref }), d => renderDetail(d, reload));
  reload();
}
function renderDetail(d, reload) {
  const L = d.laporan, me = st.user, role = me.role, back = L.sensitif ? 'sensitif' : 'inbox';
  const act = (title, fn, kind) => h('button', { class: 'btn ' + (kind || 'ghost') + ' sm noprint', onclick: fn }, title);
  const aksi = h('div', { class: 'row wrap noprint' },
    act('Ubah status', () => formModal({ title: 'Ubah status', intro: 'Keterangan ini tampil ke pelapor. Jangan menulis data pribadi atau detail investigasi.', fields: [{ k: 'status', label: 'Status baru', type: 'select', options: STATUS, v: L.status }, { k: 'catatanPublik', label: 'Keterangan publik yang aman', type: 'textarea', req: 1 }], submit: v => api('setStatus', { ref: L.ref, status: v.status, catatanPublik: v.catatanPublik }), okMsg: 'Status berhasil diperbarui.', after: reload }), 'teal'),
    act('Tulis respons', () => formModal({ title: 'Tulis respons', intro: L.sensitif || role === P ? 'Respons laporan sensitif disimpan sebagai draf dan baru tampil di publik setelah disetujui Super Admin.' : null,
      fields: [{ k: 'isi', label: 'Isi respons (aman untuk publik)', type: 'textarea', req: 1, rows: 5 }].concat(!L.sensitif && role !== P ? [{ k: 'publik', label: 'Tampilkan di Respons Sekolah (publik)', type: 'check', v: true }] : []),
      submit: v => api('addResponse', { ref: L.ref, isi: v.isi, publik: v.publik }), okMsg: 'Respons berhasil disimpan.', after: reload })),
    act('Catatan internal', () => formModal({ title: 'Catatan internal', intro: 'Hanya terlihat oleh petugas yang berwenang. Tidak tampil ke publik.', fields: [{ k: 'isi', label: 'Catatan', type: 'textarea', req: 1, rows: 5 }], submit: v => api('addNote', { ref: L.ref, isi: v.isi }), okMsg: 'Catatan tersimpan.', after: reload })),
    role === S && L.sensitif ? act('Tugaskan petugas', () => formModal({ title: 'Tugaskan petugas', fields: [{ k: 'userId', label: 'Petugas', type: 'select', options: (d.petugas || []).map(p => ({ v: p.id, t: p.nama })), req: 1 }], submit: v => api('assign', { ref: L.ref, userId: v.userId }), okMsg: 'Petugas berhasil ditugaskan.', after: reload })) : null,
    role === P ? act('Eskalasi', () => formModal({ title: 'Eskalasi ke pihak sekolah', intro: 'Super Admin akan menerima notifikasi.', fields: [{ k: 'catatan', label: 'Alasan eskalasi', type: 'textarea', req: 1 }], submit: v => api('escalate', { ref: L.ref, catatan: v.catatan }), okMsg: 'Eskalasi terkirim.', after: reload }), 'gold') : null,
    printBtn());
  return h('div', { class: 'stack' },
    h('div', { class: 'row between wrap noprint' }, h('a', { class: 'btn ghost sm', href: '#/' + back }, ic('back'), 'Kembali')),
    h('div', { class: 'printonly' }, h('b', {}, 'VoiceUp - Laporan ' + L.ref), h('div', {}, 'Dicetak ' + dt(new Date().toISOString()) + ' oleh ' + me.nama + (L.sensitif ? ' - RAHASIA' : ''))),
    h('div', { class: 'card stack' }, h('div', { class: 'row wrap' }, h('h2', {}, L.judul)),
      h('div', { class: 'row wrap' }, h('span', { class: 'badge ' + L.status }, L.status), h('span', { class: 'tag' }, L.jenis + ' - ' + L.kategori), L.sensitif ? h('span', { class: 'tag sens' }, 'Sensitif') : null, L.urgensi === 'Mendesak' ? h('span', { class: 'tag urg' }, 'Mendesak') : null, L.terlambat ? h('span', { class: 'tag late' }, 'Melewati SLA') : null),
      h('div', { class: 'muted' }, L.ref + ' - Diterima ' + dt(L.waktu) + ' - Target SLA ' + dd(L.slaDue) + (L.lokasi ? ' - Lokasi: ' + L.lokasi : '')),
      h('p', { style: null }, L.uraian), aksi),
    h('div', { class: 'card stack' }, h('h3', {}, 'Riwayat status'), h('ul', { class: 'tl' }, d.riwayat.slice().reverse().map(r => h('li', {}, h('b', {}, r.status), ' ', h('small', { class: 'muted' }, dt(r.waktu) + ' - ' + r.oleh), h('div', {}, r.catatanPublik))))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Respons'), d.respons.length ? d.respons.map(r => h('div', { class: 'note ' + (r.publik === 'TRUE' ? '' : 'draft'), style: null }, h('div', { class: 'row between wrap' }, h('small', { class: 'muted' }, dt(r.waktu) + ' - ' + r.penulis + (r.publik === 'TRUE' ? ' - PUBLIK' : ' - DRAF')),
      role === S ? h('button', { class: 'btn ghost sm noprint', onclick: () => api('publishResponse', { id: r.id, publik: r.publik !== 'TRUE' }).then(() => { notice(true, 'Berhasil', r.publik === 'TRUE' ? 'Respons ditarik dari publik.' : 'Respons disetujui dan tampil di publik.'); reload(); }).catch(e => notice(false, 'Gagal', e.message)) }, r.publik === 'TRUE' ? 'Tarik dari publik' : 'Setujui & tampilkan') : null), h('div', {}, r.isi))) : h('p', { class: 'muted' }, 'Belum ada respons.')),
    h('div', { class: 'card stack' }, h('h3', {}, 'Catatan internal'), d.catatan.length ? d.catatan.map(r => h('div', { class: 'note' }, h('small', { class: 'muted' }, dt(r.waktu) + ' - ' + r.penulis), h('div', {}, r.isi))) : h('p', { class: 'muted' }, 'Belum ada catatan.')));
}

/* ---------- respons, analisis ---------- */
function pRespons(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Manajemen Respons'), box));
  const go = () => load(box, () => api('responList'), r => tbl([{ t: 'Waktu', f: x => dt(x.waktu) }, { t: 'Laporan', f: x => [x.judul, h('div', { class: 'muted' }, x.ref)] }, { t: 'Respons', f: x => x.isi }, { t: 'Penulis', f: x => x.penulis },
    { t: 'Status', f: x => [h('span', { class: 'tag' + (x.publik ? '' : ' urg') }, x.publik ? 'Publik' : 'Draf'), x.sensitif ? h('span', { class: 'tag sens' }, 'Sensitif') : null] },
    { t: '', f: x => st.user.role === S ? h('button', { class: 'btn ghost sm', onclick: e => { e.stopPropagation(); api('publishResponse', { id: x.id, publik: !x.publik }).then(() => { notice(true, 'Berhasil', x.publik ? 'Respons ditarik dari publik.' : 'Respons disetujui dan tampil di publik.'); go(); }).catch(er => notice(false, 'Gagal', er.message)); } }, x.publik ? 'Tarik' : 'Setujui') : null }],
    r.daftar, x => { location.hash = '#/detail/' + encodeURIComponent(x.ref); }));
  go();
}
function pAnalisis(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Analisis Isu Sekolah', printBtn(true)), box));
  load(box, () => api('analysis'), a => h('div', { class: 'stack' },
    a.kategoriNaik.length ? h('div', { class: 'card stack' }, h('h3', {}, 'Kategori yang meningkat'), a.kategoriNaik.map(w => h('div', { class: 'warn' }, w.pesan))) : null,
    h('div', { class: 'grid', style: null }, bars('Laporan per kategori', a.perKategori), bars('Area sekolah yang sering jadi lokasi', a.perLokasi)),
    h('div', { class: 'grid' }, bars('Keluhan fasilitas per lokasi', a.lokasiFasilitas), bars('Persoalan yang belum selesai', a.belumSelesai)),
    h('div', { class: 'card stack' }, h('h3', {}, 'Perbandingan antar tahun ajaran'), Object.keys(a.perTahunAjaran).length ? Object.keys(a.perTahunAjaran).sort().map(t => h('div', {}, h('b', {}, 'TA ' + t), h('div', { class: 'muted' }, Object.keys(a.perTahunAjaran[t]).map(k => k + ': ' + a.perTahunAjaran[t][k]).join(' | ')))) : h('p', { class: 'muted' }, 'Belum ada data.'))));
}

/* ---------- kegiatan, tahun ajaran, kategori ---------- */
function pKegiatan(v) {
  const box = h('div'), edit = g => formModal({ title: g ? 'Ubah kegiatan' : 'Tambah kegiatan', fields: [{ k: 'judul', label: 'Judul', req: 1, v: g && g.judul }, { k: 'ringkasan', label: 'Ringkasan', type: 'textarea', v: g && g.ringkasan }, { k: 'tanggal', label: 'Tanggal kegiatan (tampil di aplikasi siswa mulai 3 hari sebelumnya, hilang setelah tanggalnya lewat)', type: 'date', req: 1, v: g && g.tanggal }, { k: 'tautan', label: 'Tautan (opsional, diawali https://)', v: g && g.tautan }, { k: 'aktif', label: 'Tampilkan di aplikasi siswa', type: 'check', v: g ? g.aktif === 'TRUE' : true }],
    submit: x => api('kegiatanSave', Object.assign({ id: g && g.id }, x)), after: go });
  v.append(h('div', { class: 'stack' }, head('Informasi Kegiatan OSIS/Sekolah', h('button', { class: 'btn teal', onclick: () => edit() }, 'Tambah kegiatan')), box));
  function go() { load(box, () => api('kegiatanList'), r => tbl([{ t: 'Tanggal', f: x => dd(x.tanggal) }, { t: 'Judul', f: x => x.judul }, { t: 'Ringkasan', f: x => x.ringkasan }, { t: 'Status', f: x => { const n = new Date(), p2 = v => String(v).padStart(2, '0'), td = n.getFullYear() + '-' + p2(n.getMonth() + 1) + '-' + p2(n.getDate()), e = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 3), en = e.getFullYear() + '-' + p2(e.getMonth() + 1) + '-' + p2(e.getDate()); const t = x.aktif !== 'TRUE' ? 'Disembunyikan' : !x.tanggal ? 'Tanpa tanggal (tidak tampil)' : x.tanggal < td ? 'Sudah lewat' : x.tanggal <= en ? 'Tampil di siswa' : 'Terjadwal (tampil H-3)'; return h('span', { class: 'tag' }, t); } }], r.daftar, edit)); }
  go();
}
function pTa(v) {
  const box = h('div'), edit = t => formModal({ title: t ? 'Ubah tahun ajaran' : 'Tambah tahun ajaran', fields: [{ k: 'nama', label: 'Nama (contoh: 2027/2028)', req: 1, v: t && t.nama }, { k: 'mulai', label: 'Mulai', type: 'date', v: t && t.mulai }, { k: 'selesai', label: 'Selesai', type: 'date', v: t && t.selesai }, { k: 'aktif', label: 'Jadikan tahun ajaran aktif', type: 'check', v: t && t.aktif === 'TRUE' }], submit: x => api('taSave', Object.assign({ id: t && t.id }, x)), after: go });
  v.append(h('div', { class: 'stack' }, head('Tahun Ajaran', h('button', { class: 'btn teal', onclick: () => edit() }, 'Tambah')), box));
  function go() { load(box, () => api('taList'), r => tbl([{ t: 'Nama', f: x => x.nama }, { t: 'Mulai', f: x => dd(x.mulai) }, { t: 'Selesai', f: x => dd(x.selesai) }, { t: 'Status', f: x => h('span', { class: 'tag' }, x.aktif === 'TRUE' ? 'Aktif' : 'Tidak aktif') }], r.daftar, edit)); }
  go();
}
function pKategori(v) {
  const box = h('div'), edit = k => formModal({ title: k ? 'Ubah kategori' : 'Tambah kategori', intro: 'Kategori sensitif hanya dapat dibaca petugas yang ditugaskan.', fields: [{ k: 'nama', label: 'Nama kategori', req: 1, v: k && k.nama }, { k: 'urgensi', label: 'Urgensi', type: 'select', options: ['Biasa', 'Tinggi', 'Mendesak'], v: k ? k.urgensi : 'Biasa' }, { k: 'slaHari', label: 'Target penanganan (hari kerja, 0 = segera)', type: 'number', req: 1, v: k ? k.slaHari : 3 }, { k: 'sensitif', label: 'Kategori sensitif', type: 'check', v: k && k.sensitif === 'TRUE' }, { k: 'aktif', label: 'Aktif (tampil di formulir siswa)', type: 'check', v: k ? k.aktif !== 'FALSE' : true }], submit: x => api('kategoriSave', Object.assign({ id: k && k.id }, x)), after: go });
  v.append(h('div', { class: 'stack' }, head('Kategori Aspirasi', h('button', { class: 'btn teal', onclick: () => edit() }, 'Tambah kategori')), box));
  function go() { load(box, () => api('kategoriList'), r => tbl([{ t: 'Kategori', f: x => x.nama }, { t: 'Urgensi', f: x => x.urgensi }, { t: 'SLA (hari kerja)', f: x => x.slaHari }, { t: 'Sensitif', f: x => x.sensitif === 'TRUE' ? h('span', { class: 'tag sens' }, 'Ya') : 'Tidak' }, { t: 'Status', f: x => x.aktif === 'FALSE' ? 'Nonaktif' : 'Aktif' }], r.daftar, edit)); }
  go();
}

/* ---------- pengguna, audit, notifikasi, pengaturan, akun ---------- */
function showPw(pw, who) { notice(true, 'Password sementara', [h('p', {}, 'Berikan password ini kepada ' + who + '. Password hanya tampil sekali dan wajib diganti saat login pertama.'), h('div', { class: 'code' }, pw)]); }
function pPengguna(v) {
  const box = h('div');
  const add = () => formModal({ title: 'Rekam pengguna baru', fields: [{ k: 'nama', label: 'Nama lengkap', req: 1 }, { k: 'username', label: 'Username (huruf kecil/angka, 4-20 karakter)', req: 1 }, { k: 'role', label: 'Role', type: 'select', options: [{ v: O, t: ROLE_NAME[O] }, { v: P, t: 'Petugas (Guru BK/Pembina)' }] }], submit: x => api('userSave', x), done: r => { showPw(r.passwordSementara, 'pengguna baru'); go(); } });
  const edit = u => formModal({ title: 'Ubah akun ' + u.username, fields: [{ k: 'nama', label: 'Nama lengkap', req: 1, v: u.nama }, { k: 'aktif', label: 'Akun aktif', type: 'check', v: u.aktif }], submit: x => api('userSave', { id: u.id, nama: x.nama, aktif: x.aktif }), after: go });
  v.append(h('div', { class: 'stack' }, head('Manajemen Pengguna', h('button', { class: 'btn teal', onclick: add }, 'Rekam pengguna baru')), box));
  function go() { load(box, () => api('userList'), r => tbl([{ t: 'Nama', f: x => x.nama }, { t: 'Username', f: x => x.username }, { t: 'Role', f: x => ROLE_NAME[x.role] }, { t: 'Status', f: x => x.aktif ? 'Aktif' : 'Nonaktif' },
    { t: '', f: x => h('div', { class: 'row wrap' }, h('button', { class: 'btn ghost sm', onclick: e => { e.stopPropagation(); edit(x); } }, 'Ubah'), h('button', { class: 'btn ghost sm', onclick: e => { e.stopPropagation(); modal({ title: 'Reset password?', body: h('p', {}, 'Password ' + x.username + ' diganti dengan password sementara baru dan semua sesinya diakhiri.'), actions: [{ label: 'Batal' }, { label: 'Reset', kind: 'red', fn: () => api('userReset', { id: x.id }).then(rr => showPw(rr.passwordSementara, x.nama)).catch(er => notice(false, 'Gagal', er.message)) }] }); } }, 'Reset password'),
      x.id !== st.user.id ? h('button', { class: 'btn red sm', onclick: e => { e.stopPropagation(); modal({ title: 'Hapus pengguna?', body: [h('p', {}, 'Akun ' + x.nama + ' (' + x.username + ') akan dihapus permanen dan tidak bisa login lagi. Jejak aktivitasnya di Audit Log tetap tersimpan.'), h('p', { class: 'muted' }, 'Tindakan ini tidak dapat dibatalkan. Jika hanya ingin menghentikan akses sementara, gunakan Ubah lalu nonaktifkan akun.')], actions: [{ label: 'Batal' }, { label: 'Ya, hapus', kind: 'red', fn: () => api('userDelete', { id: x.id }).then(() => { notice(true, 'Berhasil', 'Pengguna berhasil dihapus.'); go(); }).catch(er => notice(false, 'Gagal menghapus', er.message)) }] }); } }, 'Hapus') : null) }], r.daftar)); }
  go();
}
function pAudit(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Audit Log', printBtn(true)), box));
  load(box, () => api('auditLog'), r => tbl([{ t: 'Waktu', f: x => dt(x.waktu) }, { t: 'Pengguna', f: x => x.userId }, { t: 'Role', f: x => x.role }, { t: 'Aksi', f: x => x.aksi }, { t: 'Detail', f: x => x.detail }], r.daftar));
}
function pNotif(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Notifikasi'), box));
  load(box, () => api('notifications'), r => !r.daftar.length ? h('div', { class: 'card empty' }, 'Belum ada notifikasi.') : pagedList(r.daftar, n => h('div', { class: 'card row between wrap', style: null },
    h('div', {}, h('b', {}, n.pesan), h('div', { class: 'muted' }, dt(n.waktu) + (n.dibaca === 'TRUE' ? '' : ' - baru'))),
    h('div', { class: 'row' }, n.ref ? h('button', { class: 'btn teal sm', onclick: () => api('readNotif', { id: n.id }).then(() => { location.hash = '#/detail/' + encodeURIComponent(n.ref); pollNotif(); }).catch(() => { location.hash = '#/detail/' + encodeURIComponent(n.ref); }) }, 'Buka laporan') : null,
      n.dibaca !== 'TRUE' ? h('button', { class: 'btn ghost sm', onclick: () => api('readNotif', { id: n.id }).then(() => { pollNotif(); route(); }) }, 'Tandai dibaca') : null))));
}
function csv(rows, cols) { const q = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; return '\ufeff' + [cols.join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join('\r\n'); }
function pPengaturan(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Pengaturan'), box));
  load(box, () => api('settingsGet'), s => h('div', { class: 'stack' },
    h('div', { class: 'card stack' }, h('h3', {}, 'Pengaturan aplikasi'), h('button', { class: 'btn teal', onclick: () => formModal({ title: 'Pengaturan aplikasi', fields: [{ k: 'namaSekolah', label: 'Nama sekolah', req: 1, v: s.namaSekolah }, { k: 'emailEskalasi', label: 'Email penerima eskalasi SLA (opsional)', type: 'email', v: s.emailEskalasi }, { k: 'lokasi', label: 'Daftar lokasi kejadian (satu per baris)', type: 'textarea', rows: 8, v: s.lokasi.join('\n') }], submit: x => api('settingsSave', { namaSekolah: x.namaSekolah, emailEskalasi: x.emailEskalasi, lokasi: x.lokasi.split('\n') }), after: () => route() }) }, 'Ubah pengaturan'),
      h('div', { class: 'muted' }, s.namaSekolah + ' - Email eskalasi: ' + (s.emailEskalasi || 'belum diisi')), h('div', { class: 'muted' }, 'Lokasi: ' + s.lokasi.join(', '))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Pencadangan dan ekspor'), h('p', { class: 'muted' }, 'Cadangan disimpan sebagai salinan spreadsheet di folder "VoiceUp Backup" pada Google Drive pemilik. Ekspor berisi seluruh laporan termasuk yang sensitif: simpan dengan aman.'),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn teal', onclick: () => api('backup').then(r => notice(true, 'Cadangan dibuat', r.nama + ' tersimpan di Google Drive.')).catch(e => notice(false, 'Gagal mencadangkan', e.message)) }, 'Buat cadangan sekarang'),
        h('button', { class: 'btn ghost', onclick: () => api('exportData').then(r => { const a = h('a', { href: URL.createObjectURL(new Blob([csv(r.aspirasi, ['ref', 'waktu', 'jenis', 'kategori', 'lokasi', 'judul', 'uraian', 'status', 'urgensi', 'sensitif', 'slaDue', 'terlambat'])], { type: 'text/csv;charset=utf-8' })), download: 'voiceup-ekspor-' + new Date().toISOString().slice(0, 10) + '.csv' }); document.body.append(a); a.click(); a.remove(); notice(true, 'Ekspor selesai', 'File CSV diunduh. Hapus dari perangkat bila sudah tidak diperlukan.'); }).catch(e => notice(false, 'Gagal mengekspor', e.message)) }, 'Ekspor data (CSV)'))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Penyimpanan sementara'), h('p', { class: 'muted' }, 'Sesi login tersimpan hanya selama tab terbuka dan berakhir otomatis setelah 8 jam.'))));
}
function pAkun(v) {
  v.append(h('div', { class: 'stack' }, head('Akun Saya'), h('div', { class: 'card stack' }, h('b', {}, st.user.nama), h('div', { class: 'muted' }, ROLE_NAME[st.user.role] + ' - ' + st.user.username), h('div', { class: 'row wrap' }, h('button', { class: 'btn teal', onclick: () => formModal(pwForm(false)) }, 'Ganti password'), h('button', { class: 'btn ghost', onclick: logout }, 'Keluar')))));
}

if (SS.get()) start(); else showLogin();
