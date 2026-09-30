const API = "https://ezanvakti.imsakiyem.com/api";

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");

const locationTitle = document.getElementById("location");
const dateBox = document.getElementById("date");
const nextName = document.getElementById("nextName");
const countdownBox = document.getElementById("countdown");

const notifyButton =
  document.getElementById("notify");

const qiblaButton =
  document.getElementById("qiblaBtn");

const qiblaBox =
  document.getElementById("qibla");

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
let notificationEnabled = false;


/* =========================
   API
   ========================= */

async function getJSON(url) {

  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      "Veri alınamadı: " +
      response.status
    );
  }

  return response.json();
}


/* =========================
   TARİH
   ========================= */

function updateDate() {

  const now = new Date();

  dateBox.textContent =
    now.toLocaleDateString(
      "tr-TR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
}


/* =========================
   TÜRKİYE / İLLER
   ========================= */

async function loadTurkey() {

  city.disabled = true;
  district.disabled = true;

  city.innerHTML =
    "<option>İller yükleniyor…</option>";

  district.innerHTML =
    "<option>İlçe bekleniyor…</option>";

  try {

    const countries =
      await getJSON(
        `${API}/locations/countries`
      );

    const list =
      countries.data || [];

    const turkey =
      list.find(item => {

        const name =
          String(
            item.name || ""
          ).toLowerCase();

        return (
          name.includes("türkiye") ||
          name.includes("turkey")
        );
      });

    if (!turkey) {
      throw new Error(
        "Türkiye bulunamadı."
      );
    }

    const states =
      await getJSON(
        `${API}/locations/states?countryId=${turkey.id}`
      );

    const stateList =
      states.data || [];

    if (!stateList.length) {
      throw new Error(
        "İller bulunamadı."
      );
    }

    city.innerHTML =
      stateList
        .map(item => `
          <option value="${item.id}">
            ${escapeHTML(item.name)}
          </option>
        `)
        .join("");

    city.disabled = false;

    await loadDistricts();

  } catch (error) {

    console.error(error);

    city.innerHTML =
      "<option>İller yüklenemedi</option>";

    district.innerHTML =
      "<option>Tekrar deneyin</option>";

  }

}


/* =========================
   İLÇELER
   ========================= */

async function loadDistricts() {

  const stateId =
    city.value;

  if (!stateId) {
    return;
  }

  district.disabled = true;

  district.innerHTML =
    "<option>İlçeler yükleniyor…</option>";

  try {

    const result =
      await getJSON(
        `${API}/locations/districts?stateId=${stateId}`
      );

    const list =
      result.data || [];

    if (!list.length) {
      throw new Error(
        "İlçe bulunamadı."
      );
    }

    district.innerHTML =
      list
        .map(item => `
          <option value="${item.id}">
            ${escapeHTML(item.name)}
          </option>
        `)
        .join("");

    district.disabled = false;

    await loadPrayerTimes();

  } catch (error) {

    console.error(error);

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

  if (!districtId) {
    return;
  }

  showLoading();

  try {

    const result =
      await getJSON(
        `${API}/prayer-times/${districtId}/daily`
      );

    const data =
      Array.isArray(result.data)
        ? result.data[0]
        : result.data;

    if (!data) {
      throw new Error(
        "Vakit bulunamadı."
      );
    }

    currentTimes = {

      imsak:
        findTime(
          data,
          [
            "fajr",
            "imsak",
            "Imsak"
          ]
        ),

      gunes:
        findTime(
          data,
          [
            "sunrise",
            "gunes",
            "Gunes"
          ]
        ),

      ogle:
        findTime(
          data,
          [
            "dhuhr",
            "ogle",
            "Ogle"
          ]
        ),

      ikindi:
        findTime(
          data,
          [
            "asr",
            "ikindi",
            "Asr"
          ]
        ),

      aksam:
        findTime(
          data,
          [
            "maghrib",
            "aksam",
            "Aksam"
          ]
        ),

      yatsi:
        findTime(
          data,
          [
            "isha",
            "yatsi",
            "Yatsi"
          ]
        )

    };

    renderTimes();

    updateLocation();

  } catch (error) {

    console.error(error);

    timesBox.innerHTML = `
      <div class="error-card">
        <span>⚠️</span>
        <b>Vakitler alınamadı</b>
        <small>
          İnternet bağlantınızı kontrol edin.
        </small>
      </div>
    `;

  }

}


/* =========================
   VAKİT AL
   ========================= */

function findTime(data, keys) {

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
   EKRANA YAZ
   ========================= */

function renderTimes() {

  if (!currentTimes) {
    return;
  }

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


  document.getElementById(
    "iftar"
  ).textContent =
    currentTimes.aksam ||
    "--:--";


  document.getElementById(
    "sahur"
  ).textContent =
    currentTimes.imsak ||
    "--:--";


  startCountdown();

}


/* =========================
   SONRAKİ VAKİT
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


/* =========================
   GERİ SAYIM
   ========================= */

function updateCountdown() {

  if (!currentTimes) {
    return;
  }

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

    nextName.textContent = "—";
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
   SAAT ÇEVİR
   ========================= */

function timeToSeconds(value) {

  if (!value) {
    return null;
  }

  const match =
    String(value).match(
      /(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

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
   KONUM BAŞLIĞI
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

  /*
   * Her 30 dakikada API'den
   * tekrar güncel veri alınır.
   */
  refreshTimer =
    setInterval(
      loadPrayerTimes,
      30 * 60 * 1000
    );

}


/* =========================
   BİLDİRİM
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


    notificationEnabled = true;

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

    console.error(error);

  }

}


notifyButton.addEventListener(
  "click",
  enableNotifications
);


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


      /*
       * Kâbe koordinatları
       */
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

      console.error(error);

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
   SEÇİMLER
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
   BAŞLAT
   ========================= */

updateDate();

loadTurkey();

startAutoRefresh();
