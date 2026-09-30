const API = "https://ezanvakti.imsakiyem.com/api";

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");

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

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Veri alınamadı");
  }

  return response.json();
}

/* Türkiye */
async function loadTurkey() {

  try {

    const countries =
      await getJSON(`${API}/locations/countries`);

    const turkey =
      countries.data?.find(x =>
        String(x.name)
          .toLowerCase()
          .includes("türkiye")
      );

    if (!turkey) {
      throw new Error("Türkiye bulunamadı");
    }

    const states =
      await getJSON(
        `${API}/locations/states?countryId=${turkey.id}`
      );

    city.innerHTML = states.data
      .map(x =>
        `<option value="${x.id}">
          ${x.name}
        </option>`
      )
      .join("");

    await loadDistricts();

  } catch (error) {

    console.error(error);

    city.innerHTML =
      `<option>Türkiye yüklenemedi</option>`;

    district.innerHTML =
      `<option>Tekrar deneyin</option>`;
  }
}


/* İlçeler */
async function loadDistricts() {

  try {

    const stateId = city.value;

    const result =
      await getJSON(
        `${API}/locations/districts?stateId=${stateId}`
      );

    district.innerHTML =
      result.data
        .map(x =>
          `<option value="${x.id}">
            ${x.name}
          </option>`
        )
        .join("");

    await loadPrayerTimes();

  } catch (error) {

    console.error(error);
  }
}


/* Gerçek vakitler */
async function loadPrayerTimes() {

  try {

    const districtId = district.value;

    const result =
      await getJSON(
        `${API}/prayer-times/${districtId}/daily`
      );

    const data =
      result.data?.[0] ||
      result.data;

    if (!data) {
      throw new Error("Vakit bulunamadı");
    }

    currentTimes = {

      imsak:
        data.fajr ||
        data.imsak ||
        data.Imsak,

      gunes:
        data.sunrise ||
        data.gunes ||
        data.Gunes,

      ogle:
        data.dhuhr ||
        data.ogle ||
        data.Ogle,

      ikindi:
        data.asr ||
        data.ikindi ||
        data.Asr,

      aksam:
        data.maghrib ||
        data.aksam ||
        data.Aksam,

      yatsi:
        data.isha ||
        data.yatsi ||
        data.Yatsi
    };

    renderTimes();

  } catch (error) {

    console.error(error);

    timesBox.innerHTML = `
      <div class="time">
        <span>Hata</span>
        <strong>Vakitler alınamadı</strong>
      </div>
    `;
  }
}


/* Ekrana yaz */
function renderTimes() {

  timesBox.innerHTML =
    names.map(([key, name]) => `
      <div class="time" data-time="${key}">
        <span>${name}</span>
        <strong>
          ${currentTimes[key] || "--:--"}
        </strong>
      </div>
    `).join("");

  document.getElementById("iftar").textContent =
    currentTimes.aksam || "--:--";

  document.getElementById("sahur").textContent =
    currentTimes.imsak || "--:--";

  startCountdown();
}


/* Saati dakikaya çevir */
function minutes(value) {

  if (!value) return null;

  const parts =
    String(value).split(":");

  if (parts.length < 2) return null;

  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}


/* Sonraki vakit */
function startCountdown() {

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  function update() {

    const now = new Date();

    const current =
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60;

    let next = null;

    for (const [key, name] of names) {

      const m =
        minutes(currentTimes[key]);

      if (m !== null && m > current) {

        next = {
          key,
          name,
          minutes: m
        };

        break;
      }
    }

    if (!next) {

      const first =
        names[0];

      next = {
        key: first[0],
        name: "Yarın İmsak",
        minutes:
          minutes(
            currentTimes[first[0]]
          ) + 1440
      };
    }

    document.getElementById(
      "nextName"
    ).textContent = next.name;

    let remaining =
      Math.floor(
        next.minutes * 60 -
        (
          now.getHours() * 3600 +
          now.getMinutes() * 60 +
          now.getSeconds()
        )
      );

    if (remaining < 0) {
      remaining += 86400;
    }

    const h =
      Math.floor(remaining / 3600);

    const m =
      Math.floor(
        (remaining % 3600) / 60
      );

    const s =
      remaining % 60;

    document.getElementById(
      "countdown"
    ).textContent =
      String(h).padStart(2, "0") + ":" +
      String(m).padStart(2, "0") + ":" +
      String(s).padStart(2, "0");

    document.querySelectorAll(".time")
      .forEach(el => {

        el.classList.toggle(
          "current",
          el.dataset.time === next.key
        );

      });

    document.getElementById(
      "date"
    ).textContent =
      new Date().toLocaleDateString(
        "tr-TR",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );
  }

  update();

  countdownTimer =
    setInterval(update, 1000);
}


/* İl değişince ilçeleri yenile */
city.addEventListener(
  "change",
  loadDistricts
);


/* İlçe değişince vakitleri yenile */
district.addEventListener(
  "change",
  loadPrayerTimes
);


/* Bildirim */
document.getElementById("notify")
  .addEventListener(
    "click",
    async () => {

      if (!("Notification" in window)) {

        alert(
          "Tarayıcınız bildirimleri desteklemiyor."
        );

        return;
      }

      const permission =
        await Notification.requestPermission();

      if (permission === "granted") {

        new Notification(
          "Ezan Vakti",
          {
            body:
              "Bildirimler açıldı."
          }
        );
      }
    }
  );


/* Başlat */
loadTurkey();
