/**
 * ==============================================================================
 * 🎉 PROJECT     : Happy Birthday Animation
 * 📄 SCRIPT      : assets/js/main.js
 * 👨‍💻 AUTHOR      : WinandaDev
 * 📅 CREATED     : 25 August 2025
 * 💖 DEDICATION  : For my sister Kirana (Born 18 November 2010)
 * 🚀 DESCRIPTION : Core Animation Engine: Partikel kembang api interaktif, transisi
 *                  huruf bercahaya, fisika balon melayang, dan audio player.
 * ==============================================================================
 *
 * 📑 DAFTAR ISI (TABLE OF CONTENTS):
 * 1. CANVAS SETUP & CONFIGURATION   - Inisialisasi kanvas 2D & konfigurasi opsi
 * 2. CLASS: Letter                  - Siklus hidup karakter (kembang api -> teks -> balon)
 * 3. CLASS: Shard                   - Partikel pecahan ledakan kembang api & gravitasi
 * 4. GEOMETRY: generateBalloonPath  - Algoritma kurva Bezier bentuk balon
 * 5. RENDER LOOP: anim()            - Loop render kanvas 60 FPS (requestAnimationFrame)
 * 6. INITIALIZATION: initLetters()  - Kalkulasi posisi grid huruf responsif
 * 7. VIEWPORT & EVENT HANDLERS      - Event resize, orientasi layar, & proteksi klik kanan
 * 8. AUDIO CONTROLLER & GESTURE     - Manajemen audio, autoplay policy, & animasi tombol
 * 9. RESPONSIVE UI POSITIONING      - Penataan letak fixed tombol suara
 * ==============================================================================
 */

/* ==============================================================================
   1. CANVAS SETUP & CONFIGURATION
   ============================================================================== */

// Inisialisasi elemen kanvas dan konteks rendering 2D
let c = document.getElementById("c");
let w = (c.width = window.innerWidth),
  h = (c.height = window.innerHeight),
  ctx = c.getContext("2d"),
  hw = w / 2;
(hh = h / 2),
  (opts = {
    // --------------------------------------------------------------------------
    // [A] TIPOGRAFI & TATA LETAK TEKS
    // --------------------------------------------------------------------------
    strings: ["HAPPY", "BIRTHDAY!", "KIRANA"], // Baris teks ucapan yang ditampilkan
    charSize: 30,                               // Ukuran font teks (dalam pixel)
    charSpacing: 35,                            // Jarak horizontal antar karakter
    lineHeight: 40,                             // Jarak vertikal antar baris teks
    cx: w / 2,                                  // Titik pusat horizontal kanvas
    cy: h / 2,                                  // Titik pusat vertikal kanvas

    // --------------------------------------------------------------------------
    // [B] PARAMETER TRAJEKTORI KEMBANG API
    // --------------------------------------------------------------------------
    fireworkPrevPoints: 10,     // Panjang ekor jejak (trail points) kembang api
    fireworkBaseLineWidth: 5,   // Ketebalan dasar garis lintasan kembang api
    fireworkAddedLineWidth: 8,  // Variasi acak tambahan ketebalan garis
    fireworkSpawnTime: 200,     // Interval waktu jeda peluncuran kembang api
    fireworkBaseReachTime: 30,  // Waktu tempuh dasar mencapai target puncak
    fireworkAddedReachTime: 30, // Variasi waktu tempuh tambahan ke puncak

    // --------------------------------------------------------------------------
    // [C] PARAMETER FLASH & LINGKARAN LEDAKAN
    // --------------------------------------------------------------------------
    fireworkCircleBaseSize: 20,     // Radius dasar lingkaran ledakan kembang api
    fireworkCircleAddedSize: 10,    // Variasi radius tambahan lingkaran ledakan
    fireworkCircleBaseTime: 30,     // Durasi ekspansi lingkaran cahaya
    fireworkCircleAddedTime: 30,    // Variasi waktu ekspansi lingkaran cahaya
    fireworkCircleFadeBaseTime: 10, // Durasi dasar memudarnya kilatan cahaya (fade-out)
    fireworkCircleFadeAddedTime: 5, // Variasi waktu memudarnya kilatan cahaya

    // --------------------------------------------------------------------------
    // [D] PARAMETER PECAHAN PERCIKAN (SHARDS) & GRAVITASI
    // --------------------------------------------------------------------------
    fireworkBaseShards: 5,       // Jumlah dasar serpihan pecahan ledakan
    fireworkAddedShards: 5,      // Variasi tambahan jumlah pecahan
    fireworkShardPrevPoints: 3,  // Panjang ekor jejak serpihan percikan
    fireworkShardBaseVel: 4,     // Kecepatan lontaran dasar percikan
    fireworkShardAddedVel: 2,    // Variasi acak kecepatan lontaran
    fireworkShardBaseSize: 3,    // Ukuran dasar serpihan percikan
    fireworkShardAddedSize: 3,   // Variasi acak ukuran serpihan
    gravity: 0.1,                // Gaya gravitasi yang menarik serpihan ke bawah

    // --------------------------------------------------------------------------
    // [E] PARAMETER FISIKA & TRANSIFIKASI BALON
    // --------------------------------------------------------------------------
    upFlow: -0.1,                            // Daya apung / gaya dorong ke atas untuk balon
    letterContemplatingWaitTime: 380,        // Jeda waktu teks diam sebelum bertransformasi
    balloonSpawnTime: 20,                    // Jeda waktu kemunculan balon
    balloonBaseInflateTime: 10,              // Durasi dasar pengembangan balon (inflating)
    balloonAddedInflateTime: 10,             // Variasi durasi pengembangan balon
    balloonBaseSize: 20,                     // Radius ukuran dasar balon
    balloonAddedSize: 20,                    // Variasi tambahan ukuran balon
    balloonBaseVel: 0.3,                     // Kecepatan dasar melayang
    balloonAddedVel: 0.3,                    // Variasi acak kecepatan melayang
    balloonBaseRadian: -(Math.PI / 2 - 0.5), // Sudut arah terbang dasar balon
    balloonAddedRadian: -1,                  // Rentang variasi sudut radian terbang
  }),
  (calc = {
    // Menghitung lebar total string terpanjang untuk kalkulasi spektrum warna (hue)
    totalWidth:
      opts.charSpacing *
      Math.max(opts.strings[0].length, opts.strings[1].length),
  }),
  (Tau = Math.PI * 2),     // Konstanta keliling lingkaran (2 * PI radian = 360°)
  (TauQuarter = Tau / 4),  // Konstanta 90° dalam radian (PI / 2)
  (letters = []);          // Penampung instansiasi objek karakter Letter

