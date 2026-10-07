// Halaman personal (desain & teks dari referensi yang dikirim Mas, 2026-10-07).
// Disimpan di luar public/ supaya tidak pernah ter-deploy sebagai aset statis;
// hanya disajikan oleh functions/[[path]].js setelah password benar.
//
// Edit langsung di sini kalau mau mengubah isi/tampilan halaman.

export default `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<title>Febrian — Personal Edition</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
<!--
  ===================== CARA EDIT CEPAT =====================
  1. FOTO   : foto profil diambil dari /avatar.jpg di blog.
              Galeri foto-2..4 masih dikomentari; cari "GALERI FOTO"
              untuk mengaktifkannya nanti.
  2. SOSMED : Instagram & Threads @sorediharisabtu.
  3. RUTE TJ: cari "data-done" lalu isi jumlah koridor yang sudah dicoba.
  ===========================================================
-->
<style>
  :root {
    color-scheme: light;
    --bg: #faf6f0;
    --card: #ffffff;
    --ink: #1f1c19;
    --muted: #6f665c;
    --line: #ece3d8;
    --accent: #b03a52;
    --accent-soft: #fdeef1;
    --green: #2f7d5b;
    --green-soft: #e8f4ee;
    --red: #b4472f;
    --red-soft: #fcece7;
    --gold: #b8862b;
    --radius: 18px;
    --shadow: 0 18px 40px -26px rgba(31, 28, 25, .4);
    --serif: "Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    --sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: radial-gradient(1200px 640px at 50% -12%, var(--accent-soft) 0%, var(--bg) 58%) no-repeat, var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  img { max-width: 100%; display: block; }
  .wrap {
    max-width: 44rem;
    margin: 0 auto;
    padding: max(2.5rem, env(safe-area-inset-top)) 1.25rem max(4rem, env(safe-area-inset-bottom));
  }
  h1, h2, h3 { font-family: var(--serif); font-weight: 700; line-height: 1.2; margin: 0; }
  p { margin: 0 0 1rem; }
  p:last-child { margin-bottom: 0; }

  /* ---------- Section scaffold ---------- */
  section { margin-top: 3.5rem; }
  .eyebrow {
    display: inline-flex; align-items: center; gap: .5rem;
    font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--accent); margin-bottom: .6rem;
  }
  .eyebrow::before { content: ""; width: 1.4rem; height: 2px; background: currentColor; border-radius: 2px; }
  h2 { font-size: clamp(1.5rem, 4.6vw, 1.95rem); margin-bottom: 1.1rem; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 1.5rem; box-shadow: var(--shadow);
  }
  .muted { color: var(--muted); }

  /* ---------- Hero ---------- */
  .hero { text-align: center; position: relative; }
  .doc-label {
    display: inline-block; font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
    color: var(--muted); border: 1px dashed #d8cbbb; border-radius: 999px; padding: .3rem .9rem; margin-bottom: 1.6rem;
  }
  .avatar {
    width: 9.5rem; height: 9.5rem; margin: 0 auto 1.4rem; border-radius: 50%;
    border: 5px solid #fff; box-shadow: 0 14px 34px -14px rgba(176, 58, 82, .55);
  }
  .hero h1 { font-size: clamp(2.4rem, 9vw, 3.4rem); letter-spacing: -.01em; }
  .hero .tagline { font-size: 1.05rem; color: var(--muted); margin: .5rem auto 1.4rem; max-width: 30rem; }
  .stamp {
    display: inline-block; transform: rotate(-3deg);
    font-family: var(--serif); font-weight: 700; font-size: .95rem; color: var(--accent);
    border: 2.5px solid var(--accent); border-radius: 8px; padding: .35rem .9rem; letter-spacing: .02em;
    background: rgba(255, 255, 255, .6);
  }
  .status {
    display: flex; justify-content: center; align-items: center; gap: .5rem;
    margin-top: 1.1rem; font-size: .88rem; color: var(--muted);
  }
  .dot { width: .6rem; height: .6rem; border-radius: 50%; background: #3fb37f; box-shadow: 0 0 0 0 rgba(63, 179, 127, .6); animation: ping 2s infinite; }
  @keyframes ping { 70% { box-shadow: 0 0 0 .55rem rgba(63, 179, 127, 0); } 100% { box-shadow: 0 0 0 0 rgba(63, 179, 127, 0); } }

  /* ---------- Photo w/ placeholder ---------- */
  .photo {
    position: relative; overflow: hidden; background:
      repeating-linear-gradient(45deg, #f6eee5 0 10px, #f1e7dc 10px 20px);
    display: grid; place-items: center; color: #a89a8a; font-size: .8rem; text-align: center;
  }
  .photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .photo span { padding: .5rem; }

  /* ---------- Quick facts ---------- */
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .75rem; margin-top: 2.2rem; }
  .fact { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: .9rem 1rem; }
  .fact b { display: block; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
  .fact span { font-weight: 600; font-size: .98rem; }

  /* ---------- Letter ---------- */
  .letter { position: relative; font-size: 1.02rem; }
  .letter::before {
    content: "“"; position: absolute; top: -.6rem; left: 1rem; font-family: var(--serif);
    font-size: 4.5rem; color: var(--accent); opacity: .18; line-height: 1;
  }

  /* ---------- Interest chips ---------- */
  .chips { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1.2rem; }
  .chip {
    font: inherit; font-size: .9rem; font-weight: 500; cursor: pointer;
    display: inline-flex; align-items: center; gap: .4rem;
    background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 999px;
    padding: .45rem .95rem; transition: transform .15s, border-color .15s, background .15s;
  }
  .chip:hover { transform: translateY(-2px); border-color: var(--accent); }
  .chip[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); }
  .chip-note {
    margin-top: .9rem; min-height: 3.2rem; font-size: .92rem; color: var(--muted);
    border-left: 3px solid var(--accent); padding: .2rem 0 .2rem .9rem;
  }

  /* ---------- Family ---------- */
  .family { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .9rem; margin-top: 1.2rem; }
  .fam { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 1.1rem; }
  .fam .emoji { font-size: 1.6rem; }
  .fam h3 { font-size: 1.05rem; margin: .35rem 0 .3rem; }
  .fam p { font-size: .9rem; color: var(--muted); }

  /* ---------- Schedule timeline ---------- */
  .timeline { list-style: none; margin: 1.2rem 0 0; padding: 0; position: relative; }
  .timeline::before { content: ""; position: absolute; left: 1.15rem; top: .6rem; bottom: .6rem; width: 2px; background: var(--line); }
  .timeline li { position: relative; padding-left: 3.4rem; margin-bottom: 1.4rem; }
  .timeline li:last-child { margin-bottom: 0; }
  .t-icon {
    position: absolute; left: 0; top: 0; width: 2.35rem; height: 2.35rem; border-radius: 50%;
    display: grid; place-items: center; background: var(--card); border: 2px solid var(--line); font-size: 1.05rem;
  }
  .t-day { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
  .timeline h3 { font-size: 1.1rem; margin: .1rem 0 .35rem; }
  .timeline p { font-size: .94rem; color: var(--muted); }

  .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; margin-top: 1.4rem; }
  .gallery .photo { aspect-ratio: 1; border-radius: 12px; }

  /* ---------- Side quest ---------- */
  .quest { margin-top: 1.4rem; background: linear-gradient(135deg, #fff 0%, #fff8ef 100%); }
  .quest-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
  .quest-head h3 { font-size: 1.05rem; }
  .quest-count { font-size: .85rem; font-weight: 600; color: var(--gold); }
  .bar { height: .7rem; background: #f1e7dc; border-radius: 999px; overflow: hidden; margin: .8rem 0 .55rem; }
  .bar i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #e3a64a, var(--accent)); transition: width 1.4s cubic-bezier(.2, .8, .2, 1); }
  .quest small { color: var(--muted); font-size: .82rem; }

  /* ---------- Values ---------- */
  .values { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: .9rem; }
  .value { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.3rem; position: relative; overflow: hidden; }
  .value .num { position: absolute; right: .9rem; top: .2rem; font-family: var(--serif); font-size: 3.4rem; font-weight: 700; color: var(--accent); opacity: .1; }
  .value h3 { font-size: 1.15rem; margin-bottom: .45rem; }
  .value p { font-size: .92rem; color: var(--muted); }

  /* ---------- Looking for ---------- */
  .looking { background: var(--ink); color: #f6efe7; border-radius: var(--radius); padding: 2rem 1.6rem; box-shadow: var(--shadow); }
  .looking .eyebrow { color: #f3a9b8; }
  .looking h2 { color: #fff; }
  .looking p { color: #d9cfc4; }
  .looking .big { font-family: var(--serif); font-size: clamp(1.2rem, 4vw, 1.45rem); color: #fff; line-height: 1.45; margin-bottom: 1.2rem; }

  /* ---------- Flip cards ---------- */
  .flag-tabs { display: flex; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .flag-hint { font-size: .85rem; color: var(--muted); margin-bottom: 1rem; }
  .flags { display: grid; grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr)); gap: .9rem; }
  .flip {
    font: inherit; color: inherit; text-align: left; cursor: pointer; border: 0; padding: 0; background: none;
    perspective: 900px; min-height: 10.5rem;
  }
  .flip-inner { position: relative; display: grid; height: 100%; transition: transform .6s cubic-bezier(.2, .8, .2, 1); transform-style: preserve-3d; }
  .flip[aria-pressed="true"] .flip-inner { transform: rotateY(180deg); }
  .face {
    grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden;
    border-radius: var(--radius); padding: 1.2rem; display: flex; flex-direction: column; justify-content: center;
  }
  .face.front { align-items: center; text-align: center; gap: .3rem; }
  .face.front .big-emoji { font-size: 2rem; }
  .face.front b { font-family: var(--serif); font-size: 1.1rem; }
  .face.front small { font-size: .78rem; opacity: .75; }
  .face.back { transform: rotateY(180deg); font-size: .93rem; line-height: 1.6; }
  .green .front { background: var(--green-soft); color: var(--green); border: 1.5px solid #bfe0cf; }
  .green .back { background: var(--green); color: #fff; }
  .red .front { background: var(--red-soft); color: var(--red); border: 1.5px solid #f2c7bb; }
  .red .back { background: var(--red); color: #fff; }

  /* ---------- Closing ---------- */
  .closing { text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 2.2rem 1.5rem; box-shadow: var(--shadow); position: relative; overflow: hidden; }
  .closing::after { content: ""; position: absolute; inset: auto -30% -60% -30%; height: 70%; background: radial-gradient(closest-side, var(--accent-soft), transparent); z-index: 0; }
  .closing > * { position: relative; z-index: 1; }
  .closing h2 { margin-bottom: .8rem; }
  .closing p { max-width: 30rem; margin-left: auto; margin-right: auto; }
  .sign { font-family: var(--serif); font-size: 1.5rem; color: var(--accent); margin-top: 1.3rem; }
  .socials { display: flex; justify-content: center; gap: .5rem; flex-wrap: wrap; margin-top: 1.2rem; }
  .socials a {
    font-size: .85rem; font-weight: 600; color: var(--ink); text-decoration: none;
    border: 1px solid var(--line); border-radius: 999px; padding: .4rem .9rem; background: #fffdfb;
  }
  .socials a:hover { border-color: var(--accent); color: var(--accent); }
  footer { text-align: center; font-size: .78rem; color: var(--muted); margin-top: 2.5rem; }

  /* ---------- Reveal on scroll ---------- */
  .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease; }
  .reveal.in { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .reveal { opacity: 1; transform: none; transition: none; }
    .flip-inner, .bar i { transition: none; }
    .dot { animation: none; }
  }
  @media (max-width: 480px) {
    .card, .looking, .closing { padding: 1.25rem; }
    .gallery { grid-template-columns: repeat(2, 1fr); }
    .gallery .photo:nth-child(3) { grid-column: span 2; aspect-ratio: 2 / 1; }
  }
</style>
</head>
<body>
<main class="wrap">

  <!-- ================= HERO ================= -->
  <header class="hero reveal">
    <div class="doc-label">Lampiran Lamaran · Personal Edition</div>
    <div class="avatar photo" style="border-radius:50%">
      <img src="https://blog.febri4n.my.id/avatar.jpg" alt="Foto Febrian" onerror="this.remove()" />
    </div>
    <h1>Febrian</h1>
    <p class="tagline">Cloud Engineer di hari kerja, penjelajah rute TJ di hari Sabtu, dan pendengar yang baik setiap hari.</p>
    <div class="stamp">Posisi dilamar: Someone Special · Permanent</div>
    <div class="status"><span class="dot" aria-hidden="true"></span> Status: Open to interview 🙂</div>

    <div class="facts">
      <div class="fact"><b>Lahir</b><span>1997</span></div>
      <div class="fact"><b>Asal</b><span>Lampung · suku Jawa</span></div>
      <div class="fact"><b>Di keluarga</b><span>Anak pertama dari 2</span></div>
      <div class="fact"><b>Pekerjaan</b><span>Cloud Engineer</span></div>
    </div>
  </header>

  <!-- ================= INTRO ================= -->
  <section class="reveal">
    <div class="card letter">
      <p><strong>Hi Kak! Salam kenal, aku Febrian.</strong></p>
      <p>CV sebelumnya lebih banyak menjelaskan pekerjaanku, tapi belum banyak cerita tentang siapa aku di balik CV itu.</p>
      <p>Jadi ini versi yang lebih personal. Ditulis apa adanya, nggak dilebih-lebihkan dan nggak dikurangi sedikit pun.</p>
    </div>
  </section>

  <!-- ================= PERSONALITY ================= -->
  <section class="reveal" id="personality">
    <div class="eyebrow">01 · Soft Skills</div>
    <h2>Personality</h2>
    <p>Aku termasuk orang yang agak pendiam dan introvert, dan memang bukan orang yang suka keramaian. Biasanya baru cair kalau sudah satu frekuensi, atau kalau obrolannya masuk ke hal yang sama-sama kita suka. Receh sedikit pun kadang aku bisa ketawa ngakak, wkwkwk.</p>
    <p>Oh iya, aku jarang suka foto. Jadi jangan kaget kalau koleksi fotoku memang sedikit, hehe.</p>
    <p class="muted" style="font-size:.9rem">Ketuk salah satu minatku di bawah ini 👇</p>
    <div class="chips" id="chips">
      <button class="chip" data-note="Kucing selalu jadi topik yang bikin aku langsung semangat ngobrol 🐾">🐱 Kucing</button>
      <button class="chip" data-note="Jokes bapak-bapak versi paling receh pun bisa bikin aku ketawa ngakak.">😂 Jokes bapack-bapack</button>
      <button class="chip" data-note="Selalu update meme terbaru. Ini bahasa cinta generasi kita, kan? 😄">📱 Meme terbaru</button>
      <button class="chip" data-note="Detective Conan! Ada satu karakternya yang jago sulap juga, kebetulan nyambung sama hobiku yang lain.">🔍 Detective Conan</button>
      <button class="chip" data-note="Langit malam, planet, bintang. Kecil banget rasanya kita di alam semesta ini ✨">🔭 Astronomi</button>
      <button class="chip" data-note="Suka nyobain dan ngobrolin wangi-wangian.">🌸 Parfum</button>
      <button class="chip" data-note="Suka sulap. Siapa tahu nanti ada kesempatan buat nunjukin satu-dua trik 🎩">🎩 Sulap</button>
    </div>
    <div class="chip-note" id="chipNote" aria-live="polite">Pilih salah satu, nanti ceritanya muncul di sini.</div>
  </section>

  <!-- ================= FAMILY ================= -->
  <section class="reveal" id="family">
    <div class="eyebrow">02 · Riwayat Keluarga</div>
    <h2>Family</h2>
    <p>Keluarga jadi salah satu bagian paling penting dalam hidupku, terutama Ibu. Kalau sudah ada hal yang berkaitan dengan Ibu, aku gampang sekali terharu.</p>
    <div class="family">
      <div class="fam">
        <div class="emoji">🏡</div>
        <h3>Bapak &amp; Ibu</h3>
        <p>Asli suku Jawa, tinggal di Lampung. Dari merekalah aku belajar banyak hal.</p>
      </div>
      <div class="fam">
        <div class="emoji">🧑‍💻</div>
        <h3>Aku, si sulung</h3>
        <p>Anak pertama dari dua bersaudara. Fokus di bidang IT dan sekarang merantau.</p>
      </div>
      <div class="fam">
        <div class="emoji">⚡</div>
        <h3>Adikku</h3>
        <p>Lulusan Teknik Elektro, dan alhamdulillah bulan kemarin baru dapat pekerjaan pertamanya. Yeay! 🎉</p>
      </div>
    </div>
    <p class="muted" style="margin-top:1.1rem;font-size:.92rem">Cerita keluarga yang lebih panjang aku simpan untuk sesi interview berikutnya ya, hehe.</p>
  </section>

  <!-- ================= DAILY LIFE ================= -->
  <section class="reveal" id="daily">
    <div class="eyebrow">03 · Jadwal Operasional</div>
    <h2>Daily Life</h2>
    <ol class="timeline">
      <li>
        <div class="t-icon" aria-hidden="true">💻</div>
        <div class="t-day">Senin – Jumat</div>
        <h3>Mode Cloud Engineer</h3>
        <p>Server, troubleshooting, deployment, meeting, dan kadang ngoding juga. Kalau ada aplikasi yang nggak jalan, biasanya aku salah satu yang dicari, wkwkwk. Semoga jangan sampai ya. Yang tadinya lapar bisa langsung kenyang seketika.</p>
      </li>
      <li>
        <div class="t-icon" aria-hidden="true">🚌</div>
        <div class="t-day">Sabtu</div>
        <h3>Explore tanpa agenda</h3>
        <p>Main badminton, jalan kaki (iya, kamu nggak salah baca), atau pergi begitu saja keliling naik TJ. Cobain tempat dan makanan baru, atau sekadar menikmati suasana yang beda dari rutinitas. Lagi kepikiran mau coba hobi sepeda juga.</p>
      </li>
      <li>
        <div class="t-icon" aria-hidden="true">🔋</div>
        <div class="t-day">Minggu</div>
        <h3>Recharge energy</h3>
        <p>Kalau Sabtunya sudah jalan-jalan, Minggu biasanya full di kos buat istirahat dan beberes. Main game? Nggak terlalu, sih.</p>
      </li>
    </ol>

    <!-- GALERI FOTO (aktifkan nanti: hapus tanda komentar ini)
    <div class="gallery">
      <div class="photo"><img src="foto-2.jpg" alt="" onerror="this.remove()" /><span>foto-2.jpg</span></div>
      <div class="photo"><img src="foto-3.jpg" alt="" onerror="this.remove()" /><span>foto-3.jpg</span></div>
      <div class="photo"><img src="foto-4.jpg" alt="" onerror="this.remove()" /><span>foto-4.jpg</span></div>
    </div>
    -->

    <!-- Ganti data-done dengan jumlah koridor TJ yang sudah dicoba (0 = baru wacana) -->
    <div class="card quest" id="quest" data-done="0" data-total="14">
      <div class="quest-head">
        <h3>🎯 Side quest: cobain semua rute TJ</h3>
        <span class="quest-count" id="questCount"></span>
      </div>
      <div class="bar"><i id="questBar"></i></div>
      <small>Mungkin ini pikiran semua perantau yang baru pertama kali ke sini, wkwkwk.</small>
    </div>
  </section>

  <!-- ================= VALUES ================= -->
  <section class="reveal" id="values">
    <div class="eyebrow">04 · Core Values</div>
    <h2>Yang menurutku penting</h2>
    <p>Beberapa hal yang menurutku penting dan baik, dalam kehidupan maupun dalam hubungan.</p>
    <div class="values">
      <div class="value">
        <div class="num">1</div>
        <h3>💬 Komunikasi</h3>
        <p>Aku lebih nyaman dengan komunikasi yang terbuka. Kalau ada yang mengganggu, lebih baik dibicarakan daripada saling diam atau berharap pasangan bisa menebak perasaan kita.</p>
      </div>
      <div class="value">
        <div class="num">2</div>
        <h3>🤍 Kejujuran</h3>
        <p>Nggak harus menceritakan semuanya di awal, tapi jujur tentang diri sendiri itu penting. Semua akun sosmed-ku asli dan bisa dicari dengan username yang sama.</p>
      </div>
      <div class="value">
        <div class="num">3</div>
        <h3>🤝 Respect</h3>
        <p>Beda pendapat, beda kesukaan, atau beda cara berpikir itu nggak masalah. Selama saling menghargai dan tetap sesuai norma dan agama, perbedaan justru bisa bikin hubungan lebih menarik.</p>
      </div>
      <div class="value">
        <div class="num">4</div>
        <h3>🌱 Growth</h3>
        <p>Aku suka kalau dua orang dalam hubungan punya tujuan dan mimpi masing-masing, tapi tetap saling mendukung supaya sama-sama berkembang.</p>
      </div>
    </div>
  </section>

  <!-- ================= LOOKING FOR ================= -->
  <section class="reveal" id="looking">
    <div class="looking">
      <div class="eyebrow">05 · Job Description</div>
      <h2>What I'm Looking For</h2>
      <p class="big">Aku nggak mencari pasangan yang sempurna. Aku ingin menemukan seseorang yang bikin kita berdua sama-sama nyaman dan bisa jadi diri sendiri.</p>
      <p>Seseorang yang bisa diajak berkomunikasi dengan baik, bisa bercanda soal hal-hal receh, dan juga bisa diajak ngobrol hal yang serius.</p>
      <p>Menurutku nggak semua kriteria harus ditentukan dari awal. Banyak hal tentang seseorang yang baru bisa kita ketahui setelah benar-benar mengenalnya.</p>
    </div>
  </section>

  <!-- ================= FLAGS ================= -->
  <section class="reveal" id="flags">
    <div class="eyebrow">06 · Full Disclosure</div>
    <h2>Green flags &amp; red flags</h2>
    <p class="flag-hint">Ketuk kartunya untuk membuka. Biar adil, red flag-nya juga aku tulis 🙂</p>
    <div class="flags">
      <button class="flip green" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">💚</span><b>Green flag #1</b><small>ketuk untuk buka</small></div>
        <div class="face back">Belum pernah pacaran, jadi nggak punya mantan. Teman perempuan yang dekat juga nggak banyak.</div>
      </div></button>
      <button class="flip green" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">👂</span><b>Green flag #2</b><small>ketuk untuk buka</small></div>
        <div class="face back">Suka jadi pendengar, apalagi kalau kamu lagi cerita tentang sesuatu yang kamu suka.</div>
      </div></button>
      <button class="flip green" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">📚</span><b>Green flag #3</b><small>ketuk untuk buka</small></div>
        <div class="face back">Suka belajar dan mencoba hal-hal baru yang positif.</div>
      </div></button>
      <button class="flip green" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">🧘</span><b>Green flag #4</b><small>ketuk untuk buka</small></div>
        <div class="face back">Bukan tipe orang yang gampang marah.</div>
      </div></button>
      <button class="flip red" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">🖥️</span><b>Red flag #1</b><small>ketuk untuk buka</small></div>
        <div class="face back">Kadang bisa terlalu fokus sama pekerjaan atau sesuatu yang lagi aku kerjakan.</div>
      </div></button>
      <button class="flip red" aria-pressed="false"><div class="flip-inner">
        <div class="face front"><span class="big-emoji">🌱</span><b>Red flag #2</b><small>ketuk untuk buka</small></div>
        <div class="face back">Belum berpengalaman pacaran, jadi mungkin masih banyak belajar cara memperlakukan pasangan. Tapi aku tahu batasan, termasuk menjaga sentuhan sebelum halal.</div>
      </div></button>
    </div>
  </section>

  <!-- ================= CLOSING ================= -->
  <section class="reveal" id="closing">
    <div class="closing">
      <div class="eyebrow">Next Step</div>
      <h2>Lanjut ke interview tahap 2?</h2>
      <p>Sisanya mungkin bisa kita cari tahu sambil jalan dan berproses kenalan, kalau Kakak juga merasa cocok ya. :)</p>
      <p class="muted" style="font-size:.92rem">Terima kasih sudah membaca sampai sini, dan salam hangat untuk keluarga 🙏</p>
      <div class="sign">— Febrian</div>
      <div class="socials">
        <a href="https://blog.febri4n.my.id/about/" target="_blank" rel="noopener">📄 CV profesional</a>
        <a href="https://instagram.com/sorediharisabtu" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.threads.com/@sorediharisabtu/reposts" target="_blank" rel="noopener">Threads (repostan)</a>
      </div>
    </div>
  </section>

  <footer>Dibuat dengan sepenuh hati, tanpa dilebih-lebihkan ✨</footer>
</main>

<script>
  // Reveal on scroll
  (function () {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  })();

  // Interest chips
  (function () {
    var chips = document.querySelectorAll('.chip');
    var note = document.getElementById('chipNote');
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', function () {
        chips.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        c.setAttribute('aria-pressed', 'true');
        note.textContent = c.dataset.note;
      });
    });
  })();

  // Flip cards
  document.querySelectorAll('.flip').forEach(function (f) {
    f.addEventListener('click', function () {
      f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  // TJ side quest
  (function () {
    var q = document.getElementById('quest');
    var done = parseInt(q.dataset.done, 10) || 0;
    var total = parseInt(q.dataset.total, 10) || 1;
    var label = document.getElementById('questCount');
    var bar = document.getElementById('questBar');
    var pct = done === 0 ? 4 : Math.min(100, Math.round(done / total * 100));
    label.textContent = done === 0 ? 'Status: masih wacana 😄' : done + ' / ' + total + ' koridor';
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { bar.style.width = pct + '%'; io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(q);
  })();

</script>
</body>
</html>`;
