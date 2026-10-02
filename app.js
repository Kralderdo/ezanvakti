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
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("API hatası: " + response.status);
  }

  return await response.json();
}


/* =========================
   TARİH
========================= */

function updateDate() {
  if (!dateBox) return;

  dateBox.textContent =
    new Date().toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}


/* =========================
   TÜRKİYE - 81 İL
========================= */

async function loadTurkey() {

  city.disabled = true;
  district.disabled = true;

  city.innerHTML =
    "<option>İller yükleniyor…</option>";

  district.innerHTML =
    "<option>İlçe bekleniyor…</option>";

  try {

    const result = await getJSON(
      `${API}/locations/states?countryId=${TURKEY_ID}`
    );

    const states =
      Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

    /*
     * SADECE TÜRKİYE
     * country_id = 2
     */

    const turkeyStates = states.filter(item => {

      const countryId =
        item.country_id ??
        item.countryId ??
        item.country?.id;

      return String(countryId) === "2";
    });

    if (!turkeyStates.length) {
      throw new Error(
        "Türkiye illeri bulunamadı."
      );
    }

    city.innerHTML = "";

    turkeyStates
      .sort((a, b) =>
        String(
          a.name ||
          a.name_tr ||
          ""
        ).localeCompare(
          String(
            b.name ||
            b.name_tr ||
            ""
          ),
          "tr"
        )
      )
      .forEach(item => {

        const id =
          item._id ??
          item.id ??
          item.stateId;

        const name =
          item.name ??
          item.name_tr ??
          item.name_en ??
          item.title;

        if (!id || !name) return;

        const option =
          document.createElement("option");

        option.value = String(id);
        option.textContent =
          formatName(name);

        city.appendChild(option);
      });

    city.disabled = false;

    /*
     * İlk il
     */

    if (city.options.length > 0) {
      city.selectedIndex = 0;
      await loadDistricts();
    }

  } catch (error) {

    console.error(
      "İller yüklenemedi:",
      error
    );

    city.innerHTML =
      "<option>İller yüklenemedi</option>";

    district.innerHTML =
      "<option>Tekrar deneyin</option>";
  }
}


/* =========================
   TÜM İLÇELER
========================= */

async function loadDistricts() {

  const stateId = city.value;

  if (!stateId) return;

  district.disabled = true;

  district.innerHTML =
    "<option>İlçeler yükleniyor…</option>";

  try {

    const result = await getJSON(
      `${API}/locations/districts?stateId=${encodeURIComponent(stateId)}`
    );

    const districts =
      Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

    /*
     * SADECE TÜRKİYE İLÇELERİ
     */

    const turkeyDistricts =
      districts.filter(item => {

        const countryId =
          item.country_id ??
          item.countryId ??
          item.country?.id;

        /*
         * API bazı cevaplarda country_id
         * göndermeyebilir.
         * O durumda ilçeyi bırakıyoruz.
         */

        return (
          countryId === undefined ||
          countryId === null ||
          String(countryId) === "2"
        );
      });

    if (!turkeyDistricts.length) {
      throw new Error(
        "Bu ile ait ilçe bulunamadı."
      );
    }

    district.innerHTML = "";

    turkeyDistricts
      .sort((a, b) =>
        String(
          a.name ||
          a.name_tr ||
          ""
        ).localeCompare(
          String(
            b.name ||
            b.name_tr ||
            ""
          ),
          "tr"
        )
      )
      .forEach(item => {

        const id =
          item._id ??
          item.id ??
          item.districtId;

        const name =
          item.name ??
          item.name_tr ??
          item.name_en ??
          item.title;

        if (!id || !name) return;

        const option =
          document.createElement("option");

        option.value = String(id);
        option.textContent =
          formatName(name);

        district.appendChild(option);
      });

    district.disabled = false;

    if (district.options.length > 0) {
      district.selectedIndex = 0;
    }

    updateLocation();

    await loadPrayerTimes();

  } catch (error) {

    console.error(
      "İlçeler yüklenemedi:",
      error
    );

    district.innerHTML =
      "<option>İlçeler yüklenemedi</option>";

    district.disabled = true;
  }
}


/* =========================
   NAMAZ VAKİTLERİ
========================= */

async function loadPrayerTimes() {

  const districtId = district.value;

  if (!districtId) return;

  showLoading();

  try {

    const now = new Date();

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
        result.data.find(item =>
          String(
            item.date ||
            item.tarih ||
            ""
          ).startsWith(today)
        ) ||
        result.data[0];

    } else {

      data =
        result.data ||
        result;
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
          "Imsak",
          "fajr",
          "Fajr"
        ]),

      gunes:
        findTime(times, [
          "gunes",
          "Gunes",
          "sunrise",
          "Sunrise"
        ]),

      ogle:
        findTime(times, [
          "ogle",
          "Ogle",
          "dhuhr",
          "Dhuhr"
        ]),

      ikindi:
        findTime(times, [
          "ikindi",
          "Ikindi",
          "asr",
          "Asr"
        ]),

      aksam:
        findTime(times, [
          "aksam",
          "Aksam",
          "maghrib",
          "Maghrib"
        ]),

      yatsi:
        findTime(times, [
          "yatsi",
          "Yatsi",
          "isha",
          "Isha"
        ])
    };

    renderTimes();
    updateLocation();

  } catch (error) {

    console.error(
      "Vakit hatası:",
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

  if (!data) return null;

  for (const key of keys) {

    if (
      data[key] !== undefined &&
      data[key] !== null &&
      String(data[key]).trim() !== ""
    ) {
      return String(data[key]).trim();
    }
  }

  return null;
}


/* =========================
   VAKİTLER
========================= */

function renderTimes() {

  if (!currentTimes) return;

  timesBox.innerHTML =
    names.map(([key, name]) => {

      const value =
        currentTimes[key] || "--:--";

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

    }).join("");

  const iftar =
    document.getElementById("iftar");

  const sahur =
    document.getElementById("sahur");

  if (iftar) {
    iftar.textContent =
      currentTimes.aksam || "--:--";
  }

  if (sahur) {
    sahur.textContent =
      currentTimes.imsak || "--:--";
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

  const now = new Date();

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

    const first = names[0];

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

  if (!next) return;

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
   SAAT
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
    districtName
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

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {

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

  if (!navigator.geolocation) {

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

    () => {
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
   DEĞİŞİKLİKLER
========================= */

city.addEventListener(
  "change",
  async () => {
    await loadDistricts();
    updateLocation();
  }
);


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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
   İSİM
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