// Menerapkan konfigurasi font global pada konteks kanvas
ctx.font = opts.charSize + "px Poppins";

/* ==============================================================================
   2. CLASS: Letter (PARTIKEL KARAKTER & SIKLUS HIDUP ANIMASI)
   ============================================================================== */

/**
 * Mewakili satu unit karakter dalam animasi ucapan selamat ulang tahun.
 * Mengontrol fase transisi:
 * - 'firework'    : Meluncur naik menuju koordinat target
 * - 'contemplate' : Ledakan kilatan cahaya & karakter teks terungkap
 * - 'balloon'     : Bertransformasi menjadi balon udara dan terbang menjauh
 * - 'done'        : Selesai keluar layar, siap untuk siklus reset berikutnya
 *
 * @constructor
 * @param {string} char - Simbol karakter huruf
 * @param {number} x - Posisi target horizontal (sumbu X)
 * @param {number} y - Posisi target vertikal (sumbu Y)
 */
function Letter(char, x, y) {
  // Offset pergeseran responsif agar posisi teks proporsional di berbagai layar
  let shiftY = h * 0.05;
  let shiftX = w * 0.05;
  let fireworkOffsetY = 50; // Jarak offset titik awal peluncuran kembang api

  this.char = char;
  this.x = x;
  this.y = y;

  // Offset posisi perataan teks (horizontal & vertikal centering)
  this.dx = -ctx.measureText(char).width / 2;
  this.dy = +opts.charSize / 2;

  // Titik koordinat awal dan target peluncuran kembang api
  this.fireworkStartX = 0 - shiftX;
  this.fireworkStartY = hh - shiftY + fireworkOffsetY;
  this.fireworkTargetX = x;
  this.fireworkTargetY = y;
  this.fireworkDx = this.fireworkTargetX - this.fireworkStartX;
  this.fireworkDy = this.fireworkTargetY - this.fireworkStartY;

  // Spektrum rona warna (hue) dinamis berdasarkan posisi horizontal karakter
  var hue = (x / calc.totalWidth) * 360;

  this.color = "hsl(hue,80%,50%)".replace("hue", hue);
  this.lightAlphaColor = "hsla(hue,80%,light%,alp)".replace("hue", hue);
  this.lightColor = "hsl(hue,80%,light%)".replace("hue", hue);
  this.alphaColor = "hsla(hue,80%,50%,alp)".replace("hue", hue);

  this.reset();
}

