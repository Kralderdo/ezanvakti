const LOCATIONS_API = "https://api.turkiyeapi.dev/v2";
const PRAYER_API = "https://api.aladhan.com/v1";
const DEFAULT_PROVINCE_ID = 6;

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");
const locationTitle = document.getElementById("location");
const dateText = document.getElementById("date");
const notifyButton = document.getElementById("notify");
const qiblaButton = document.getElementById("qiblaBtn");

const PRAYERS = [
  ["imsak", "İmsak", "Fajr"],
  ["gunes", "Güneş", "Sunrise"],
  ["ogle", "Öğle", "Dhuhr"],
  ["ikindi", "İkindi", "Asr"],
  ["aksam", "Akşam", "Maghrib"],
  ["yatsi", "Yatsı", "Isha"]
];

let currentTimes = null;
let countdownTimer = null;
let reminderTimer = null;
let provinces = [];
let districts = [];
let notificationPermission =
  "Notification" in window ? Notification.permission : "default";

function getDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getApiDate(date = new Date()) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

function normalizeText(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

async function api(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function setSelectLoading(select, text) {
  select.innerHTML = `<option value="">${text}</option>`;
  select.disabled = true;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function fillSelect(select, items, getId, getName) {
  select.innerHTML = items.map(item => {
    const id = getId(item);
    const name = getName(item);

    return `
      <option value="${escapeHtml(String(id))}">
        ${escapeHtml(String(name))}
      </option>
    `;
  }).join("");

  select.disabled = items.length === 0;
}

async function loadTurkey() {
  setSelectLoading(city, "İller yükleniyor…");
  setSelectLoading(district, "İlçe yükleniyor…");

  try {
    const result = await api(
      `${LOCATIONS_API}/provinces?limit=100`
    );

    provinces = Array.isArray(result.data)
      ? result.data
      : [];

    provinces.sort((a, b) =>
      String(a.name).localeCompare(
        String(b.name),
        "tr"
      )
    );

    fillSelect(
      city,
      provinces,
      p => p.id,
      p => p.name
    );

    const savedProvince =
      localStorage.getItem("ezan_province");

    const preferred =
      provinces.find(
        p => String(p.id) === savedProvince
      ) ||
      provinces.find(
        p => p.id === DEFAULT_PROVINCE_ID
      ) ||
      provinces[0];

    if (preferred) {
      city.value = String(preferred.id);
    }

    await loadDistricts();

  } catch (error) {
    console.error(error);

    showError(
      "İller alınamadı. İnternet bağlantını kontrol et."
    );
  }
}

async function loadDistricts() {
  const provinceId = city.value;

  if (!provinceId) return;

  localStorage.setItem(
    "ezan_province",
    provinceId
  );

  setSelectLoading(
    district,
    "İlçeler yükleniyor…"
  );

  try {
    const result = await api(
      `${LOCATIONS_API}/provinces/${encodeURIComponent(
        provinceId
      )}/districts?limit=1000`
    );

    districts = Array.isArray(result.data)
      ? result.data
      : [];

    districts.sort((a, b) =>
      String(a.name).localeCompare(
        String(b.name),
        "tr"
      )
    );

    fillSelect(
      district,
      districts,
      d => d.id,
      d => d.name
    );

    const savedDistrict =
      localStorage.getItem(
        `ezan_district_${provinceId}`
      );

    const preferred =
      districts.find(
        d => String(d.id) === savedDistrict
      ) ||
      districts.find(
        d =>
          normalizeText(d.name).includes(
            "cankaya"
          )
      ) ||
      districts[0];

    if (preferred) {
      district.value = String(preferred.id);

      localStorage.setItem(
        `ezan_district_${provinceId}`,
        district.value
      );

      await loadPrayerTimes();
    }

  } catch (error) {
    console.error(error);

    setSelectLoading(
      district,
      "İlçeler alınamadı"
    );

    showError(
      "İlçeler alınamadı. Birkaç saniye sonra tekrar dene."
    );
  }
}

function selectedProvinceName() {
  return (
    city.options[city.selectedIndex]
      ?.textContent
      ?.trim() ||
    "Türkiye"
  );
}

function selectedDistrictName() {
  return (
    district.options[district.selectedIndex]
      ?.textContent
      ?.trim() ||
    ""
  );
}

async function loadPrayerTimes() {
  const province = selectedProvinceName();
  const selectedDistrict =
    selectedDistrictName();

  if (
    !province ||
    !selectedDistrict ||
    district.disabled
  ) {
    return;
  }

  localStorage.setItem(
    `ezan_district_${city.value}`,
    district.value
  );

  locationTitle.textContent =
    `${province} / ${selectedDistrict}`;

  dateText.textContent =
    new Date().toLocaleDateString(
      "tr-TR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

  timesBox.innerHTML = `
    <div class="loading-card">
      <span>🕌</span>
      <b>Vakitler getiriliyor…</b>
      <small>Diyanet hesaplama yöntemi ile</small>
    </div>
  `;

  try {
    const params = new URLSearchParams({
      city: selectedDistrict,
      country: "Turkey",
      state: province,
      method: "13",
      timezonestring: "Europe/Istanbul",
      school: "1"
    });

    const result = await api(
      `${PRAYER_API}/timingsByCity/${getApiDate()}?${params}`
    );

    const timings =
      result?.data?.timings;

    if (!timings) {
      throw new Error(
        "Vakit verisi bulunamadı"
      );
    }

    currentTimes = {
      imsak: cleanTime(
        timings.Fajr ||
        timings.Imsak
      ),

      gunes: cleanTime(
        timings.Sunrise
      ),

      ogle: cleanTime(
        timings.Dhuhr
      ),

      ikindi: cleanTime(
        timings.Asr
      ),

      aksam: cleanTime(
        timings.Maghrib
      ),

      yatsi: cleanTime(
        timings.Isha
      )
    };

    renderTimes();

  } catch (error) {
    console.error(
      "Namaz vakitleri alınamadı:",
      error
    );

    currentTimes = null;

    showError(
      "Vakitler alınamadı. İlçeyi tekrar seçmeyi dene."
    );
  }
}

function cleanTime(value) {
  if (!value) return null;

  const match =
    String(value).match(
      /\b(\d{1,2}:\d{2})/
    );

  return match
    ? match[1]
    : null;
}

function renderTimes() {
  if (!currentTimes) return;

  timesBox.innerHTML =
    PRAYERS.map(
      ([key, name]) => `
        <article
          class="time"
          data-time="${key}"
        >
          <span>${name}</span>
          <strong>
            ${currentTimes[key] || "--:--"}
          </strong>
        </article>
      `
    ).join("");

  document.getElementById(
    "iftar"
  ).textContent =
    currentTimes.aksam || "--:--";

  document.getElementById(
    "sahur"
  ).textContent =
    currentTimes.imsak || "--:--";

  startCountdown();
  updateNotificationStatus();
}

function toSeconds(value) {
  if (!value) return null;

  const [h, m] =
    String(value)
      .split(":")
      .map(Number);

  if (
    !Number.isFinite(h) ||
    !Number.isFinite(m)
  ) {
    return null;
  }

  return h * 3600 + m * 60;
}

function startCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  const update = () => {
    if (!currentTimes) return;

    const now = new Date();

    const current =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    let next = null;

    for (const [key, name] of PRAYERS) {
      const seconds =
        toSeconds(
          currentTimes[key]
        );

      if (
        seconds !== null &&
        seconds > current
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
      const imsak =
        toSeconds(
          currentTimes.imsak
        );

      next = {
        key: "imsak",
        name: "Yarın İmsak",
        seconds:
          (imsak || 0) + 86400
      };
    }

    let remaining =
      next.seconds - current;

    if (remaining < 0) {
      remaining += 86400;
    }

    const h =
      Math.floor(
        remaining / 3600
      );

    const m =
      Math.floor(
        (remaining % 3600) / 60
      );

    const s =
      remaining % 60;

    document.getElementById(
      "nextName"
    ).textContent =
      next.name;

    document.getElementById(
      "countdown"
    ).textContent =
      `${String(h).padStart(2, "0")}:` +
      `${String(m).padStart(2, "0")}:` +
      `${String(s).padStart(2, "0")}`;

    document
      .querySelectorAll(".time")
      .forEach(el => {
        el.classList.toggle(
          "current",
          el.dataset.time ===
            next.key
        );
      });
  };

  update();

  countdownTimer =
    setInterval(
      update,
      1000
    );
}

function showError(message) {
  timesBox.innerHTML = `
    <div class="error-card">
      <span>⚠️</span>
      <b>${escapeHtml(message)}</b>
      <small>
        Sayfayı yenilemeyi veya başka
        bir ilçe seçmeyi dene.
      </small>
    </div>
  `;
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    alert(
      "Bu tarayıcı bildirimleri desteklemiyor."
    );
    return;
  }

  notificationPermission =
    await Notification.requestPermission();

  updateNotificationStatus();

  if (
    notificationPermission ===
    "granted"
  ) {
    try {
      const registration =
        await navigator
          .serviceWorker
          .ready;

      await registration.showNotification(
        "Ezan Vakti",
        {
          body:
            "Bildirimler açıldı.",
          icon: "./icon.svg",
          badge: "./icon.svg"
        }
      );

    } catch (_) {
      new Notification(
        "Ezan Vakti",
        {
          body:
            "Bildirimler açıldı."
        }
      );
    }

    startReminderLoop();
  }
}

function updateNotificationStatus() {
  if (!notifyButton) return;

  if (
    notificationPermission ===
    "granted"
  ) {
    notifyButton.textContent =
      "🔔 Bildirimler Açık";

    notifyButton.classList.add(
      "enabled"
    );

  } else {
    notifyButton.textContent =
      "🔔 Bildirimleri Aç";

    notifyButton.classList.remove(
      "enabled"
    );
  }
}

function startReminderLoop() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
  }

  reminderTimer =
    setInterval(
      checkPrayerReminder,
      30000
    );

  checkPrayerReminder();
}

function checkPrayerReminder() {
  if (
    notificationPermission !==
      "granted" ||
    !currentTimes
  ) {
    return;
  }

  const now = new Date();

  const clock =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;

  const minuteKey =
    `${getDateString()}-${clock}`;

  const already =
    localStorage.getItem(
      "ezan_last_notification"
    );

  for (const [
    key,
    name
  ] of PRAYERS) {

    const time =
      currentTimes[key];

    if (!time) continue;

    if (
      clock === time &&
      already !==
        `${minuteKey}-${key}`
    ) {

      localStorage.setItem(
        "ezan_last_notification",
        `${minuteKey}-${key}`
      );

      navigator
        .serviceWorker
        .ready
        .then(reg =>
          reg.showNotification(
            "🕌 Ezan Vakti",
            {
              body:
                `${name} vakti geldi — ` +
                `${selectedProvinceName()} / ` +
                `${selectedDistrictName()}`,
              icon: "./icon.svg",
              badge: "./icon.svg",
              tag: `ezan-${key}`
            }
          )
        )
        .catch(() => {});
    }
  }
}

function calculateQibla() {
  const output =
    document.getElementById(
      "qibla"
    );

  if (!navigator.geolocation) {
    output.textContent =
      "Konum yok";
    return;
  }

  output.textContent =
    "Hesaplanıyor…";

  navigator.geolocation.getCurrentPosition(
    position => {

      const {
        latitude,
        longitude
      } = position.coords;

      const kaabaLat =
        21.422487;

      const kaabaLon =
        39.826206;

      const φ1 =
        latitude *
        Math.PI /
        180;

      const φ2 =
        kaabaLat *
        Math.PI /
        180;

      const Δλ =
        (kaabaLon - longitude) *
        Math.PI /
        180;

      const y =
        Math.sin(Δλ);

      const x =
        Math.cos(φ1) *
          Math.tan(φ2) -
        Math.sin(φ1) *
          Math.cos(Δλ);

      let bearing =
        Math.atan2(y, x) *
        180 /
        Math.PI;

      bearing =
        (bearing + 360) %
        360;

      output.textContent =
        `${Math.round(bearing)}° ` +
        `${directionName(bearing)}`;
    },

    () => {
      output.textContent =
        "Konum izni gerekli";
    },

    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}

function directionName(degrees) {
  const names = [
    "K",
    "K-KD",
    "KD",
    "D-KD",
    "D",
    "D-GD",
    "GD",
    "G-GD",
    "G",
    "G-GB",
    "GB",
    "B-GB",
    "B",
    "B-KB",
    "KB",
    "K-KB"
  ];

  return names[
    Math.round(
      degrees / 22.5
    ) % 16
  ];
}

city.addEventListener(
  "change",
  loadDistricts
);

district.addEventListener(
  "change",
  loadPrayerTimes
);

notifyButton?.addEventListener(
  "click",
  requestNotifications
);

qiblaButton?.addEventListener(
  "click",
  calculateQibla
);

let lastDate =
  getDateString();

setInterval(
  async () => {
    const today =
      getDateString();

    if (
      today !== lastDate
    ) {
      lastDate = today;
      await loadPrayerTimes();
    }
  },
  60000
);

if (
  notificationPermission ===
  "granted"
) {
  startReminderLoop();
}

updateNotificationStatus();
loadTurkey();
