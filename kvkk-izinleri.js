// ═══ KVKK VE İLETİŞİM İZİNLERİ ═══
// Etkinlik kayıt formunun ve bülten aboneliğinin izin metinleri burada durur.
// Bir metin değiştiğinde IZIN_METIN_SURUMU da güncellenir; her kayıt, onay verdiği metnin
// kendisini ve sürümünü saklar (onayın ispatı veri sorumlusuna aittir).

var IZIN_METIN_SURUMU = "2026-10-28";
var AYDINLATMA_LINKI = "aydinlatma.html";
var IYS_LINKI = "https://www.iys.org.tr";
var IZIN_ILETISIM_EPOSTA = "eposta@bircicekkoleji.com";

var IZIN_METINLERI = {
  // Zorunlu: aydınlatma bir onay değil, bilgilendirmedir. Kayıt verileri sözleşmenin kurulması
  // ve ifası (KVKK md. 5/2-c) hukuki sebebiyle işlenir; bu yüzden ayrıca "açık rıza" istenmez.
  aydinlatma:
    "Kayıt için verdiğim bilgilerin Bir Çiçek Koleji Anaokulu tarafından Aydınlatma Metni'nde " +
    "anlatılan amaçlarla işleneceğini okudum ve anladım.",

  // İsteğe bağlı açık rıza: verilmese de kayıt tamamlanır.
  foto:
    "Etkinlik sırasında çekilecek fotoğraf ve videoların Bir Çiçek Koleji Anaokulu'nun web sitesi " +
    "ve sosyal medya hesaplarında tanıtım amacıyla kullanılmasına açık rıza veriyorum.",

  // İsteğe bağlı ticari elektronik ileti onayı (6563 sayılı Kanun ve İYS). Kanal bazında ayrı alınır.
  ticariGiris:
    "Bir Çiçek Koleji Anaokulu'nun eğitim programları, etkinlikleri, kampanyaları ve tanıtımlarıyla " +
    "ilgili reklam ve duyuru içerikli ticari elektronik iletileri aşağıda işaretlediğim kanallardan " +
    "almak istiyorum.",
  ticariEposta: "E-posta adresime e-posta yoluyla",
  ticariTelefon: "Telefon numarama SMS/mesaj ve arama yoluyla",
  ticariDipnot:
    "Onayınız İleti Yönetim Sistemi'ne (İYS) kaydedilir. Dilediğiniz zaman, ücretsiz olarak gelen " +
    "iletideki ret seçeneğiyle, iys.org.tr üzerinden ya da " + "eposta@bircicekkoleji.com" +
    " adresine yazarak vazgeçebilirsiniz.",

  // İsteğe bağlı izinlerin ortak notu
  istegeBagliNot: "Bu izinleri vermeseniz de kaydınız tamamlanır.",

  // Bülten (yeni etkinlik duyurusu) aboneliği: abonelik işleminin kendisi e-posta onayıdır
  bultenAbonelik:
    "Yeni etkinlik duyurularını ve Bir Çiçek Koleji Anaokulu'nun tanıtım e-postalarını almak istiyorum. " +
    "Onayım İYS'ye kaydedilir; dilediğim zaman tek tıkla vazgeçebilirim."
};

// Kayıt anındaki seçimlerden, Firestore'a yazılacak izin kaydını üretir.
// secimler: { aydinlatma, foto, ticariEposta, ticariTelefon, eposta, telefon }
function izinKaydiOlustur(secimler) {
  var simdi = new Date().toISOString();
  var ticariMetin = function (kanalMetni) {
    return IZIN_METINLERI.ticariGiris + " [" + kanalMetni + "] " + IZIN_METINLERI.ticariDipnot;
  };
  return {
    surum: IZIN_METIN_SURUMU,
    tarih: simdi,
    kaynak: "etkinlikler.bircicekkoleji.com",
    aydinlatma: { okundu: secimler.aydinlatma === true, metin: IZIN_METINLERI.aydinlatma },
    foto: { verildi: secimler.foto === true, metin: IZIN_METINLERI.foto },
    ticariEposta: {
      verildi: secimler.ticariEposta === true,
      adres: secimler.ticariEposta === true ? (secimler.eposta || "") : "",
      metin: ticariMetin(IZIN_METINLERI.ticariEposta)
    },
    ticariTelefon: {
      verildi: secimler.ticariTelefon === true,
      numara: secimler.ticariTelefon === true ? (secimler.telefon || "") : "",
      metin: ticariMetin(IZIN_METINLERI.ticariTelefon)
    },
    // Okul, onayı İYS'ye yükleyince bu alanı işaretler (3 iş günü içinde)
    iysYuklendi: false
  };
}

// Kayıt onay e-postasına eklenecek izin özeti
function izinOzetiHtml(izinler) {
  if (!izinler) return "";
  var durum = function (deger) {
    return deger ? '<strong style="color:#2e7d32">Verildi</strong>' : '<span style="color:#888">Verilmedi</span>';
  };
  return (
    '<div style="background:#f7f7f7;border-radius:10px;padding:14px;margin:16px 0;font-size:12px;color:#555;line-height:1.7">' +
    '<strong style="color:#333">İzinleriniz</strong><br>' +
    "Fotoğraf / video kullanımı: " + durum(izinler.foto && izinler.foto.verildi) + "<br>" +
    "Reklam ve duyuru e-postaları: " + durum(izinler.ticariEposta && izinler.ticariEposta.verildi) + "<br>" +
    "Reklam ve duyuru SMS/arama: " + durum(izinler.ticariTelefon && izinler.ticariTelefon.verildi) + "<br>" +
    "İzinlerinizi dilediğiniz zaman değiştirebilir ya da geri alabilirsiniz: " +
    '<a href="mailto:' + IZIN_ILETISIM_EPOSTA + '">' + IZIN_ILETISIM_EPOSTA + "</a> · " +
    '<a href="' + IYS_LINKI + '">iys.org.tr</a> · ' +
    '<a href="https://etkinlikler.bircicekkoleji.com/' + AYDINLATMA_LINKI + '">Aydınlatma Metni</a>' +
    "</div>"
  );
}

// Doğum tarihinden "3 yaş 4 ay" biçiminde yaş metni
function yasMetni(dogumTarihi) {
  if (!dogumTarihi) return "";
  var dogum = new Date(dogumTarihi);
  if (isNaN(dogum.getTime())) return "";
  var bugun = new Date();
  var ay = (bugun.getFullYear() - dogum.getFullYear()) * 12 + (bugun.getMonth() - dogum.getMonth());
  if (bugun.getDate() < dogum.getDate()) ay -= 1;
  if (ay < 0) return "";
  var yil = Math.floor(ay / 12);
  var kalanAy = ay % 12;
  if (yil === 0) return kalanAy + " aylık";
  return yil + " yaş" + (kalanAy ? " " + kalanAy + " ay" : "");
}