/**
 * Me-reset status awal karakter saat memulai siklus animasi baru
 */
Letter.prototype.reset = function () {
  this.phase = "firework";
  this.tick = 0;
  this.spawned = false;
  this.spawningTime = (opts.fireworkSpawnTime * Math.random()) | 0;
  this.reachTime =
    (opts.fireworkBaseReachTime + opts.fireworkAddedReachTime * Math.random()) |
    0;
  this.lineWidth =
    opts.fireworkBaseLineWidth + opts.fireworkAddedLineWidth * Math.random();
  this.prevPoints = [[this.fireworkStartX, this.fireworkStartY, 0]];
};

/**
 * Memperbarui frame (state update & render) karakter sesuai fase aktif
 */
Letter.prototype.step = function () {
  // ----------------------------------------------------------------------------
  // [FASE 1] PELUNCURAN KEMBANG API (FIREWORK TRAJECTORY)
  // ----------------------------------------------------------------------------
  if (this.phase === "firework") {
    if (!this.spawned) {
      ++this.tick;
      if (this.tick >= this.spawningTime) {
        this.tick = 0;
        this.spawned = true;
      }
    } else {
      ++this.tick;
      var linearProportion = this.tick / this.reachTime,
        armonicProportion = Math.sin(linearProportion * TauQuarter),
        x = this.fireworkStartX + linearProportion * this.fireworkDx,
        y = this.fireworkStartY + armonicProportion * this.fireworkDy;

      // Simpan jejak lintasan ekor kembang api
      if (this.prevPoints.length > opts.fireworkPrevPoints)
        this.prevPoints.shift();
      this.prevPoints.push([x, y, linearProportion * this.lineWidth]);

      // Menggambar garis ekor bergradasi transparansi
      var lineWidthProportion = 1 / (this.prevPoints.length - 1);
      for (var i = 1; i < this.prevPoints.length; ++i) {
        var point = this.prevPoints[i],
          point2 = this.prevPoints[i - 1];
        ctx.strokeStyle = this.alphaColor.replace(
          "alp",
          i / this.prevPoints.length
        );
        ctx.lineWidth = point[2] * lineWidthProportion * i;
        ctx.beginPath();
        ctx.moveTo(point[0], point[1]);
        ctx.lineTo(point2[0], point2[1]);
        ctx.stroke();
      }

      // Kembang api mencapai puncak target: transisi ke fase kontemplasi
      if (this.tick >= this.reachTime) {
        this.phase = "contemplate";
        this.x = this.fireworkTargetX;
        this.y = this.fireworkTargetY;

        this.circleFinalSize =
          opts.fireworkCircleBaseSize +
          opts.fireworkCircleAddedSize * Math.random();
        this.circleCompleteTime =
          (opts.fireworkCircleBaseTime +
            opts.fireworkCircleAddedTime * Math.random()) |
          0;
        this.circleCreating = true;
        this.circleFading = false;

        this.circleFadeTime =
          (opts.fireworkCircleFadeBaseTime +
            opts.fireworkCircleFadeAddedTime * Math.random()) |
          0;
        this.tick = 0;
        this.tick2 = 0;

        this.shards = [];

        // Menghasilkan pecahan ledakan secara radial
        var shardCount =
          (opts.fireworkBaseShards +
            opts.fireworkAddedShards * Math.random()) |
          0,
          angle = Tau / shardCount,
          cos = Math.cos(angle),
          sin = Math.sin(angle),
          x = 1,
          y = 0;

        for (var i = 0; i < shardCount; ++i) {
          var x1 = x;
          x = x * cos - y * sin;
          y = y * cos + x1 * sin;

          this.shards.push(new Shard(this.x, this.y, x, y, this.alphaColor));
        }
      }
    }
    // ----------------------------------------------------------------------------
    // [FASE 2] KONTEMPLASI / EFEK CAHAYA & PENAMPILAN TEKS (CONTEMPLATE)
    // ----------------------------------------------------------------------------
  } else if (this.phase === "contemplate") {
    ++this.tick;

    // Sub-fase 2A: Pembuatan & pemuaian lingkaran kilatan cahaya
    if (this.circleCreating) {
      ++this.tick2;
      var proportion = this.tick2 / this.circleCompleteTime,
        armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

      ctx.beginPath();
      ctx.fillStyle = this.lightAlphaColor
        .replace("light", 50 + 50 * proportion)
        .replace("alp", proportion);
      ctx.beginPath();
      ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
      ctx.fill();

      if (this.tick2 > this.circleCompleteTime) {
        this.tick2 = 0;
        this.circleCreating = false;
        this.circleFading = true;
      }
      // Sub-fase 2B: Kilatan cahaya memudar dan karakter teks mulai terlihat
    } else if (this.circleFading) {
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      ++this.tick2;
      var proportion = this.tick2 / this.circleFadeTime,
        armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;

      ctx.beginPath();
      ctx.fillStyle = this.lightAlphaColor
        .replace("light", 100)
        .replace("alp", 1 - armonic);
      ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
      ctx.fill();

      if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
      // Sub-fase 2C: Karakter teks menetap di posisinya dengan stabil
    } else {
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
    }

    // Perbarui pergerakan serpihan ledakan (shards)
    for (var i = 0; i < this.shards.length; ++i) {
      this.shards[i].step();

      if (!this.shards[i].alive) {
        this.shards.splice(i, 1);
        --i;
      }
    }

    // Transisi ke fase balon setelah waktu tunggu selesai
    if (this.tick > opts.letterContemplatingWaitTime) {
      this.phase = "balloon";

      this.tick = 0;
      this.spawning = true;
      this.spawnTime = (opts.balloonSpawnTime * Math.random()) | 0;
      this.inflating = false;
      this.inflateTime =
        (opts.balloonBaseInflateTime +
          opts.balloonAddedInflateTime * Math.random()) |
        0;
      this.size =
        (opts.balloonBaseSize + opts.balloonAddedSize * Math.random()) | 0;

      var rad =
        opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random(),
        vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random();

      this.vx = Math.cos(rad) * vel;
      this.vy = Math.sin(rad) * vel;
    }
    // ----------------------------------------------------------------------------
    // [FASE 3] TRANFORMASI MENJADI BALON & MELAYANG NAIK (BALLOON STAGE)
    // ----------------------------------------------------------------------------
  } else if (this.phase === "balloon") {
    ctx.strokeStyle = this.lightColor.replace("light", 80);

    // Sub-fase 3A: Karakter menunggu balon muncul
    if (this.spawning) {
      ++this.tick;
      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      if (this.tick >= this.spawnTime) {
        this.tick = 0;
        this.spawning = false;
        this.inflating = true;
      }
      // Sub-fase 3B: Balon mengembang secara perlahan di atas karakter
    } else if (this.inflating) {
      ++this.tick;

      var proportion = this.tick / this.inflateTime,
        x = (this.cx = this.x),
        y = (this.cy = this.y - this.size * proportion);

      ctx.fillStyle = this.alphaColor.replace("alp", proportion);
      ctx.beginPath();
      generateBalloonPath(x, y, this.size * proportion);
      ctx.fill();

      // Garis tali balon
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, this.y);
      ctx.stroke();

      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

      if (this.tick >= this.inflateTime) {
        this.tick = 0;
        this.inflating = false;
      }
      // Sub-fase 3C: Balon terbang melayang membawa karakter keluar dari layar
    } else {
      this.cx += this.vx;
      this.cy += this.vy += opts.upFlow;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      generateBalloonPath(this.cx, this.cy, this.size);
      ctx.fill();

      // Garis tali balon yang bergerak mengikuti balon
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy);
      ctx.lineTo(this.cx, this.cy + this.size);
      ctx.stroke();

      ctx.fillStyle = this.lightColor.replace("light", 70);
      ctx.fillText(this.char, this.cx + this.dx, this.cy + this.dy + this.size);

      // Cek apakah balon telah keluar dari batas kanvas (viewport)
      if (this.cy + this.size < -hh || this.cx < -hw || this.cy > hw)
        this.phase = "done";
    }
  }
};

