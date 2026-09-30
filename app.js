const API = "https://ezanvakti.imsakiyem.com/api";

const TURKEY_ID = "2";

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");

const locationTitle = document.getElementById("location");
const dateBox = document.getElementById("date");
const nextName = document.getElementById("nextName");
const countdownBox = document.getElementById("countdown");

const notifyButton = document.getElementById("notify");
const qiblaButton = document.getElementById("qiblaBtn");
const qiblaBox = document.getElementById("qibla");

const names = [
  ["imsak", "İmsak"],
  ["gunes", "Güneş"],
  ["ogle", "Öğle"],
  ["ikindi", "İkindi"],
  ["aksam", "Akşam"],
  ["yatsi", "Yatsı"]
];

let currentTimes = null;
let countdownTimer = null;
let refreshTimer = null;


/* =========================
   API
========================= */

async function getJSON(url) {
  console.log("API:", url);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      "API hatası: " + response.status
    );
  }

  return await response.json();
}


/* =========================
   TARİH
========================= */

function updateDate() {
  const now = new Date();

  dateBox.textContent =
    now.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}


/* =========================
   TÜRKİYE İLLERİ
========================= */

async function loadTurkey() {

  city.disabled = true;
  district.disabled = true;

  city.innerHTML =
    "<option>İller yükleniyor…</option>";

  district.innerHTML =
    "<option>İlçe bekleniyor…</option>";

  try {

    /*
     * Türkiye ID'si API'de 2.
     * Ülkeler endpoint'ini ayrıca çağırmıyoruz.
     */

    const result = await getJSON(
      `${API}/locations/states?countryId=${TURKEY_ID}`
    );

    const stateList =
      Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

    if (!stateList.length) {
      throw new Error("İller bulunamadı.");
    }

    city.innerHTML = "";

    stateList.forEach(item => {

      const id =
        item.id ??
        item._id;

      const name =
        item.name ||
        item.name_tr ||
        item.name_en ||
        "İl";

      if (!id) return;

      const option =
        document.createElement("option");

      option.value = id;
      option.textContent =
        formatName(name);

      city.appendChild(option);
    });

    city.disabled = false;

    await loadDistricts();

  } catch (error) {

    console.error(
      "İller yüklenirken hata:",
      error
    );

    city.innerHTML =
      "<option>İller yüklenemedi</option>";

    district.innerHTML =
      "<option>Tekrar deneyin</option>";

    locationTitle.textContent =
      "Türkiye";

  }
}


/* =========================
   İLÇELER
========================= */

async function loadDistricts() {

  const stateId =
    city.value;

  if (!stateId) return;

  district.disabled = true;

  district.innerHTML =
    "<option>İlçeler yükleniyor…</option>";

  try {

    const result =
      await getJSON(
        `${API}/locations/districts?stateId=${encodeURIComponent(stateId)}`
      );

    const list =
      Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

    if (!list.length) {
      throw new Error(
        "İlçe bulunamadı."
      );
    }

    district.innerHTML = "";

    list.forEach(item => {

      const id =
        item.id ??
        item._id;

      const name =
        item.name ||
        item.name_tr ||
        item.name_en ||
        "İlçe";

      if (!id) return;

      const option =
        document.createElement("option");

      option.value = id;
      option.textContent =
        formatName(name);

      district.appendChild(option);
    });

    district.disabled = false;

    updateLocation();

    await loadPrayerTimes();

  } catch (error) {

    console.error(
      "İlçeler yüklenirken hata:",
      error
    );

    district.innerHTML =
      "<option>İlçeler yüklenemedi</option>";
  }
}


/* =========================
   NAMAZ VAKİTLERİ
========================= */

