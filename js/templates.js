// Each design: size, markup, and how far the photo starts from the top (0 = top, 1 = bottom).
// The app fills [data-name] with the person's name and puts their photo inside .ph.

const goldRibbon = `
  <svg class="ribbon" viewBox="0 0 1000 140" preserveAspectRatio="none">
    <path d="M0 20 Q 300 110 1000 135 L1000 140 L0 140Z" fill="#1d4fa8"/>
    <path d="M0 0 Q 300 90 1000 120 L1000 132 Q 300 102 0 14Z" fill="#1f8f3e"/>
    <path d="M0 -22 Q 300 70 1000 106 L1000 120 Q 300 86 0 -6Z" fill="#f2c412"/>
    <path d="M0 -44 Q 300 50 1000 92 L1000 106 Q 300 66 0 -28Z" fill="#d62a1e"/>
    <path d="M0 -50 Q 300 44 1000 88 L1000 92 Q 300 50 0 -44Z" fill="#f6e7a6"/>
  </svg>`;


// Barcode stripes for the cover design (decoration only).
const barcode = (() => {
  const widths = [3,1,2,1,1,3,2,1,1,2,3,1,1,1,2,2,1,3,1,2,1,1,2,3,1,2,1,1,3,1,2,2,1,1,3,1,2,1,2,1];
  let x = 0, out = '';
  widths.forEach((w, i) => { if (i % 2 === 0) out += `<rect x="${x}" y="0" width="${w * 2}" height="70"/>`; x += w * 2 + 1; });
  return `<svg viewBox="0 0 ${x} 70" width="${x}" height="70" fill="#111">${out}</svg>`;
})();

export const TEMPLATES = [
  {
    id: 'gold',
    label: 'Gold',
    width: 1080,
    height: 1080,
    photoTop: 0.25,
    html: `
      <div class="t-gold">
                ${goldRibbon}
        <div class="tl-g"></div><div class="tl"></div>
        <div class="br-g"></div><div class="br"></div>
        <div class="border"></div>
        <div class="logo"><img src="img/logo.png" alt=""></div>
        <div class="title">
          <svg class="cap" viewBox="0 0 100 60"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dc8a"/><stop offset="1" stop-color="#a88a33"/></linearGradient></defs>
            <path d="M50 4 L96 22 L50 40 L4 22Z" fill="url(#cg)" stroke="#8a6b1c" stroke-width="2"/>
            <path d="M24 32 L24 46 Q50 60 76 46 L76 32 L50 42Z" fill="url(#cg)" stroke="#8a6b1c" stroke-width="2"/>
            <path d="M88 25 L88 46" stroke="#8a6b1c" stroke-width="3"/><circle cx="88" cy="48" r="4" fill="#8a6b1c"/></svg>
          <div class="word">GOSOSA</div>
          <div class="set"><i></i>SET 2016<i></i></div>
        </div>
        <div class="anniv">
          <div class="ten-wrap">
            <svg class="ten" viewBox="0 0 230 140" width="230" height="140">
              <defs><linearGradient id="ten-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff1b0"/><stop offset=".38" stop-color="#e2b847"/><stop offset=".7" stop-color="#9a7014"/><stop offset="1" stop-color="#e9c565"/></linearGradient></defs>
              <text x="115" y="127" text-anchor="middle" font-family="Playfair Display" font-weight="900" font-size="150" letter-spacing="-4" fill="#4a3305" opacity=".35">10</text>
              <text x="115" y="124" text-anchor="middle" font-family="Playfair Display" font-weight="900" font-size="150" letter-spacing="-4" fill="url(#ten-g)" stroke="#6e4f0c" stroke-width="1.6" paint-order="stroke">10</text>
            </svg>
            <div class="years">Years</div></div>
          <div class="ann">ANNIVERSARY</div><div class="ann-line"></div>
        </div>
        <div class="vline" style="left:262px"></div><div class="vline" style="right:262px"></div>
        <div class="frame"><div class="in"><div class="ph"></div></div></div>
        <div class="namebar-g"></div>
        <div class="namebar"><i></i><span data-name data-fit="430"></span><i></i></div>
        <div class="present">I Will Be Present</div>
        <svg class="swoosh" viewBox="0 0 420 30"><path d="M5 22 Q 210 -4 415 12 Q 210 6 5 26Z" fill="#b8932f"/></svg>
        <div class="date"><i></i>NOVEMBER, 20th – 22nd, 2026<i></i></div>
      </div>`,
  },
  {
    id: 'navy',
    label: 'Navy',
    width: 1080,
    height: 1350,
    photoTop: 0.2,
    html: `
      <div class="t-navy">
        <div class="stripe" style="top:0"><i></i><i></i><i></i><i></i></div>
        <div class="dots"></div>
        <div class="ghost">2016</div>
        <div class="head">
          <img src="img/logo.png" alt="">
          <div class="org"><b>Good Shepherd College</b><span>Old Students' Association · GOSOSA</span></div>
          <div class="pill">SET 2016</div>
        </div>
        <div class="left">
          <div class="kicker">GOSOSA · Set 2016</div>
          <div class="big">10<sup>th</sup></div>
          <div class="yrs">Anniversary <em>Reunion</em></div>
          <div class="rule"></div>
          <p class="blurb">Ten years after we left, the <b>Class of 2016</b> comes home again.<br><b>Arise and Shine.</b></p>
        </div>
        <div class="photo">
          <div class="back"></div>
          <div class="ph"></div>
          <div class="shade"></div>
          <div class="badge">
            <svg viewBox="0 0 190 190"><defs><path id="badge-circle" d="M95,95 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
              <text font-family="Manrope" font-weight="800" font-size="15" letter-spacing="4.2" fill="#0a1a3f"><textPath href="#badge-circle">GOSOSA · SET 2016 · CLASS REUNION ·</textPath></text></svg>
            <div class="tick">I'll be<br>there</div>
          </div>
        </div>
        <div class="who">
          <div class="label">Confirmed attendee</div>
          <div class="name" data-name data-fit="860"></div>
          <div class="line">will be present. See you there!</div>
        </div>
        <div class="bottom">
          <div><small>Date</small><strong>20<em>–</em>22 November 2026</strong></div>
          <div><small>Celebrating</small><strong>10 years since <em>2016</em></strong></div>
        </div>
        <div class="stripe" style="bottom:0"><i></i><i></i><i></i><i></i></div>
      </div>`,
  },
  {
    id: 'bold',
    label: 'Bold',
    width: 1080,
    height: 1350,
    photoTop: 0.25,
    html: `
      <div class="t-bold">
        <div class="ph"></div>
        <div class="lines"></div>
        <div class="grab photo"></div>
        <div class="spine"></div>
        <div class="mast">GOSOSA</div>
        <div class="top"><div class="org"><img src="img/logo.png" alt="">Set 2016</div><span>Vol. 10 · Nov 2026</span></div>
        <div class="tag">I WILL BE PRESENT</div>
        <div class="name" data-name data-fit="780"></div>
        <div class="sub">The Class of 2016 is <em>coming home</em></div>
        <div class="base">
          <div class="date"><small>10th Anniversary Reunion</small>20–22.11.2026</div>
          <div class="barcode">${barcode}<div>GOSOSA 2016</div></div>
        </div>
      </div>`,
  },
];