/* ==============================================================================
   3. CLASS: Shard (PARTIKEL PECAHAN LEDAKAN KEMBANG API)
   ============================================================================== */

/**
 * Mewakili satu partikel pecahan ledakan kembang api dengan hukum gravitasi.
 *
 * @constructor
 * @param {number} x - Koordinat awal horizontal
 * @param {number} y - Koordinat awal vertikal
 * @param {number} vx - Komponen kecepatan horizontal awal
 * @param {number} vy - Komponen kecepatan vertikal awal
 * @param {string} color - Warna partikel (format template alpha HSLA)
 */
function Shard(x, y, vx, vy, color) {
  var vel =
    opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random();
  this.vx = vx * vel;
  this.vy = vy * vel;
  this.x = x;
  this.y = y;
  this.prevPoints = [[x, y]];
  this.color = color;
  this.alive = true;
  this.size =
    opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random();
}

/**
 * Memperbarui posisi partikel pecahan kembang api dan menggambar jejak ekornya
 */
Shard.prototype.step = function () {
  this.x += this.vx;
  this.y += this.vy += opts.gravity; // Aplikasi percepatan gravitasi ke bawah

  if (this.prevPoints.length > opts.fireworkShardPrevPoints)
    this.prevPoints.shift();

  this.prevPoints.push([this.x, this.y]);

  var lineWidthProportion = this.size / this.prevPoints.length;

  // Menggambar lintasan jejak ekor pecahan
  for (var k = 0; k < this.prevPoints.length - 1; ++k) {
    var point = this.prevPoints[k],
      point2 = this.prevPoints[k + 1];

    ctx.strokeStyle = this.color.replace("alp", k / this.prevPoints.length);
    ctx.lineWidth = k * lineWidthProportion;
    ctx.beginPath();
    ctx.moveTo(point[0], point[1]);
    ctx.lineTo(point2[0], point2[1]);
    ctx.stroke();
  }

  // Jika partikel telah jatuh melampaui batas bawah kanvas, nonaktifkan
  if (this.prevPoints[0][1] > hh) this.alive = false;
};

