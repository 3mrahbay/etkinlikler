/* ═══ ETKİNLİK SONRASI YORUM VE FOTOĞRAF ═══
   Veli: etkinlik bitince gelen bağlantıyla (?yorum=<etkinlikId>) ya da geçmiş etkinliğin detayından
   puan, yorum ve en fazla 5 fotoğraf bırakır. Yalnız o etkinliğe kaydı olan veli yazabilir.
   Yönetim: "Yorumlar" sayfasında onaylar, sitede gösterir, Instagram için seçer, isterse Google
   yorum daveti gönderir. Fotoğraflar Firebase Storage'da özel klasörde durur; yalnız yönetici görür.
   Firestore koleksiyonu: etkinlik_yorumlari (kurallar: kurallar/firestore-etkinlikler-blogu.rules)
   Storage yolu: etkinlik_yorumlari/{uid}/{dosya} (kurallar: kurallar/storage-etkinlik-yorumlari.rules) */

var YORUM_BAGLANTI_KOKU = "https://etkinlikler.bircicekkoleji.com/?yorum=";
var VARSAYILAN_GOOGLE_YORUM_LINKI = "https://search.google.com/local/writereview?placeid=ChIJEe3U8uHbyhQR_75zGX5PEDk";
var YORUM_EN_FAZLA_FOTO = 5;

function yorumBaglantisi(ev) { return YORUM_BAGLANTI_KOKU + encodeURIComponent(ev.id); }

// Ad + soyadın baş harfi: "Ayşe Kaya" → "Ayşe K."
function gorunenAdOlustur(ad, soyad) {
  var a = String(ad || "").trim(), s = String(soyad || "").trim();
  return (a + (s ? " " + s.charAt(0).toLocaleUpperCase("tr") + "." : "")).slice(0, 60) || "Katılımcı";
}

// Fotoğrafı tarayıcıda küçültür (en uzun kenar 1600 px, JPEG) — yükleme hızlı ve 5 MB altında kalır
function fotografKucult(dosya) {
  return new Promise(function (coz, reddet) {
    var url = URL.createObjectURL(dosya);
    var img = new Image();
    img.onload = function () {
      var oran = Math.min(1, 1600 / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * oran); c.height = Math.round(img.height * oran);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? coz(b) : reddet(new Error("Fotoğraf işlenemedi")); }, "image/jpeg", 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reddet(new Error("Fotoğraf okunamadı")); };
    img.src = url;
  });
}

function Yildizlar({ puan, setPuan, boyut }) {
  var b = boyut || 30;
  return (<div role={setPuan ? "radiogroup" : undefined} aria-label="Puan" style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map(function (i) {
      var dolu = i <= puan;
      var yildiz = <svg width={b} height={b} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill={dolu ? "#e9a23b" : "none"} stroke={dolu ? "#c9821b" : "#c9c2b6"} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
      return setPuan
        ? <button key={i} type="button" role="radio" aria-checked={puan === i} aria-label={i + " yıldız"} onClick={function () { setPuan(i); }} style={{ background: "none", border: "none", padding: 2, cursor: "pointer" }}>{yildiz}</button>
        : <span key={i}>{yildiz}</span>;
    })}
  </div>);
}