async function loadPrayerTimes() {

  const districtId =
    district.value;

  if (!districtId) return;

  showLoading();

  try {

    /*
     * Türkiye'de güncel tarih.
     */

    const now =
      new Date();

    const today =
      now.getFullYear() +
      "-" +
      String(
        now.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        now.getDate()
      ).padStart(2, "0");

    const url =
      `${API}/prayer-times/${encodeURIComponent(
        districtId
      )}/daily?startDate=${today}&endDate=${today}`;

    const result =
      await getJSON(url);

    let data = null;

    if (Array.isArray(result.data)) {

      data =
        result.data.find(item => {

          const date =
            String(
              item.date ||
              item.tarih ||
              ""
            );

          return date.startsWith(today);

        }) ||
        result.data[0];

    } else {

      data =
        result.data;

    }

    if (!data) {
      throw new Error(
        "Bugünün vakitleri bulunamadı."
      );
    }

    const times =
      data.times ||
      data;

    currentTimes = {

      imsak:
        findTime(times, [
          "imsak",
          "fajr",
          "Imsak"
        ]),

      gunes:
        findTime(times, [
          "gunes",
          "Gunes",
          "sunrise"
        ]),

      ogle:
        findTime(times, [
          "ogle",
          "Ogle",
          "dhuhr"
        ]),

      ikindi:
        findTime(times, [
          "ikindi",
          "Asr",
          "asr"
        ]),

      aksam:
        findTime(times, [
          "aksam",
          "Aksam",
          "maghrib"
        ]),

      yatsi:
        findTime(times, [
          "yatsi",
          "Yatsi",
          "isha"
        ])
    };

    renderTimes();
    updateLocation();

  } catch (error) {

    console.error(
      "Namaz vakitleri hatası:",
      error
    );

    timesBox.innerHTML = `
      <div class="error-card">
        <span>⚠️</span>
        <b>Vakitler alınamadı</b>
        <small>
          ${escapeHTML(error.message)}
        </small>
      </div>
    `;
  }
}


/* =========================
   VAKİT BUL
========================= */

function findTime(data, keys) {

  for (const key of keys) {

    if (
      data &&
      data[key] !== undefined &&
      data[key] !== null &&
      String(data[key]).trim() !== ""
    ) {

      return String(
        data[key]
      ).trim();
    }
  }

  return null;
}


/* =========================
   VAKİTLERİ GÖSTER
========================= */

function renderTimes() {

  if (!currentTimes) return;

  timesBox.innerHTML =
    names
      .map(([key, name]) => {

        const value =
          currentTimes[key] ||
          "--:--";

        return `
          <div
            class="time"
            data-time="${key}"
          >
            <span>${name}</span>
            <strong>
              ${escapeHTML(value)}
            </strong>
          </div>
        `;
      })
      .join("");

  const iftar =
    document.getElementById("iftar");

  const sahur =
    document.getElementById("sahur");

  if (iftar) {
    iftar.textContent =
      currentTimes.aksam ||
      "--:--";
  }

  if (sahur) {
    sahur.textContent =
      currentTimes.imsak ||
      "--:--";
  }

  startCountdown();
}


/* =========================
   GERİ SAYIM
========================= */

function startCountdown() {

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  updateCountdown();

  countdownTimer =
    setInterval(
      updateCountdown,
      1000
    );
}


function updateCountdown() {

  if (!currentTimes) return;

  const now =
    new Date();

  const currentSeconds =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  let next = null;

  for (
    const [key, name] of names
  ) {

    const seconds =
      timeToSeconds(
        currentTimes[key]
      );

    if (
      seconds !== null &&
      seconds > currentSeconds
    ) {

      next = {
        key,
        name,
        seconds
      };

      break;
    }
  }

  if (!next) {

    const first =
      names[0];

    const firstSeconds =
      timeToSeconds(
        currentTimes[first[0]]
      );

    if (firstSeconds !== null) {

      next = {
        key: first[0],
        name: "Yarın İmsak",
        seconds:
          firstSeconds + 86400
      };
    }
  }

  if (!next) {

    nextName.textContent =
      "—";

    countdownBox.textContent =
      "--:--:--";

    return;
  }

  nextName.textContent =
    next.name;

  let remaining =
    next.seconds -
    currentSeconds;

  if (remaining < 0) {
    remaining += 86400;
  }

  const hours =
    Math.floor(
      remaining / 3600
    );

  const minutes =
    Math.floor(
      (remaining % 3600) / 60
    );

  const seconds =
    remaining % 60;

  countdownBox.textContent =
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  document
    .querySelectorAll(".time")
    .forEach(element => {

      element.classList.toggle(
        "current",
        element.dataset.time ===
          next.key
      );

    });

  updateDate();
}


/* =========================
   SAATİ SANİYEYE ÇEVİR
========================= */

function timeToSeconds(value) {

  if (!value) return null;

  const match =
    String(value).match(
      /(\d{1,2}):(\d{2})/
    );

  if (!match) return null;

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    hours * 3600 +
    minutes * 60
  );
}


