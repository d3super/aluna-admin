'use strict';
/* ALUNA Admin: website monitoring dan tindak lanjut. Semua teks dirender lewat textContent (anti-XSS).
   Hak akses SESUNGGUHNYA dijaga server (Apps Script); menu di sini hanya penyesuaian tampilan. */
const S = 'SUPER_ADMIN', O = 'ADMIN_OSIS', P = 'PETUGAS_SENSITIF';
const ROLE_NAME = { [S]: 'Super Admin', [O]: 'Admin OSIS', [P]: 'Petugas Penanganan Laporan Sensitif' };
const STATUS = ['Diterima', 'Ditelaah', 'Diproses', 'Selesai', 'Ditutup'];
const st = { user: null, meta: null, notif: 0 };
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
  moon: '<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>', back: '<path d="M15 5l-7 7 7 7"/>'
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
function tbl(cols, rows, onRow) {
  if (!rows.length) return h('div', { class: 'card empty' }, 'Belum ada data.');
  return h('div', { class: 'tblw' }, h('table', {}, h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c.t)))),
    h('tbody', {}, rows.map(r => h('tr', onRow ? { class: 'click', tabindex: 0, onclick: () => onRow(r), onkeydown: e => { if (e.key === 'Enter') onRow(r); } } : {}, cols.map(c => h('td', {}, c.f(r))))))));
}
const bars = (t, o) => { const ks = Object.keys(o).sort((a, b) => o[b] - o[a]), mx = o[ks[0]] || 1; return h('div', { class: 'card stack' }, h('h3', {}, t), ks.length ? ks.map(k => { const i = h('i'); i.style.width = Math.max(4, o[k] * 100 / mx) + '%'; return h('div', { class: 'bar' }, h('div', { class: 'lab' }, h('span', {}, k), h('b', {}, o[k])), h('div', { class: 'tr' }, i)); }) : h('p', { class: 'muted' }, 'Belum ada data.')); };
const head = (t, ...r) => h('div', { class: 'row between wrap' }, h('h2', {}, t), h('div', { class: 'row wrap' }, r));
const printBtn = () => h('button', { class: 'btn ghost sm noprint', onclick: () => window.print() }, ic('print'), 'Cetak / simpan PDF');