/* ── Veli formu ── */
function YorumFormu({ ev, kullanici, onGiris, onKapat }) {
  var [durum, setDurum] = React.useState("yukleniyor"); // yukleniyor | giris | kayitYok | zatenVar | form | gonderiliyor | tamam
  var [kayit, setKayit] = React.useState(null);
  var [puan, setPuan] = React.useState(0);
  var [yorum, setYorum] = React.useState("");
  var [fotolar, setFotolar] = React.useState([]); // {dosya, onizleme}
  var [izin, setIzin] = React.useState(false);
  var [hata, setHata] = React.useState("");

  React.useEffect(function () {
    if (!kullanici) { setDurum("giris"); return; }
    var eposta = (kullanici.email || "").toLowerCase();
    setDurum("yukleniyor");
    fbDb.collection("etkinlik_kayitlari").where("userEmail", "==", eposta).get().then(function (s) {
      var bulunan = s.docs.map(function (d) { var o = d.data(); o._docId = d.id; return o; }).filter(function (r) { return r.eventId === ev.id; })[0];
      if (!bulunan) { setDurum("kayitYok"); return; }
      setKayit(bulunan);
      return fbDb.collection("etkinlik_yorumlari").where("yazarUid", "==", kullanici.uid).get().then(function (y) {
        var var_ = y.docs.some(function (d) { return d.data().eventId === ev.id; });
        setDurum(var_ ? "zatenVar" : "form");
      });
    }).catch(function (e) { console.error("Yorum ön kontrolü:", e); setDurum("kayitYok"); });
  }, [kullanici && kullanici.uid, ev.id]);

  var fotoSec = function (e) {
    var yeni = Array.from(e.target.files || []).filter(function (f) { return /^image\//.test(f.type); });
    var bos = YORUM_EN_FAZLA_FOTO - fotolar.length;
    if (yeni.length > bos) setHata("En fazla " + YORUM_EN_FAZLA_FOTO + " fotoğraf ekleyebilirsiniz.");
    setFotolar(fotolar.concat(yeni.slice(0, bos).map(function (f) { return { dosya: f, onizleme: URL.createObjectURL(f) }; })));
    e.target.value = "";
  };

  var gonder = async function () {
    if (!puan) { setHata("Lütfen bir puan seçin."); return; }
    if (!yorum.trim() && !fotolar.length) { setHata("Lütfen birkaç cümle yazın ya da fotoğraf ekleyin."); return; }
    setHata(""); setDurum("gonderiliyor");
    try {
      var yollar = [];
      for (var i = 0; i < fotolar.length; i++) {
        var blob = await fotografKucult(fotolar[i].dosya);
        var yol = "etkinlik_yorumlari/" + kullanici.uid + "/" + ev.id + "_" + Date.now() + "_" + i + ".jpg";
        await fbStorage.ref(yol).put(blob, { contentType: "image/jpeg" });
        yollar.push(yol);
      }
      var simdi = new Date().toISOString();
      await fbDb.collection("etkinlik_yorumlari").add({
        eventId: ev.id,
        kayitId: kayit._docId,
        yazarUid: kullanici.uid,
        gorunenAd: gorunenAdOlustur(kayit.parent && kayit.parent.name, kayit.parent && kayit.parent.surname),
        puan: puan,
        yorum: yorum.trim().slice(0, 2000),
        fotolar: yollar,
        paylasimIzni: izin,
        izin: izin ? { metin: IZIN_METINLERI.yorumPaylasim, surum: IZIN_METIN_SURUMU, tarih: simdi } : null,
        durum: "bekliyor",
        sitedeGoster: false,
        olusturma: simdi
      });
      setDurum("tamam");
    } catch (e) {
      console.error("Yorum gönderilemedi:", e);
      setHata("Yorumunuz gönderilemedi. Lütfen biraz sonra tekrar deneyin.");
      setDurum("form");
    }
  };

  var kutu = { position: "fixed", inset: 0, background: "rgba(10,16,32,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 };
  var panel = { background: "#fff", borderRadius: 22, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.35)" };
  var ust = (<div style={{ background: "linear-gradient(135deg,#14213d,#1b2d55)", color: "#fff", padding: "18px 22px", borderRadius: "22px 22px 0 0", position: "relative" }}>
    <div style={{ fontFamily: ff, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#f1d27f" }}>ETKİNLİK SONRASI</div>
    <div style={{ fontFamily: ffT, fontWeight: 700, fontSize: 20, lineHeight: 1.25, marginTop: 4 }}>{ev.title}</div>
    <div style={{ fontFamily: ff, fontSize: 13, opacity: 0.8, marginTop: 4 }}>{fmtDate(ev.date)}</div>
    <button onClick={onKapat} aria-label="Kapat" style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
  </div>);
  var mesaj = function (baslik, metin, eylem) {
    return (<div style={{ padding: "28px 24px", textAlign: "center", fontFamily: ff }}>
      <div style={{ fontFamily: ffT, fontWeight: 700, fontSize: 20, color: "#14213d", marginBottom: 8 }}>{baslik}</div>
      <div style={{ fontSize: 14, color: "#5b6478", lineHeight: 1.6 }}>{metin}</div>
      {eylem}
    </div>);
  };

  var govde;
  if (durum === "yukleniyor") govde = mesaj("Bir saniye…", "Kaydınızı kontrol ediyoruz.");
  else if (durum === "giris") govde = mesaj("Önce giriş yapın", "Yorum bırakabilmek için etkinliğe kayıt olduğunuz Google hesabıyla giriş yapın.",
    <button onClick={onGiris} style={{ ...btnP, marginTop: 16, padding: "12px 22px" }}>Google ile giriş yap</button>);
  else if (durum === "kayitYok") govde = mesaj("Kaydınızı bulamadık", "Bu etkinliğe bu hesapla yapılmış bir kayıt görünmüyor. Kayıtta kullandığınız Google hesabıyla giriş yaptığınızdan emin olun.");
  else if (durum === "zatenVar") govde = mesaj("Yorumunuz bize ulaştı", "Bu etkinlik için daha önce yorum bıraktınız. Paylaşımınız için çok teşekkür ederiz.");
  else if (durum === "tamam") govde = mesaj("Teşekkür ederiz!", "Yorumunuz bize ulaştı. Okul ekibimiz inceledikten sonra" + (izin ? " izin verdiğiniz şekilde paylaşılabilir." : " yalnız kendi değerlendirmemiz için kullanılacak."),
    <button onClick={onKapat} style={{ ...btnS, marginTop: 16 }}>Kapat</button>);
  else govde = (<div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 16, fontFamily: ff }}>
    <div>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#14213d", marginBottom: 6 }}>Etkinlik nasıldı?</div>
      <Yildizlar puan={puan} setPuan={setPuan} boyut={34} />
    </div>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontWeight: 800, fontSize: 14, color: "#14213d" }}>Duygu ve düşünceleriniz</span>
      <textarea value={yorum} onChange={function (e) { setYorum(e.target.value.slice(0, 2000)); }} rows={5} placeholder="Neler hissettiniz, sizin için en anlamlı an neydi?" style={{ ...inp(false), resize: "vertical", minHeight: 110 }} />
      <span style={{ fontSize: 11, color: "#8a91a3", alignSelf: "flex-end" }}>{yorum.length}/2000</span>
    </label>
    <div>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#14213d", marginBottom: 6 }}>Fotoğraflar <span style={{ fontWeight: 600, color: "#8a91a3" }}>(isteğe bağlı, en fazla {YORUM_EN_FAZLA_FOTO})</span></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fotolar.map(function (f, i) {
          return (<div key={i} style={{ position: "relative", width: 76, height: 76, borderRadius: 12, overflow: "hidden", border: "1px solid #e4dfd3" }}>
            <img src={f.onizleme} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={function () { setFotolar(fotolar.filter(function (_, j) { return j !== i; })); }} aria-label="Fotoğrafı kaldır" style={{ position: "absolute", top: 3, right: 3, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
          </div>);
        })}
        {fotolar.length < YORUM_EN_FAZLA_FOTO && <label style={{ width: 76, height: 76, borderRadius: 12, border: "2px dashed #c9c2b6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7385", fontSize: 26 }}>
          +<input type="file" accept="image/*" multiple onChange={fotoSec} style={{ display: "none" }} />
        </label>}
      </div>
    </div>
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f7f4ee", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
      <input type="checkbox" checked={izin} onChange={function (e) { setIzin(e.target.checked); }} style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0 }} />
      <span style={{ fontSize: 12, lineHeight: 1.55, color: "#3a4256" }}>{IZIN_METINLERI.yorumPaylasim} <a href={AYDINLATMA_LINKI} target="_blank" rel="noopener noreferrer" style={{ color: "#1b2d55" }}>Aydınlatma Metni</a><br /><span style={{ color: "#6b7385" }}>{IZIN_METINLERI.yorumPaylasimNot}</span></span>
    </label>
    {hata && <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{hata}</div>}
    <button onClick={gonder} disabled={durum === "gonderiliyor"} style={{ ...btnP, padding: "13px 20px", fontSize: 15, opacity: durum === "gonderiliyor" ? 0.6 : 1 }}>{durum === "gonderiliyor" ? "Gönderiliyor…" : "Gönder"}</button>
  </div>);

  return (<div style={kutu} onClick={function (e) { if (e.target === e.currentTarget) onKapat(); }}><div className="fade-in" style={panel}>{ust}{govde}</div></div>);
}