/* ==============================================================================
   4. GEOMETRY HELPER: generateBalloonPath
   ============================================================================== */

/**
 * Menggambar jalur siluet balon udara realistis dengan kurva Bezier ganda.
 *
 * @param {number} x - Titik sumbu X dasar simpul balon
 * @param {number} y - Titik sumbu Y dasar simpul balon
 * @param {number} size - Skala dimensi balon
 */
function generateBalloonPath(x, y, size) {
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x - size / 2,
    y - size / 2,
    x - size / 4,
    y - size,
    x,
    y - size
  );
  ctx.bezierCurveTo(x + size / 4, y - size, x + size / 2, y - size / 2, x, y);
}

/* ==============================================================================
   5. RENDER LOOP: anim()
   ============================================================================== */

/**
 * Loop render utama (60 FPS) berbasis requestAnimationFrame.
 * Membersihkan kanvas setiap frame, memperbarui posisi partikel,
 * dan memulai ulang animasi ketika seluruh karakter telah selesai ('done').
 */
function anim() {
  window.requestAnimationFrame(anim);

  // Reset transform matriks dan bersihkan panggung kanvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a0e2c"; // Warna latar belakang kanvas (deep midnight blue)
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(hw, hh); // Pindahkan origin (0,0) ke tengah-tengah kanvas

  var done = true;
  for (var l = 0; l < letters.length; ++l) {
    letters[l].step();
    if (letters[l].phase !== "done") done = false;
  }
  ctx.restore();

  // Reset seluruh karakter jika siklus animasi telah selesai
  if (done) for (var l = 0; l < letters.length; ++l) letters[l].reset();
}

/* ==============================================================================
   6. INITIALIZATION: initLetters()
   ============================================================================== */

/**
 * Menghitung dan menginisialisasi posisi koordinat huruf secara responsif
 * agar teks tersusun rapi di bagian tengah layar.
 */
function initLetters() {
  letters.length = 0;
  let shiftY = h * 0.05;
  let shiftX = w * 0.05;

  for (let i = 0; i < opts.strings.length; ++i) {
    for (var j = 0; j < opts.strings[i].length; ++j) {
      letters.push(
        new Letter(
          opts.strings[i][j],
          j * opts.charSpacing +
          opts.charSpacing / 2 -
          (opts.strings[i].length * opts.charSize) / 2 - shiftX,
          i * opts.lineHeight +
          opts.lineHeight / 2 -
          (opts.strings.length * opts.lineHeight) / 2 - shiftY
        )
      );
    }
  }
}

// Eksekusi inisialisasi awal dan mulai loop animasi
initLetters();
anim();

/* ==============================================================================
   7. VIEWPORT & EVENT HANDLERS
   ============================================================================== */

// Handler saat ukuran jendela browser berubah (window resize)
window.addEventListener("resize", function () {
  w = c.width = window.innerWidth;
  h = c.height = window.innerHeight;
  hw = w / 2;
  hh = h / 2;
  ctx.font = opts.charSize + "px Poppins";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  initLetters();
  positionElements();
});

