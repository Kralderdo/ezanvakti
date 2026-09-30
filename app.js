const times = [
  ["imsak", "İmsak"],
  ["gunes", "Güneş"],
  ["ogle", "Öğle"],
  ["ikindi", "İkindi"],
  ["aksam", "Akşam"],
  ["yatsi", "Yatsı"]
];

const cities = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya",
  "Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın",
  "Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa",
  "Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne",
  "Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
  "Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir",
  "Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri",
  "Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya",
  "Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun",
  "Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"
];

const city = document.getElementById("city");
const district = document.getElementById("district");
const timesBox = document.getElementById("times");

city.innerHTML = cities
  .map(x => `<option>${x}</option>`)
  .join("");

city.value = "Ankara";

const districts = {
  Ankara: ["Çankaya","Keçiören","Mamak","Sincan","Etimesgut","Polatlı"],
  İstanbul: ["Kadıköy","Beşiktaş","Üsküdar","Fatih","Bakırköy"],
  İzmir: ["Konak","Bornova","Karşıyaka","Buca"],
  Antalya: ["Muratpaşa","Kepez","Konyaaltı"],
  Bursa: ["Osmangazi","Nilüfer","Yıldırım"],
  Konya: ["Selçuklu","Meram","Karatay"]
};

function loadDistricts() {

  const list = districts[city.value] || ["Merkez"];

  district.innerHTML = list
    .map(x => `<option>${x}</option>`)
    .join("");

  loadPrayerTimes();
}

function getToday() {

  const d = new Date();

  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function createTimes() {

  /*
   * Bu bölüm test amaçlıdır.
   * Gerçek Diyanet vakitleri sonraki aşamada
   * sunucu/API üzerinden bağlanacaktır.
   */

  return {
    imsak: "05:10",
    gunes: "06:35",
    ogle: "12:45",
    ikindi: "16:10",
    aksam: "19:05",
    yatsi: "20:25"
  };
}

function loadPrayerTimes() {

  const data = createTimes();

  document.getElementById("location").textContent =
    city.value + " / " + district.value;

  document.getElementById("date").textContent =
    getToday();

  timesBox.innerHTML = times
    .map(([key,name]) => {

      return `
        <div class="time" data-time="${key}">
          <span>${name}</span>
          <strong>${data[key]}</strong>
        </div>
      `;

    })
    .join("");

  document.getElementById("iftar").textContent =
    data.aksam;

  document.getElementById("sahur").textContent =
    data.imsak;

  startCountdown(data);
}

function toMinutes(value) {

  const [hour,minute] =
    value.split(":").map(Number);

  return hour * 60 + minute;
}

function startCountdown(data) {

  const list = times.map(([key,name]) => ({
    key,
    name,
    minutes: toMinutes(data[key])
  }));

  function update() {

    const now = new Date();

    const current =
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60;

    let next =
      list.find(x => x.minutes > current);

    if (!next) {
      next = list[0];
      document.getElementById("nextName")
        .textContent = "Yarın İmsak";
    } else {
      document.getElementById("nextName")
        .textContent = next.name;
    }

    let seconds =
      next.minutes * 60 -
      (
        now.getHours() * 3600 +
        now.getMinutes() * 60 +
        now.getSeconds()
      );

    if (seconds < 0)
      seconds += 86400;

    const h =
      Math.floor(seconds / 3600);

    const m =
      Math.floor((seconds % 3600) / 60);

    const s =
      seconds % 60;

    document.getElementById("countdown")
      .textContent =
      String(h).padStart(2,"0") + ":" +
      String(m).padStart(2,"0") + ":" +
      String(s).padStart(2,"0");

    document.querySelectorAll(".time")
      .forEach(el => {

        el.classList.toggle(
          "current",
          el.dataset.time === next.key
        );

      });
  }

  update();

  setInterval(update,1000);
}

city.addEventListener(
  "change",
  loadDistricts
);

district.addEventListener(
  "change",
  loadPrayerTimes
);

document.getElementById("notify")
  .addEventListener("click", async () => {

    if (!("Notification" in window)) {

      alert(
        "Bu tarayıcı bildirimleri desteklemiyor."
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
          "Bildirimler başarıyla açıldı."
        }
      );

    }

  });

loadDistricts();