/* ── Herkese açık: etkinlik detayında onaylı yorumlar ── */
function OnayliYorumlar({ ev }) {
  var [liste, setListe] = React.useState([]);
  React.useEffect(function () {
    fbDb.collection("etkinlik_yorumlari").where("eventId", "==", ev.id).where("durum", "==", "onaylandi")
      .where("paylasimIzni", "==", true).where("sitedeGoster", "==", true).get()
      .then(function (s) { setListe(s.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return (b.olusturma || "").localeCompare(a.olusturma || ""); })); })
      .catch(function () { setListe([]); });
  }, [ev.id]);
  if (!liste.length) return null;
  return (<div style={{ marginTop: 16 }}>
    <div style={{ fontFamily: ffT, fontWeight: 700, fontSize: 17, color: "#14213d", marginBottom: 10 }}>Katılımcılar ne dedi?</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {liste.map(function (y, i) {
        return (<figure key={i} style={{ margin: 0, background: "#f7f4ee", borderRadius: 14, padding: "12px 14px" }}>
          <Yildizlar puan={y.puan} boyut={16} />
          <blockquote style={{ margin: "6px 0 6px", fontFamily: ff, fontSize: 14, color: "#3a4256", lineHeight: 1.6 }}>{y.yorum}</blockquote>
          <figcaption style={{ fontFamily: ff, fontSize: 12, fontWeight: 700, color: "#6b7385" }}>— {y.gorunenAd}</figcaption>
        </figure>);
      })}
    </div>
  </div>);
}

