// ═══ ETKİNLİK KATILIMCI TÜRLERİ VE INSTAGRAM PAYLAŞIM AYARLARI ═══
// Kimlerin katılacağı (katilimciTuru) ile kimlere açık olduğu (audience: okula özel / dışarıya açık)
// birbirinden bağımsızdır; her tür iki şekilde de ayarlanabilir.

var KATILIMCI_TURLERI = {
  aile: {
    etiket: "Ailece", uzun: "Çocuk ve ebeveynler birlikte",
    cocukKatilir: true, yetiskinSecimi: true, ebeveyn: "",
    renk: "#2e5339", zemin: "#e3f1e6"
  },
  anneCocuk: {
    etiket: "Anne + çocuk", uzun: "Anneler çocuklarıyla birlikte",
    cocukKatilir: true, yetiskinSecimi: false, ebeveyn: "anne",
    renk: "#9a3f1c", zemin: "#fdebdf"
  },
  babaCocuk: {
    etiket: "Baba + çocuk", uzun: "Babalar çocuklarıyla birlikte",
    cocukKatilir: true, yetiskinSecimi: false, ebeveyn: "baba",
    renk: "#17605b", zemin: "#dcf1ee"
  },
  anneler: {
    etiket: "Annelere özel", uzun: "Yalnızca anneler katılır",
    cocukKatilir: false, yetiskinSecimi: false, ebeveyn: "anne",
    renk: "#a2365f", zemin: "#fbe6ee"
  },
  babalar: {
    etiket: "Babalara özel", uzun: "Yalnızca babalar katılır",
    cocukKatilir: false, yetiskinSecimi: false, ebeveyn: "baba",
    renk: "#1d5791", zemin: "#e2edf9"
  },
  ebeveynler: {
    etiket: "Ebeveynlere özel", uzun: "Anne ve babalar katılır, çocuklar gelmez",
    cocukKatilir: false, yetiskinSecimi: true, ebeveyn: "",
    renk: "#5b4a8b", zemin: "#ece8f7"
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