// Handler perubahan orientasi perangkat mobile (portrait / landscape)
window.addEventListener("orientationchange", function () {
  setTimeout(function () {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    hw = w / 2;
    hh = h / 2;
    ctx.font = opts.charSize + "px Poppins";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    initLetters();
    positionElements();
  }, 300); // Penundaan 300ms agar browser selesai menghitung dimensi viewport baru
});

// Posisikan elemen UI segera setelah struktur DOM siap
window.addEventListener('DOMContentLoaded', positionElements);

// Mencegah menu konteks klik kanan untuk menjaga tampilan interaktif yang bersih
document.addEventListener('contextmenu', function (e) {
  if (e.ctrlKey || e.metaKey) return; // Izinkan jika menekan tombol pintas inspeksi
  e.preventDefault();
});

/* ==============================================================================
   8. AUDIO CONTROLLER & USER INTERACTION
   ============================================================================== */

// Referensi elemen tombol dan elemen audio HTML5
const tombol = document.querySelector('.Tombol');
const audio = document.getElementById('audioTombol');
const icon = document.querySelector('.Tombol img');

// Mencegah menu konteks / tekan lama (long-press) pada ikon dan kontrol audio
icon.addEventListener('contextmenu', function (e) {
  if (e.ctrlKey || e.metaKey) return;
  e.preventDefault();
});

tombol.addEventListener('contextmenu', function (e) {
  if (e.ctrlKey || e.metaKey) return;
  e.preventDefault();
});

audio.addEventListener('contextmenu', function (e) {
  if (e.ctrlKey || e.metaKey) return;
  e.preventDefault();
});

// Flags status audio & interaksi
let audioVisible = false;           // Apakah kontrol audio sedang ditampilkan
let audioStartedByGesture = false;  // Penanda lagu sudah mulai diputar oleh interaksi pertama
let isDebouncing = false;           // Pencegah multiple click (spamming)
let isAnimatingTombol = false;      // Status animasi pergerakan tombol

/**
 * Memulai pemutaran audio saat pengguna pertama kali berinteraksi dengan layar
 * (Mematuhi kebijakan autoplay browser modern / Autoplay Policy).
 */
function playAudioOnUserGesture() {
  if (!audioVisible && !audioStartedByGesture) {
    audio.play();
    audioStartedByGesture = true;
  }
}

// Listener sentuhan pertama pada perangkat mobile
window.addEventListener('touchstart', function (e) {
  if (!tombol.contains(e.target) && e.target !== audio) {
    playAudioOnUserGesture();
  }
}, { once: true });

// Listener klik pertama pada perangkat desktop
window.addEventListener('click', function (e) {
  if (!tombol.contains(e.target) && e.target !== audio) {
    playAudioOnUserGesture();
  }
}, { once: true });

// Memastikan kontrol audio aktif dan mencegah klik kanan pada kontrol
audio.setAttribute('controls', '');
audio.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});

// Interaksi klik pada tombol suara bulat (toggle audio controls & playback)
tombol.addEventListener('click', function (e) {
  if (isDebouncing || isAnimatingTombol) return; // Cegah klik berulang saat animasi berlangsung
  isDebouncing = true;
  isAnimatingTombol = true;
  setTimeout(() => { isDebouncing = false; }, 300);

  if (!audioVisible) {
    // Tampilkan kontrol audio dengan animasi naik
    audio.play();
    audio.style.display = 'block';
    audio.focus();
    tombol.style.transform = 'translateY(20px)';
    setTimeout(() => {
      tombol.style.transform = 'translateY(0)';
      audioVisible = true;
      audioStartedByGesture = true;
      isAnimatingTombol = false;
    }, 200);
  } else {
    // Sembunyikan kontrol audio dengan animasi turun
    audio.style.display = 'none';
    tombol.style.transform = 'translateY(0)';
    setTimeout(() => {
      tombol.style.transform = 'translateY(20px)';
      audioVisible = false;
      isAnimatingTombol = false;
    }, 200);
  }
});

/* ==============================================================================
   9. RESPONSIVE UI POSITIONING: positionElements()
   ============================================================================== */

/**
 * Menempatkan posisi tombol suara secara fixed
 * agar posisinya konsisten di berbagai ukuran layar dan orientasi.
 */
function positionElements() {
  if (tombol) {
    tombol.style.position = 'fixed';
    tombol.style.left = '20px';
    tombol.style.bottom = '40px';
    tombol.style.top = '';
    tombol.style.right = '';
  }
}