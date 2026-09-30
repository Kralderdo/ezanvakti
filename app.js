const API = "https://ezanvakti.imsakiyem.com/api";

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");

const PRAYERS = [
  ["imsak", "İmsak"],
  ["gunes", "Güneş"],
  ["ogle", "Öğle"],
  ["ikindi", "İkindi"],
  ["aksam", "Akşam"],
  ["yatsi", "Yatsı"]
];

let currentTimes = null;
let countdownTimer = null;


/* -----------------------------
   API
----------------------------- */

async function api(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      "API hatası: " + response.status
    );
  }

  return await response.json();
}


/* -----------------------------
   TÜRKİYE
----------------------------- */

async function loadTurkey() {

  try {

    const result =
      await api(
        `${API}/locations/countries`
      );

    const countries =
      result.data || result;

    const turkey =
      countries.find(country => {

        const name =
          String(
            country.name ||
            country.Name ||
            ""
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

    const turkeyId =
      turkey.id ||
      turkey._id;

    const statesResult =
      await api(
        `${API}/locations/states?countryId=${turkeyId}`
      );

    const states =
      statesResult.data ||
      statesResult;

    city.innerHTML =
      states.map(state => {

        const id =
          state.id ||
          state._id;

        const name =
          state.name ||
          state.Name;

        return `
          <option value="${id}">
            ${name}
          </option>
        `;

      }).join("");

    /* Ankara'yı başlangıç yap */
    const ankara =
      states.find(state =>
        String(
          state.name ||
          state.Name ||
          ""
        ).toLowerCase()
        .includes("ankara")
      );

    if (ankara) {
      city.value =
        ankara.id ||
        ankara._id;
    }

    await loadDistricts();

  } catch (error) {

    console.error(error);

    city.innerHTML =
      `<option>İller yüklenemedi</option>`;

    district.innerHTML =
      `<option>İlçeler yüklenemedi</option>`;

    showError(
      "İl bilgileri alınamadı."
    );
  }
}


/* -----------------------------
   İLÇELER
----------------------------- */

async function loadDistricts() {

  try {

    const stateId =
      city.value;

    const result =
      await api(
        `${API}/locations/districts?stateId=${stateId}`
      );

    const districts =
      result.data ||
      result;

    district.innerHTML =
      districts.map(item => {

        const id =
          item.id ||
          item._id;

        const name =
          item.name ||
          item.Name;

        return `
          <option value="${id}">
            ${name}
          </option>
        `;

      }).join("");

    /*
      İlk ilçeyi seç
    */

    if (districts.length > 0) {

      district.value =
        districts[0].id ||
        districts[0]._id;

      await loadPrayerTimes();
    }

  } catch (error) {

    console.error(error);

    district.innerHTML =
      `<option>İlçeler yüklenemedi</option>`;

    showError(
      "İlçe bilgileri alınamadı."
    );
  }
}


/* -----------------------------
   GERÇEK VAKİTLER
----------------------------- */

async function loadPrayerTimes() {

  try {

    const districtId =
      district.value;

    if (!districtId) {
      return;
    }

    /*
      Bugünün tarihini al
    */

    const today =
      getDateString();

    /*
      Günlük gerçek vakit
    */

    const result =
      await api(
        `${API}/prayer-times/${districtId}/daily?startDate=${today}`
      );

    const records =
      result.data ||
      result;

    let record =
      Array.isArray(records)
        ? records[0]
        : records;

    /*
      Eğer günlük cevap gelmezse
      aylık veriden bugünü bul
    */

    if (!record) {

      const monthly =
        await api(
          `${API}/prayer-times/${districtId}/monthly?startDate=${today}`
        );

      const list =
        monthly.data ||
        monthly;

      record =
        findToday(list);
    }

    if (!record) {
      throw new Error(
        "Bugünün vakti bulunamadı."
      );
    }

    /*
      Gerçek API formatı:
      record.times
    */

    const times =
      record.times ||
      record;

    currentTimes = {

      imsak:
        times.imsak,

      gunes:
        times.gunes,

      ogle:
        times.ogle,

      ikindi:
        times.ikindi,

      aksam:
        times.aksam,

      yatsi:
        times.yatsi
    };

    renderTimes();

  } catch (error) {

    console.error(error);

    showError(
      "Bugünün gerçek vakitleri alınamadı."
    );
  }
}


/* -----------------------------
   BUGÜNÜ BUL
----------------------------- */

function findToday(list) {

  if (!Array.isArray(list)) {
    return null;
  }

  const today =
    getDateString();

  return list.find(item => {

    const date =
      String(
        item.date ||
        item.tarih ||
        ""
      ).substring(0, 10);

    return date === today;

  });
}


/* -----------------------------
   TARİH
----------------------------- */

function getDateString() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* -----------------------------
   EKRANA VAKİTLER
----------------------------- */

function renderTimes() {

  if (!currentTimes) {
    return;
  }

  timesBox.innerHTML =
    PRAYERS.map(
      ([key, name]) => {

        return `
          <div
            class="time"
            data-time="${key}"
          >

            <span>${name}</span>

            <strong>
              ${currentTimes[key] || "--:--"}
            </strong>

          </div>
        `;

      }
    ).join("");

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

  document.getElementById(
    "location"
  ).textContent =
    `${city.options[city.selectedIndex]?.text || ""} / ${district.options[district.selectedIndex]?.text || ""}`;

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

  startCountdown();
}


/* -----------------------------
   SAAT
----------------------------- */

function toSeconds(value) {

  if (!value) {
    return null;
  }

  const parts =
    String(value).split(":");

  if (parts.length < 2) {
    return null;
  }

  return (
    Number(parts[0]) * 3600 +
    Number(parts[1]) * 60
  );
}


/* -----------------------------
   GERİ SAYIM
----------------------------- */

function startCountdown() {

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  function update() {

    if (!currentTimes) {
      return;
    }

    const now =
      new Date();

    const current =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds();

    let next = null;

    for (
      const [key, name]
      of PRAYERS
    ) {

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

    /*
      Günün son vakti geçtiyse
      yarının imsakını göster
    */

    if (!next) {

      next = {
        key: "imsak",
        name: "Yarın İmsak",
        seconds:
          toSeconds(
            currentTimes.imsak
          ) + 86400
      };
    }

    let remaining =
      next.seconds -
      current;

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

    document.getElementById(
      "nextName"
    ).textContent =
      next.name;

    document.getElementById(
      "countdown"
    ).textContent =
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0");

    document.querySelectorAll(
      ".time"
    ).forEach(element => {

      element.classList.toggle(
        "current",
        element.dataset.time === next.key
      );

    });

  }

  update();

  countdownTimer =
    setInterval(
      update,
      1000
    );
}


/* -----------------------------
   HATA
----------------------------- */

function showError(message) {

  timesBox.innerHTML = `
    <div class="time">
      <span>Bilgi</span>
      <strong>${message}</strong>
    </div>
  `;
}


/* -----------------------------
   BİLDİRİM İZNİ
----------------------------- */

document.getElementById(
  "notify"
).addEventListener(
  "click",
  async () => {

    if (
      !("Notification" in window)
    ) {

      alert(
        "Bu cihaz bildirimleri desteklemiyor."
      );

      return;
    }

    const permission =
      await Notification.requestPermission();

    if (
      permission === "granted"
    ) {

      new Notification(
        "Ezan Vakti",
        {
          body:
            "Bildirim izni açıldı."
        }
      );
    }
  }
);


/* -----------------------------
   SEÇİMLER
----------------------------- */

city.addEventListener(
  "change",
  loadDistricts
);

district.addEventListener(
  "change",
  loadPrayerTimes
);


/* -----------------------------
   TARİH DEĞİŞİNCE OTOMATİK YENİLE
----------------------------- */

let lastDate =
  getDateString();

setInterval(
  async () => {

    const today =
      getDateString();

    if (
      today !== lastDate
    ) {

      lastDate =
        today;

      await loadPrayerTimes();
    }

  },
  60000
);


/* -----------------------------
   SAYFA AÇILDI
----------------------------- */

loadTurkey();