/* =========================
   KONUM
========================= */

function updateLocation() {

  const cityName =
    city.options[
      city.selectedIndex
    ]?.textContent.trim() || "";

  const districtName =
    district.options[
      district.selectedIndex
    ]?.textContent.trim() || "";

  if (
    cityName &&
    districtName &&
    !cityName.includes("yüklen") &&
    !districtName.includes("yüklen") &&
    !districtName.includes("beklen") &&
    !districtName.includes("Tekrar")
  ) {

    locationTitle.textContent =
      `${cityName} / ${districtName}`;

  } else if (cityName) {

    locationTitle.textContent =
      cityName;

  } else {

    locationTitle.textContent =
      "Türkiye";
  }
}


/* =========================
   OTOMATİK GÜNCELLEME
========================= */

function startAutoRefresh() {

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer =
    setInterval(
      loadPrayerTimes,
      30 * 60 * 1000
    );
}


/* =========================
   BİLDİRİMLER
========================= */

async function enableNotifications() {

  if (!("Notification" in window)) {

    alert(
      "Bu tarayıcı bildirimleri desteklemiyor."
    );

    return;
  }

  try {

    const permission =
      await Notification.requestPermission();

    if (
      permission !== "granted"
    ) {

      alert(
        "Bildirim izni verilmedi."
      );

      return;
    }

    notifyButton.classList.add(
      "enabled"
    );

    notifyButton.textContent =
      "🔔 Bildirimler Açık";

    new Notification(
      "Ezan Vakti",
      {
        body:
          "Bildirimler başarıyla açıldı."
      }
    );

  } catch (error) {

    console.error(
      "Bildirim hatası:",
      error
    );
  }
}


if (notifyButton) {

  notifyButton.addEventListener(
    "click",
    enableNotifications
  );
}


/* =========================
   KIBLE
========================= */

function calculateQibla() {

  if (
    !navigator.geolocation
  ) {

    qiblaBox.textContent =
      "Konum desteklenmiyor";

    return;
  }

  qiblaBox.textContent =
    "Konum alınıyor…";

  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      const kaabaLat =
        21.422487;

      const kaabaLng =
        39.826206;

      const lat1 =
        latitude *
        Math.PI / 180;

      const lat2 =
        kaabaLat *
        Math.PI / 180;

      const deltaLng =
        (
          kaabaLng -
          longitude
        ) *
        Math.PI / 180;

      const y =
        Math.sin(deltaLng);

      const x =
        Math.cos(lat1) *
          Math.sin(lat2) -
        Math.sin(lat1) *
          Math.cos(lat2) *
          Math.cos(deltaLng);

      let bearing =
        Math.atan2(y, x) *
        180 /
        Math.PI;

      bearing =
        (bearing + 360) % 360;

      qiblaBox.textContent =
        `${Math.round(bearing)}°`;

    },

    error => {

      console.error(
        "Konum hatası:",
        error
      );

      qiblaBox.textContent =
        "Konum alınamadı";
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}


if (qiblaButton) {

  qiblaButton.addEventListener(
    "click",
    calculateQibla
  );
}


/* =========================
   İL DEĞİŞİNCE
========================= */

city.addEventListener(
  "change",
  async () => {

    await loadDistricts();

    updateLocation();
  }
);


/* =========================
   İLÇE DEĞİŞİNCE
========================= */

district.addEventListener(
  "change",
  async () => {

    await loadPrayerTimes();

    updateLocation();
  }
);


/* =========================
   GÜVENLİ HTML
========================= */

function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================
   YÜKLENİYOR
========================= */

function showLoading() {

  timesBox.innerHTML = `
    <div class="loading-card">
      <span>🕌</span>
      <b>Vakitler yükleniyor…</b>
      <small>
        Güncel bilgiler getiriliyor
      </small>
    </div>
  `;
}


/* =========================
   İSİM DÜZELTME
========================= */

function formatName(name) {

  return String(name)
    .toLocaleLowerCase("tr-TR")
    .replace(
      /(^|\s)\S/g,
      letter =>
        letter.toLocaleUpperCase("tr-TR")
    );
}


/* =========================
   BAŞLAT
========================= */

updateDate();
loadTurkey();
startAutoRefresh();
