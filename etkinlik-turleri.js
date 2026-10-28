// ═══ ETKİNLİK KATILIMCI TÜRLERİ VE INSTAGRAM PAYLAŞIM AYARLARI ═══
// Kimlerin katılacağı (katilimciTuru) ile kimlere açık olduğu (audience: okula özel / dışarıya açık)
// birbirinden bağımsızdır; her tür iki şekilde de ayarlanabilir.

var KATILIMCI_TURLERI = {
  aile: {
    etiket: "Ailece", uzun: "Çocuk ve ebeveynler birlikte",
    cocukKatilir: true, yetiskinSecimi: true, ebeveyn: "",
    renk: "#2f7d4a", zemin: "#e2f3e6"
  },
  anneCocuk: {
    etiket: "Anne + çocuk", uzun: "Anneler çocuklarıyla birlikte",
    cocukKatilir: true, yetiskinSecimi: false, ebeveyn: "anne",
    renk: "#c2452d", zemin: "#fde7e1"
  },
  babaCocuk: {
    etiket: "Baba + çocuk", uzun: "Babalar çocuklarıyla birlikte",
    cocukKatilir: true, yetiskinSecimi: false, ebeveyn: "baba",
    renk: "#0f7069", zemin: "#d8f2ef"
  },
  anneler: {
    etiket: "Annelere özel", uzun: "Yalnızca anneler katılır",
    cocukKatilir: false, yetiskinSecimi: false, ebeveyn: "anne",
    renk: "#b8236a", zemin: "#fce4f0"
  },
  babalar: {
    etiket: "Babalara özel", uzun: "Yalnızca babalar katılır",
    cocukKatilir: false, yetiskinSecimi: false, ebeveyn: "baba",
    renk: "#2149b8", zemin: "#e3eafd"
  },
  ebeveynler: {
    etiket: "Ebeveynlere özel", uzun: "Anne ve babalar katılır, çocuklar gelmez",
    cocukKatilir: false, yetiskinSecimi: true, ebeveyn: "",
    renk: "#6b3fc4", zemin: "#efe8fc"
  }
};
var KATILIMCI_TURU_SIRASI = ["aile", "anneCocuk", "babaCocuk", "anneler", "babalar", "ebeveynler"];

// Eski kayıtlar: katilimciTuru yoksa "sadeceYetiskin" işaretine bakılır
function katilimciTuruAl(etkinlik) {
  if (etkinlik && KATILIMCI_TURLERI[etkinlik.katilimciTuru]) return etkinlik.katilimciTuru;
  if (etkinlik && etkinlik.sadeceYetiskin === true) return "ebeveynler";
  return "aile";
}
function katilimciTuruBilgisi(etkinlik) {
  return KATILIMCI_TURLERI[katilimciTuruAl(etkinlik)];
}

// ── Instagram ──
var INSTAGRAM_PAYLASIM_TURLERI = {
  yok: { etiket: "Paylaşma", aciklama: "Bu etkinlik için Reels hazırlanmaz." },
  organik: { etiket: "Normal gönderi", aciklama: "Reels + gönderi metni ve etiketler; hesapta normal paylaşılır." },
  reklam: { etiket: "Ücretli reklam", aciklama: "Reels + reklam metni, hedef kitle ve bütçe önerisi." }
};
var INSTAGRAM_DURUMLARI = {
  hazirlanacak: "Reels hazırlanacak",
  hazir: "Reels hazır",
  paylasildi: "Paylaşıldı"
};

// Etkinlik kaydedilirken çağrılır: Reels'i etkileyen bir bilgi değiştiyse yeni istek oluşturur
function instagramIstegiHazirla(yeni, eski) {
  var ig = Object.assign({ paylasimTuru: "yok" }, yeni.instagram || {});
  if (ig.paylasimTuru === "yok") { ig.durum = ""; return ig; }
  var eskiIg = (eski && eski.instagram) || {};
  var alanlar = ["title", "date", "startTime", "endTime", "location", "shortDesc", "isFree", "fee", "audience", "katilimciTuru"];
  var bilgiDegisti = !eski || alanlar.some(function (a) { return String(yeni[a] || "") !== String(eski[a] || ""); });
  var ayarDegisti = eskiIg.paylasimTuru !== ig.paylasimTuru || (eskiIg.not || "") !== (ig.not || "");
  if (!ig.istekTarihi || bilgiDegisti || ayarDegisti || ig.yenidenHazirla) {
    ig.istekTarihi = new Date().toISOString();
    ig.durum = "hazirlanacak";
  }
  delete ig.yenidenHazirla;
  return ig;
}