/* ── Yönetim: Yorumlar sayfası ── */
var YORUM_DURUMLARI = { bekliyor: { ad: "Onay bekliyor", renk: "#9a3412", zemin: "#fff1e6" }, onaylandi: { ad: "Onaylandı", renk: "#166534", zemin: "#e7f6ec" }, reddedildi: { ad: "Reddedildi", renk: "#6b7385", zemin: "#f2efe8" } };

function YorumFotografi({ yol }) {
  var [url, setUrl] = React.useState("");
  React.useEffect(function () { fbStorage.ref(yol).getDownloadURL().then(setUrl).catch(function () { setUrl(""); }); }, [yol]);
  if (!url) return <span style={{ width: 84, height: 84, borderRadius: 10, background: "#ece8df", display: "inline-block" }} />;
  return <a href={url} target="_blank" rel="noopener noreferrer" title="Tam boyutu aç"><img src={url} alt="Veli fotoğrafı" style={{ width: 84, height: 84, borderRadius: 10, objectFit: "cover", display: "block" }} /></a>;
}

function YorumlarYonetimi({ events, regs, settings }) {
  var [yorumlar, setYorumlar] = React.useState([]);
  var [yukleniyor, setYukleniyor] = React.useState(true);
  var [filtre, setFiltre] = React.useState("bekliyor");
  var [bildirim, setBildirim] = React.useState("");
  var googleLinki = (settings && settings.googleYorumLinki) || VARSAYILAN_GOOGLE_YORUM_LINKI;

  React.useEffect(function () {
    var dur = fbDb.collection("etkinlik_yorumlari").onSnapshot(function (s) {
      setYorumlar(s.docs.map(function (d) { var o = d.data(); o._docId = d.id; return o; }).sort(function (a, b) { return (b.olusturma || "").localeCompare(a.olusturma || ""); }));
      setYukleniyor(false);
    }, function (e) { console.error("Yorumlar okunamadı:", e); setYukleniyor(false); });
    return dur;
  }, []);

  var goster = function (m) { setBildirim(m); setTimeout(function () { setBildirim(""); }, 3500); };
  var guncelle = function (y, alanlar) { return fbDb.collection("etkinlik_yorumlari").doc(y._docId).update(alanlar).catch(function (e) { console.error(e); goster("Güncellenemedi"); }); };
  var etkinlikAdi = function (id) { var e = events.find(function (x) { return x.id === id; }); return e ? e.title : id; };
  var kayitBul = function (y) { return (regs || []).find(function (r) { return r._docId === y.kayitId; }); };

  var googleDavetiGonder = function (y) {
    var r = kayitBul(y);
    if (!r || !r.parent || !r.parent.email) { goster("Velinin e-postası bulunamadı"); return; }
    if (!confirm((r.parent.name || "") + " " + (r.parent.surname || "") + " (" + r.parent.email + ") adresine Google yorum daveti gönderilsin mi?")) return;
    var ad = r.parent.name || "";
    var html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#14213d">' +
      '<div style="background:#14213d;padding:22px;text-align:center;border-radius:12px 12px 0 0"><div style="color:#f1d27f;font-size:12px;letter-spacing:2px;font-weight:bold">BİR ÇİÇEK KOLEJİ ANAOKULU</div></div>' +
      '<div style="padding:24px;background:#fff;border:1px solid #ece6da;border-top:none;border-radius:0 0 12px 12px;line-height:1.6">' +
      '<p>Merhaba ' + ad + ',</p>' +
      '<p><b>' + etkinlikAdi(y.eventId) + '</b> sonrasında paylaştığınız güzel düşünceler için çok teşekkür ederiz. Bu sözler ekibimiz için çok kıymetli.</p>' +
      '<p>Deneyiminizi Google\'da da paylaşmak isterseniz, başka ailelerin okulumuzu tanımasına yardımcı olur. Elbette tamamen isteğe bağlıdır.</p>' +
      '<p style="text-align:center;margin:26px 0"><a href="' + googleLinki + '" style="background:#c2410c;color:#fff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;display:inline-block">Google\'da değerlendir</a></p>' +
      '<p>Sevgiyle,<br>Bir Çiçek Koleji Anaokulu</p></div></div>';
    brevoMail(r.parent.email, ((r.parent.name || "") + " " + (r.parent.surname || "")).trim(), "Paylaşımınız için teşekkürler | Bir Çiçek Koleji", html, SCHOOL_EMAIL);
    guncelle(y, { googleDavet: { gonderildi: true, tarih: new Date().toISOString() } });
    goster("Google yorum daveti gönderildi");
  };

  // Biten etkinliklere teşekkür + yorum daveti
  var bitenler = events.filter(function (e) { return etkinlikBitti(e); }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 6);
  var davetGonder = async function (ev) {
    var katilimcilar = (regs || []).filter(function (r) { return r.eventId === ev.id && r.parent && r.parent.email; });
    var tekil = {}; katilimcilar.forEach(function (r) { tekil[r.parent.email.toLowerCase()] = r; });
    var liste = Object.values(tekil);
    if (!liste.length) { goster("Bu etkinliğin kaydı yok"); return; }
    if (!confirm(ev.title + "\n\n" + liste.length + " kişiye teşekkür ve yorum daveti e-postası gönderilsin mi?" + (ev.yorumDavetiTarihi ? "\n\nNot: " + fmtDate(ev.yorumDavetiTarihi) + " tarihinde zaten gönderilmiş." : ""))) return;
    liste.forEach(function (r) {
      var html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#14213d">' +
        '<div style="background:#14213d;padding:22px;text-align:center;border-radius:12px 12px 0 0"><div style="color:#f1d27f;font-size:12px;letter-spacing:2px;font-weight:bold">BİR ÇİÇEK KOLEJİ ANAOKULU</div></div>' +
        '<div style="padding:24px;background:#fff;border:1px solid #ece6da;border-top:none;border-radius:0 0 12px 12px;line-height:1.6">' +
        '<p>Merhaba ' + (r.parent.name || "") + ',</p>' +
        '<p><b>' + ev.title + '</b> etkinliğimize katıldığınız için teşekkür ederiz. Sizinle olmak çok güzeldi.</p>' +
        '<p>Etkinlik nasıldı? Birkaç cümleyle duygu ve düşüncelerinizi, isterseniz o günden fotoğraflarınızı bizimle paylaşır mısınız? Görüşleriniz sonraki buluşmaları birlikte güzelleştirmemize yardımcı olur.</p>' +
        '<p style="text-align:center;margin:26px 0"><a href="' + yorumBaglantisi(ev) + '" style="background:#c2410c;color:#fff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;display:inline-block">Yorumumu paylaş</a></p>' +
        '<p style="font-size:12px;color:#6b7385">Paylaşımınızın sitemizde ya da sosyal medyada yer alması yalnızca sizin izninizle olur.</p>' +
        '<p>Sevgiyle,<br>Bir Çiçek Koleji Anaokulu</p></div></div>';
      brevoMail(r.parent.email, ((r.parent.name || "") + " " + (r.parent.surname || "")).trim(), ev.title + " — nasıldı? | Bir Çiçek Koleji", html, SCHOOL_EMAIL);
    });
    await fbDb.collection("etkinlikler").doc(ev._docId || ev.id).update({ yorumDavetiTarihi: new Date().toISOString() }).catch(function (e) { console.error(e); });
    goster(liste.length + " kişiye davet gönderildi");
  };

  var gorunen = yorumlar.filter(function (y) { return filtre === "hepsi" || y.durum === filtre; });
  var sayi = function (d) { return yorumlar.filter(function (y) { return y.durum === d; }).length; };
  var kart = { background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 4px 18px rgba(20,33,61,0.06)" };

  return (<div style={{ fontFamily: ff }}>
    <h2 style={{ fontFamily: ffT, color: "#14213d", margin: "0 0 18px", fontSize: 24 }}>💬 Yorumlar</h2>
    {bildirim && <div style={{ position: "fixed", top: 20, right: 20, background: "#e7f6ec", border: "2px solid #a7d7b5", borderRadius: 12, padding: "12px 18px", zIndex: 2000, fontWeight: 700, fontSize: 13, color: "#166534" }}>{bildirim}</div>}

    <div style={{ ...kart, marginBottom: 18 }}>
      <div style={{ fontWeight: 800, color: "#14213d", fontSize: 14, marginBottom: 4 }}>Biten etkinlikler — yorum daveti</div>
      <div style={{ fontSize: 12, color: "#6b7385", marginBottom: 12 }}>Katılımcılara teşekkür e-postası gider; içinde yorum ve fotoğraf paylaşma bağlantısı vardır.</div>
      {bitenler.length ? bitenler.map(function (ev) {
        var n = (regs || []).filter(function (r) { return r.eventId === ev.id; }).length;
        return (<div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid #f0ece3", flexWrap: "wrap" }}>
          <div><div style={{ fontWeight: 700, fontSize: 13, color: "#14213d" }}>{ev.title}</div><div style={{ fontSize: 12, color: "#6b7385" }}>{fmtDate(ev.date)} · {n} kayıt{ev.yorumDavetiTarihi ? " · davet gönderildi: " + fmtDate(ev.yorumDavetiTarihi) : ""}</div></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={function () { navigator.clipboard && navigator.clipboard.writeText(yorumBaglantisi(ev)); goster("Bağlantı kopyalandı"); }} style={{ ...btnS, fontSize: 12, padding: "7px 12px" }}>Bağlantıyı kopyala</button>
            <button onClick={function () { davetGonder(ev); }} style={{ ...btnP, fontSize: 12, padding: "7px 12px" }}>{ev.yorumDavetiTarihi ? "Tekrar gönder" : "Davet gönder"}</button>
          </div>
        </div>);
      }) : <div style={{ fontSize: 13, color: "#8a91a3" }}>Henüz biten etkinlik yok.</div>}
    </div>

    <div role="group" aria-label="Duruma göre" style={{ display: "inline-flex", background: "#f2efe8", borderRadius: 12, padding: 4, marginBottom: 14, flexWrap: "wrap" }}>
      {[["bekliyor", "Onay bekleyen"], ["onaylandi", "Onaylanan"], ["reddedildi", "Reddedilen"], ["hepsi", "Tümü"]].map(function (f) {
        return <button key={f[0]} onClick={function () { setFiltre(f[0]); }} style={{ border: "none", borderRadius: 9, padding: "8px 12px", background: filtre === f[0] ? "#fff" : "transparent", boxShadow: filtre === f[0] ? "0 1px 4px rgba(0,0,0,0.08)" : "none", color: filtre === f[0] ? "#14213d" : "#5b6478", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{f[1]}{f[0] !== "hepsi" ? " (" + sayi(f[0]) + ")" : ""}</button>;
      })}
    </div>

    {yukleniyor ? <div style={{ color: "#8a91a3" }}>Yükleniyor…</div> : !gorunen.length ? <div style={{ ...kart, color: "#8a91a3", textAlign: "center" }}>Bu bölümde yorum yok.</div> :
      <div style={{ display: "grid", gap: 14 }}>
        {gorunen.map(function (y) {
          var d = YORUM_DURUMLARI[y.durum] || YORUM_DURUMLARI.bekliyor;
          return (<div key={y._docId} style={kart}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <div><div style={{ fontWeight: 800, color: "#14213d", fontSize: 14 }}>{y.gorunenAd}</div><div style={{ fontSize: 12, color: "#6b7385" }}>{etkinlikAdi(y.eventId)} · {y.olusturma ? new Date(y.olusturma).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : ""}</div></div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: d.zemin, color: d.renk, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{d.ad}</span>
                <span style={{ background: y.paylasimIzni ? "#e8edf7" : "#f2efe8", color: y.paylasimIzni ? "#1b2d55" : "#6b7385", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{y.paylasimIzni ? "Paylaşım izni var" : "Paylaşım izni yok"}</span>
                {y.googleDavet && y.googleDavet.gonderildi && <span style={{ background: "#fff7e0", color: "#8a5a00", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>Google daveti gitti</span>}
              </div>
            </div>
            <Yildizlar puan={y.puan} boyut={18} />
            {y.yorum && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#3a4256", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{y.yorum}</p>}
            {y.fotolar && y.fotolar.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{y.fotolar.map(function (yol) { return <YorumFotografi key={yol} yol={yol} />; })}</div>}
            {y.fotolar && y.fotolar.length > 0 && <div style={{ fontSize: 11, color: "#9a3412", marginTop: 6 }}>Paylaşmadan önce fotoğraflardaki çocuk yüzleri kapatılmalıdır.</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0ece3" }}>
              {y.durum !== "onaylandi" && <button onClick={function () { guncelle(y, { durum: "onaylandi" }); }} style={{ ...btnP, fontSize: 12, padding: "7px 12px" }}>Onayla</button>}
              {y.durum !== "reddedildi" && <button onClick={function () { guncelle(y, { durum: "reddedildi", sitedeGoster: false }); }} style={{ ...btnS, fontSize: 12, padding: "7px 12px", borderColor: "#c9c2b6", color: "#5b6478" }}>Reddet</button>}
              {y.durum === "onaylandi" && y.paylasimIzni && <button onClick={function () { guncelle(y, { sitedeGoster: !y.sitedeGoster }); }} style={{ ...btnS, fontSize: 12, padding: "7px 12px" }}>{y.sitedeGoster ? "Siteden kaldır" : "Sitede göster"}</button>}
              {y.durum === "onaylandi" && y.paylasimIzni && <button onClick={function () { guncelle(y, { instagramSecildi: !y.instagramSecildi }); }} style={{ ...btnS, fontSize: 12, padding: "7px 12px", borderColor: y.instagramSecildi ? "#b8236a" : undefined, color: y.instagramSecildi ? "#b8236a" : undefined }}>{y.instagramSecildi ? "Instagram listesinde ✓" : "Instagram için seç"}</button>}
              {y.durum === "onaylandi" && <button onClick={function () { googleDavetiGonder(y); }} style={{ ...btnS, fontSize: 12, padding: "7px 12px" }}>{y.googleDavet && y.googleDavet.gonderildi ? "Google davetini tekrar gönder" : "Google yorum daveti gönder"}</button>}
            </div>
          </div>);
        })}
      </div>}
  </div>);
}