/* ---------- login ---------- */
function showLogin(msg) {
  const u = h('input', { class: 'in', autocomplete: 'username', autocapitalize: 'none' }), p = h('input', { class: 'in', type: 'password', autocomplete: 'current-password' }), er = h('div', { class: 'err', role: 'alert' }, msg || '');
  const go = async () => {
    er.textContent = ''; if (!u.value.trim() || !p.value) return er.textContent = 'Isi username dan password.';
    b.disabled = true; b.textContent = 'Memeriksa...';
    try { const r = await api('login', { username: u.value, password: p.value }); SS.set({ token: r.token }); st.user = r.user; r.wajibGanti ? showForceChange() : start(); }
    catch (e) { er.textContent = e.message; b.disabled = false; b.textContent = 'Masuk'; }
  };
  const b = h('button', { class: 'btn teal', onclick: go }, 'Masuk');
  [u, p].forEach(x => x.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
  $('#app').replaceChildren(h('div', { class: 'login' }, h('div', { class: 'box card' }, h('img', { src: LOGO, alt: 'Logo ALUNA' }), h('h1', {}, 'ALUNA'), h('p', { class: 'muted', style: null }, 'Masuk untuk monitoring dan tindak lanjut aspirasi.'),
    h('label', { class: 'f' }, 'Username', u), h('label', { class: 'f' }, 'Password', p), er, b, h('p', { class: 'muted' }, 'Lupa password? Hubungi Super Admin sekolah.'), h('small', { class: 'muted' }, 'SMP Negeri 1 Kota Bandar Lampung - Copyright@2026 ALUNA'))));
}
function pwForm(forced) {
  return { title: 'Ganti password', fields: [{ k: 'lama', label: 'Password saat ini', type: 'password', req: 1 }, { k: 'baru', label: 'Password baru (min. 8 karakter, huruf dan angka)', type: 'password', req: 1 }, { k: 'ulang', label: 'Ulangi password baru', type: 'password', req: 1 }],
    submit: async v => { if (v.baru !== v.ulang) throw new Error('Ulangi password tidak sama.'); await api('changePassword', { lama: v.lama, baru: v.baru }); }, okMsg: 'Password berhasil diganti.', after: () => { if (forced) start(); } };
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
function drawShell() {
  const cur = (location.hash.replace('#/', '') || 'dashboard').split('/')[0], dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const side = h('aside', { class: 'side', id: 'side' }, h('div', { class: 'brand' }, h('img', { src: LOGO, alt: '' }), h('div', {}, h('b', {}, 'ALUNA'), h('small', {}, 'Monitoring dan tindak lanjut'))),
    MENU.filter(m => m.r.indexOf(st.user.role) >= 0).map(m => h('a', { href: '#/' + m.id, 'aria-current': cur === m.id || (cur === 'detail' && m.id === (st.user.role === P ? 'sensitif' : 'inbox')) ? 'page' : null, onclick: () => side.classList.remove('open') }, ic(m.i), m.t, m.id === 'notif' && st.notif ? h('span', { class: 'badge-n' }, st.notif) : null)),
    h('div', { class: 'who' }, h('b', {}, st.user.nama), h('div', { class: 'muted', style: null }, ROLE_NAME[st.user.role]), h('button', { class: 'btn ghost sm', onclick: logout }, ic('out'), 'Keluar')));
  const top = h('div', { class: 'topbar noprint' }, h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Buka menu', onclick: () => side.classList.toggle('open') }, ic('menu')), h('b', {}, 'SMP Negeri 1 Kota Bandar Lampung'), h('span', { class: 'sp' }),
    h('button', { class: 'icon-btn', 'aria-label': dark ? 'Mode terang' : 'Mode gelap', onclick: theme }, ic(dark ? 'sun' : 'moon')));
  $('#app').replaceChildren(h('div', { class: 'shell' }, side, h('div', { class: 'main' }, top, h('main', { class: 'content', id: 'view', tabindex: -1 }))));
}
function route() {
  if (!st.user) return;
  const parts = (location.hash.replace('#/', '') || 'dashboard').split('/'), id = parts[0];
  const m = MENU.filter(x => x.id === id)[0];
  if (id !== 'detail' && (!m || m.r.indexOf(st.user.role) < 0)) { location.hash = '#/dashboard'; return; }
  if (!$('#view')) drawShell(); else drawShell();
  const v = $('#view'); (PAGES[id] || pDash)(v, decodeURIComponent(parts[1] || '')); window.scrollTo(0, 0);
}
async function pollNotif() { try { const r = await api('notifications'); if (r.belumDibaca !== st.notif) { st.notif = r.belumDibaca; const s = $('#side'); if (s) { const keep = s.classList.contains('open'); drawShell(); if (keep) $('#side').classList.add('open'); } } } catch (e) {} }
async function start() {
  try { const me = await api('me'); st.user = me.user; } catch (e) { return showLogin(); }
  try { st.meta = await api('meta'); } catch (e) { st.meta = { kategori: [], jenis: [], tahunAjaran: [] }; }
  await pollNotif(); setInterval(pollNotif, 60000);
  if (!location.hash) location.hash = '#/dashboard'; route();
}
window.addEventListener('hashchange', route);

/* ---------- dashboard ---------- */
function pDash(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Dashboard Admin', printBtn()), h('div', { class: 'printonly' }, h('b', {}, 'Laporan ringkasan ALUNA - SMP Negeri 1 Kota Bandar Lampung'), h('div', {}, 'Dicetak ' + dt(new Date().toISOString()))), box));
  load(box, () => api('dashboard'), d => {
    const c = (n, l, bad) => h('div', { class: 'card stat' + (bad ? ' bad' : '') }, h('b', {}, n), h('span', {}, l));
    return h('div', { class: 'stack' },
      d.peringatan.length ? h('div', { class: 'card stack' }, h('h3', {}, 'Peringatan dini'), d.peringatan.map(w => h('div', { class: 'warn ' + w.tingkat }, w.pesan))) : h('div', { class: 'card muted' }, 'Tidak ada peringatan dini saat ini.'),
      h('div', { class: 'grid' }, c(d.total, 'Total laporan'), c(d.belumDitangani, 'Belum ditangani'), c(d.terlambat, 'Melewati SLA', d.terlambat > 0), c(d.persenRespons + '%', 'Sudah direspon'), d.ratingRata2 !== null ? c(d.ratingRata2 + '/5', 'Kepuasan rata-rata') : null),
      bars('Laporan per status', d.status));
  });
}

/* ---------- inbox dan detail ---------- */
function pInbox(v, sens) {
  const box = h('div'), f = { status: '', kategoriId: '', jenis: '', q: '', terlambat: false };
  const sel = (k, ph, opts) => h('select', { class: 'in', 'aria-label': ph, onchange: e => { f[k] = e.target.value; go(); } }, h('option', { value: '' }, ph), opts.map(o => h('option', { value: o.v !== undefined ? o.v : o }, o.t !== undefined ? o.t : o)));
  const q = h('input', { class: 'in', placeholder: 'Cari judul / nomor referensi', 'aria-label': 'Cari', oninput: e => { f.q = e.target.value; clearTimeout(q._t); q._t = setTimeout(go, 350); } });
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
    h('div', { class: 'printonly' }, h('b', {}, 'ALUNA - Laporan ' + L.ref), h('div', {}, 'Dicetak ' + dt(new Date().toISOString()) + ' oleh ' + me.nama + (L.sensitif ? ' - RAHASIA' : ''))),
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
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Analisis Isu Sekolah', printBtn()), box));
  load(box, () => api('analisis'), a => h('div', { class: 'stack' },
    a.kategoriNaik.length ? h('div', { class: 'card stack' }, h('h3', {}, 'Kategori yang meningkat'), a.kategoriNaik.map(w => h('div', { class: 'warn' }, w.pesan))) : null,
    h('div', { class: 'grid', style: null }, bars('Laporan per kategori', a.perKategori), bars('Area sekolah yang sering jadi lokasi', a.perLokasi)),
    h('div', { class: 'grid' }, bars('Keluhan fasilitas per lokasi', a.lokasiFasilitas), bars('Persoalan yang belum selesai', a.belumSelesai)),
    h('div', { class: 'card stack' }, h('h3', {}, 'Perbandingan antar tahun ajaran'), Object.keys(a.perTahunAjaran).length ? Object.keys(a.perTahunAjaran).sort().map(t => h('div', {}, h('b', {}, 'TA ' + t), h('div', { class: 'muted' }, Object.keys(a.perTahunAjaran[t]).map(k => k + ': ' + a.perTahunAjaran[t][k]).join(' | ')))) : h('p', { class: 'muted' }, 'Belum ada data.'))));
}

/* ---------- kegiatan, tahun ajaran, kategori ---------- */
function pKegiatan(v) {
  const box = h('div'), edit = g => formModal({ title: g ? 'Ubah kegiatan' : 'Tambah kegiatan', fields: [{ k: 'judul', label: 'Judul', req: 1, v: g && g.judul }, { k: 'ringkasan', label: 'Ringkasan', type: 'textarea', v: g && g.ringkasan }, { k: 'tanggal', label: 'Tanggal', type: 'date', v: g && g.tanggal }, { k: 'tautan', label: 'Tautan (opsional, diawali https://)', v: g && g.tautan }, { k: 'aktif', label: 'Tampilkan di aplikasi siswa', type: 'check', v: g ? g.aktif === 'TRUE' : true }],
    submit: x => api('kegiatanSave', Object.assign({ id: g && g.id }, x)), after: go });
  v.append(h('div', { class: 'stack' }, head('Informasi Kegiatan OSIS/Sekolah', h('button', { class: 'btn teal', onclick: () => edit() }, 'Tambah kegiatan')), box));
  function go() { load(box, () => api('kegiatanList'), r => tbl([{ t: 'Tanggal', f: x => dd(x.tanggal) }, { t: 'Judul', f: x => x.judul }, { t: 'Ringkasan', f: x => x.ringkasan }, { t: 'Status', f: x => h('span', { class: 'tag' }, x.aktif === 'TRUE' ? 'Tampil' : 'Disembunyikan') }], r.daftar, edit)); }
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
  const add = () => formModal({ title: 'Tambah akun', fields: [{ k: 'nama', label: 'Nama lengkap', req: 1 }, { k: 'username', label: 'Username (huruf kecil/angka, 4-20 karakter)', req: 1 }, { k: 'role', label: 'Role', type: 'select', options: [{ v: O, t: ROLE_NAME[O] }, { v: P, t: 'Petugas (Guru BK/Pembina)' }] }], submit: x => api('userSave', x), done: r => { showPw(r.passwordSementara, 'pengguna baru'); go(); } });
  const edit = u => formModal({ title: 'Ubah akun ' + u.username, fields: [{ k: 'nama', label: 'Nama lengkap', req: 1, v: u.nama }, { k: 'aktif', label: 'Akun aktif', type: 'check', v: u.aktif }], submit: x => api('userSave', { id: u.id, nama: x.nama, aktif: x.aktif }), after: go });
  v.append(h('div', { class: 'stack' }, head('Manajemen Pengguna', h('button', { class: 'btn teal', onclick: add }, 'Tambah akun')), box));
  function go() { load(box, () => api('userList'), r => tbl([{ t: 'Nama', f: x => x.nama }, { t: 'Username', f: x => x.username }, { t: 'Role', f: x => ROLE_NAME[x.role] }, { t: 'Status', f: x => x.aktif ? 'Aktif' : 'Nonaktif' },
    { t: '', f: x => h('div', { class: 'row wrap' }, h('button', { class: 'btn ghost sm', onclick: e => { e.stopPropagation(); edit(x); } }, 'Ubah'), h('button', { class: 'btn ghost sm', onclick: e => { e.stopPropagation(); modal({ title: 'Reset password?', body: h('p', {}, 'Password ' + x.username + ' diganti dengan password sementara baru dan semua sesinya diakhiri.'), actions: [{ label: 'Batal' }, { label: 'Reset', kind: 'red', fn: () => api('userReset', { id: x.id }).then(rr => showPw(rr.passwordSementara, x.nama)).catch(er => notice(false, 'Gagal', er.message)) }] }); } }, 'Reset password')) }], r.daftar)); }
  go();
}
function pAudit(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Audit Log', printBtn()), box));
  load(box, () => api('auditLog'), r => tbl([{ t: 'Waktu', f: x => dt(x.waktu) }, { t: 'Pengguna', f: x => x.userId }, { t: 'Role', f: x => x.role }, { t: 'Aksi', f: x => x.aksi }, { t: 'Detail', f: x => x.detail }], r.daftar));
}
function pNotif(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Notifikasi'), box));
  load(box, () => api('notifications'), r => !r.daftar.length ? h('div', { class: 'card empty' }, 'Belum ada notifikasi.') : h('div', { class: 'stack' }, r.daftar.map(n => h('div', { class: 'card row between wrap', style: null },
    h('div', {}, h('b', {}, n.pesan), h('div', { class: 'muted' }, dt(n.waktu) + (n.dibaca === 'TRUE' ? '' : ' - baru'))),
    h('div', { class: 'row' }, n.ref ? h('button', { class: 'btn teal sm', onclick: () => api('readNotif', { id: n.id }).then(() => { location.hash = '#/detail/' + encodeURIComponent(n.ref); pollNotif(); }).catch(() => { location.hash = '#/detail/' + encodeURIComponent(n.ref); }) }, 'Buka laporan') : null,
      n.dibaca !== 'TRUE' ? h('button', { class: 'btn ghost sm', onclick: () => api('readNotif', { id: n.id }).then(() => { pollNotif(); route(); }) }, 'Tandai dibaca') : null)))));
}
function csv(rows, cols) { const q = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; return '\ufeff' + [cols.join(',')].concat(rows.map(r => cols.map(c => q(r[c])).join(','))).join('\r\n'); }
function pPengaturan(v) {
  const box = h('div'); v.append(h('div', { class: 'stack' }, head('Pengaturan'), box));
  load(box, () => api('settingsGet'), s => h('div', { class: 'stack' },
    h('div', { class: 'card stack' }, h('h3', {}, 'Pengaturan aplikasi'), h('button', { class: 'btn teal', onclick: () => formModal({ title: 'Pengaturan aplikasi', fields: [{ k: 'namaSekolah', label: 'Nama sekolah', req: 1, v: s.namaSekolah }, { k: 'emailEskalasi', label: 'Email penerima eskalasi SLA (opsional)', type: 'email', v: s.emailEskalasi }, { k: 'lokasi', label: 'Daftar lokasi kejadian (satu per baris)', type: 'textarea', rows: 8, v: s.lokasi.join('\n') }], submit: x => api('settingsSave', { namaSekolah: x.namaSekolah, emailEskalasi: x.emailEskalasi, lokasi: x.lokasi.split('\n') }), after: () => route() }) }, 'Ubah pengaturan'),
      h('div', { class: 'muted' }, s.namaSekolah + ' - Email eskalasi: ' + (s.emailEskalasi || 'belum diisi')), h('div', { class: 'muted' }, 'Lokasi: ' + s.lokasi.join(', '))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Pencadangan dan ekspor'), h('p', { class: 'muted' }, 'Cadangan disimpan sebagai salinan spreadsheet di folder "ALUNA Backup" pada Google Drive pemilik. Ekspor berisi seluruh laporan termasuk yang sensitif: simpan dengan aman.'),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn teal', onclick: () => api('backup').then(r => notice(true, 'Cadangan dibuat', r.nama + ' tersimpan di Google Drive.')).catch(e => notice(false, 'Gagal mencadangkan', e.message)) }, 'Buat cadangan sekarang'),
        h('button', { class: 'btn ghost', onclick: () => api('exportData').then(r => { const a = h('a', { href: URL.createObjectURL(new Blob([csv(r.aspirasi, ['ref', 'waktu', 'jenis', 'kategori', 'lokasi', 'judul', 'uraian', 'status', 'urgensi', 'sensitif', 'slaDue', 'terlambat'])], { type: 'text/csv;charset=utf-8' })), download: 'aluna-ekspor-' + new Date().toISOString().slice(0, 10) + '.csv' }); document.body.append(a); a.click(); a.remove(); notice(true, 'Ekspor selesai', 'File CSV diunduh. Hapus dari perangkat bila sudah tidak diperlukan.'); }).catch(e => notice(false, 'Gagal mengekspor', e.message)) }, 'Ekspor data (CSV)'))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Penyimpanan sementara'), h('p', { class: 'muted' }, 'Sesi login tersimpan hanya selama tab terbuka dan berakhir otomatis setelah 8 jam.'))));
}
function pAkun(v) {
  v.append(h('div', { class: 'stack' }, head('Akun Saya'), h('div', { class: 'card stack' }, h('b', {}, st.user.nama), h('div', { class: 'muted' }, ROLE_NAME[st.user.role] + ' - ' + st.user.username), h('div', { class: 'row wrap' }, h('button', { class: 'btn teal', onclick: () => formModal(pwForm(false)) }, 'Ganti password'), h('button', { class: 'btn ghost', onclick: logout }, 'Keluar')))));
}

if (SS.get()) start(); else showLogin();
