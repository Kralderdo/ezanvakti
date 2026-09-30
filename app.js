const API = "https://ezanvakti.imsakiyem.com/api";

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

async function getJSON(url) {
  const response = await fetch(url, {
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

function updateDate() {
  const now = new Date();

  dateBox.textContent = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

async function loadTurkey() {
  city.disabled = true;
  district.disabled = true;

  city.innerHTML = "<option>İller yükleniyor…</option>";
  district.innerHTML = "<option>İlçe bekleniyor…</option>";

  try {
    const countries = await getJSON(
      `${API}/locations/countries`
    );

    const countryList =
      Array.isArray(countries.data)
        ? countries.data
        : Array.isArray(countries)
        ? countries
        : [];

    const turkey = countryList.find(item => {
      const name = String(
        item.name ||
        item.name_tr ||
        item.name_en ||
        ""
      )
        .toLowerCase()
        .trim();

      return (
        name === "türkiye" ||
        name === "turkiye" ||
        name === "türkiye" ||
        name === "turkey"
      );
    });

    if (!turkey) {
      throw new Error("Türkiye bulunamadı.");
    }

    const turkeyId = turkey.id ?? turkey._id;

    if (!turkeyId) {
      throw new Error("Türkiye ID bulunamadı.");
    }

    const states = await getJSON(
      `${API}/locations/states?countryId=${encodeURIComponent(turkeyId)}`
    );

    const stateList =
      Array.isArray(states.data)
        ? states.data
        : Array.isArray(states)
        ? states
        : [];

    if (!stateList.length) {
      throw new Error("İller bulunamadı.");
    }

    city.innerHTML = "";

    stateList.forEach(item => {
      const id = item.id ?? item._id;

      const name =
        item.name ||
        item.name_tr ||
        item.name_en ||
        "İl";

      if (!id) return;

      const option = document.createElement("option");

      option.value = id;
      option.textContent = formatName(name);

      city.appendChild(option);
    });

    city.disabled = false;

    await loadDistricts();

  } catch (error) {
    console.error("İller yüklenirken hata:", error);

    city.innerHTML =
      "<option>İller yüklenemedi</option>";

    district.innerHTML =
      "<option>Tekrar deneyin</option>";

    locationTitle.textContent = "Türkiye";
  }
}

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

    const list =
      Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

    if (!list.length) {
      throw new Error("İlçe bulunamadı.");
    }

    district.innerHTML = "";

    list.forEach(item => {
      const id = item.id ?? item._id;

      const name =
        item.name ||
        item.name_tr ||
        item.name_en ||
        "İlçe";

      if (!id) return;

      const option = document.createElement("option");

      option.value = id;
      option.textContent = formatName(name);

      district.appendChild(option);
    });

    district.disabled = false;

    updateLocation();

    await loadPrayerTimes();

  } catch (error) {
    console.error("İlçeler yüklenirken hata:", error);

    district.innerHTML =
      "<option>İlçeler yüklenemedi</option>";
  }
}

async function loadPrayerTimes() {
  const districtId = district.value;

  if (!districtId) return;

  showLoading();

  try {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const url =
      `${API}/prayer-times/${encodeURIComponent(
        districtId
      )}/daily?startDate=${today}&endDate=${today}`;

    const result = await getJSON(url);

    let data = null;

    if (Array.isArray(result.data)) {
      data =
        result.data.find(item => {
          const date = String(
            item.date ||
            item.tarih ||
            ""
          );

          return date.startsWith(today);
        }) || result.data[0];
    } else {
      data = result.data;
    }

    if (!data) {
      throw new Error(
        "Bugünün vakitleri bulunamadı."
      );
    }

    const times = data.times || data;

    currentTimes = {
      imsak: findTime(times, [
        "imsak",
        "fajr",
        "Imsak"
      ]),

      gunes: findTime(times, [
        "gunes",
        "Gunes",
        "sunrise"
      ]),

      ogle: findTime(times, [
        "ogle",
        "Ogle",
        "dhuhr"
      ]),

      ikindi: findTime(times, [
        "ikindi",
        "Asr",
        "asr"
      ]),

      aksam: findTime(times, [
        "aksam",
        "Aksam",
        "maghrib"
      ]),

      yatsi: findTime(times, [
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
          Güncel bilgiler alınırken bir sorun oluştu.
        </small>
      </div>
    `;
  }
}

function findTime(data, keys) {
  for (const key of keys) {
    if (
      data &&
      data[key] !== undefined &&
      data[key] !== null &&
      String(data[key]).trim() !== ""
    ) {
      return String(data[key]).trim();
    }
  }

  return null;
}

function renderTimes() {
  if (!currentTimes) return;

  timesBox.innerHTML = names
    .map(([key, name]) => {
      const value =
        currentTimes[key] || "--:--";

      return `
        <div class="time" data-time="${key}">
          <span>${name}</span>
          <strong>${escapeHTML(value)}</strong>
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
      currentTimes.aksam || "--:--";
  }

  if (sahur) {
    sahur.textContent =
      currentTimes.imsak || "--:--";
  }

  startCountdown();
}

function startCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  updateCountdown();

  countdownTimer =
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  if (!currentTimes) return;

  const now = new Date();

  const currentSeconds =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  let next = null;

  for (const [key, name] of names) {
    const seconds =
      timeToSeconds(currentTimes[key]);

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
        seconds: firstSeconds + 86400
      };
    }
  }

  if (!next) {
    nextName.textContent = "—";
    countdownBox.textContent = "--:--:--";
    return;
  }

  nextName.textContent = next.name;

  let remaining =
    next.seconds - currentSeconds;

  if (remaining < 0) {
    remaining += 86400;
  }

  const hours =
    Math.floor(remaining / 3600);

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
        element.dataset.time === next.key
      );
    });

  updateDate();
}

function timeToSeconds(value) {
  if (!value) return null;

  const match =
    String(value).match(
      /(\d{1,2}):(\d{2})/
    );

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60;
}

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
    locationTitle.textContent = cityName;
  } else {
    locationTitle.textContent = "Türkiye";
  }
}

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

    if (permission !== "granted") {
      alert("Bildirim izni verilmedi.");
      return;
    }

    notifyButton.classList.add("enabled");

    notifyButton.textContent =
      "🔔 Bildirimler Açık";

    new Notification("Ezan Vakti", {
      body:
        "Bildirimler başarıyla açıldı."
    });

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

      const kaabaLat = 21.422487;
      const kaabaLng = 39.826206;

      const lat1 =
        latitude * Math.PI / 180;

      const lat2 =
        kaabaLat * Math.PI / 180;

      const deltaLng =
        (kaabaLng - longitude) *
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
        180 / Math.PI;

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

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

function formatName(name) {
  return String(name)
    .toLocaleLowerCase("tr-TR")
    .replace(
      /(^|\s)\S/g,
      letter =>
        letter.toLocaleUpperCase("tr-TR")
    );
}

updateDate();
loadTurkey();
startAutoRefresh();
