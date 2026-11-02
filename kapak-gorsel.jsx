/* ═══ KAPAK GÖRSELİ: KIRPMA / ODAK NOKTASI AYARI VE TAM GÖRSEL PENCERESİ ═══
   Kapak görseli dosyası değiştirilmez; etkinliğe yalnızca nasıl gösterileceği yazılır:
     ev.kapakAyar = { mod: "kirp" | "sigdir", x: 0–100, y: 0–100, yakinlik: 1–3 }
   - "kirp": görsel kutuyu doldurur; x/y görselin hangi noktasının ortada kalacağını, yakinlik yakınlaştırmayı belirler.
   - "sigdir": görselin tamamı görünür; boşluklar aynı görselin bulanık hâliyle doldurulur (afişler için).
   kapakAyar olmayan eski etkinlikler eskisi gibi ortadan kırpılarak görünür. */

const KAPAK_VARSAYILAN = { mod: "kirp", x: 50, y: 50, yakinlik: 1 };

// Sitede kapak görselinin göründüğü kutular (önizleme ve kırpma çerçevesi için en/boy)
const KAPAK_KUTULARI = [
  { ad: "Etkinlik kartı", en: 360, boy: 190 },
  { ad: "Sıradaki etkinlik", en: 440, boy: 190 },
  { ad: "Detay penceresi", en: 520, boy: 200 },
  { ad: "Küçük liste", en: 64, boy: 64 },
];

function sinirla(deger, alt, ust) { return Math.min(ust, Math.max(alt, deger)); }

function kapakAyariAl(ev) {
  const a = (ev && ev.kapakAyar) || {};
  return {
    mod: a.mod === "sigdir" ? "sigdir" : "kirp",
    x: sinirla(Number.isFinite(+a.x) ? +a.x : 50, 0, 100),
    y: sinirla(Number.isFinite(+a.y) ? +a.y : 50, 0, 100),
    yakinlik: sinirla(Number.isFinite(+a.yakinlik) ? +a.yakinlik : 1, 1, 3),
  };
}

/* Kapak görselini verilen kutuyu dolduracak şekilde, kapakAyar'a göre çizer.
   Kutunun kendisi (yükseklik, köşe) dışarıdan verilir; bu bileşen %100 genişlik/yükseklik kaplar. */
function KapakResmi({ src, ayar, filtre, alt }) {
  const a = kapakAyariAl({ kapakAyar: ayar });
  const tam = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" };
  if (a.mod === "sigdir") {
    return (
      <span style={{ position: "relative", display: "block", width: "100%", height: "100%", overflow: "hidden", background: "#e9e4d8" }}>
        <img src={src} alt="" aria-hidden="true" style={{ ...tam, objectFit: "cover", filter: "blur(18px) brightness(0.85)", transform: "scale(1.15)" }} />
        <img src={src} alt={alt || ""} style={{ ...tam, objectFit: "contain", filter: filtre || "none" }} />
      </span>
    );
  }
  const konum = a.x + "% " + a.y + "%";
  return (
    <span style={{ position: "relative", display: "block", width: "100%", height: "100%", overflow: "hidden" }}>
      <img src={src} alt={alt || ""} style={{ ...tam, objectFit: "cover", objectPosition: konum, transform: a.yakinlik > 1 ? "scale(" + a.yakinlik + ")" : "none", transformOrigin: konum, filter: filtre || "none" }} />
    </span>
  );
}

/* Kırp modunda, en/boy oranı verilen bir kutuda görselin hangi bölümünün göründüğünü
   görselin kendi ölçüsünde yüzde olarak hesaplar (düzenleyicideki çerçeve için). */
function gorunenBolge(gorselEn, gorselBoy, kutuEn, kutuBoy, a) {
  const olcek = Math.max(kutuEn / gorselEn, kutuBoy / gorselBoy);
  const gEn = gorselEn * olcek, gBoy = gorselBoy * olcek;
  const kaymaX = (gEn - kutuEn) * a.x / 100, kaymaY = (gBoy - kutuBoy) * a.y / 100;
  const px = kutuEn * a.x / 100, py = kutuBoy * a.y / 100, z = a.yakinlik;
  const solKutu = px * (1 - 1 / z), ustKutu = py * (1 - 1 / z);
  return {
    sol: (solKutu + kaymaX) / gEn * 100,
    ust: (ustKutu + kaymaY) / gBoy * 100,
    en: kutuEn / z / gEn * 100,
    boy: kutuBoy / z / gBoy * 100,
  };
}

/* Yönetim panelinde kapak düzenleme penceresi */
function KapakDuzenleyici({ src, ayar, uygula, kapat }) {
  const [a, setA] = React.useState(kapakAyariAl({ kapakAyar: ayar }));
  const [boyut, setBoyut] = React.useState(null);
  const alanRef = React.useRef(null);
  const surukleniyor = React.useRef(false);

  React.useEffect(() => {
    const tus = (e) => { if (e.key === "Escape") kapat(); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [kapat]);

  const noktaAyarla = (e) => {
    const kutu = alanRef.current && alanRef.current.getBoundingClientRect();
    if (!kutu) return;
    const nokta = e.touches ? e.touches[0] : e;
    const x = sinirla((nokta.clientX - kutu.left) / kutu.width * 100, 0, 100);
    const y = sinirla((nokta.clientY - kutu.top) / kutu.height * 100, 0, 100);
    setA((onceki) => ({ ...onceki, mod: "kirp", x: Math.round(x), y: Math.round(y) }));
  };
  const basla = (e) => { if (a.mod !== "kirp") return; surukleniyor.current = true; noktaAyarla(e); };
  const hareket = (e) => { if (surukleniyor.current) { e.preventDefault(); noktaAyarla(e); } };
  const bitir = () => { surukleniyor.current = false; };

  const cerceve = boyut && a.mod === "kirp" ? gorunenBolge(boyut.en, boyut.boy, KAPAK_KUTULARI[0].en, KAPAK_KUTULARI[0].boy, a) : null;
  const sekmeStili = (secili) => ({ flex: 1, padding: "9px 10px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: ff, fontWeight: 700, fontSize: 13, background: secili ? "#fff" : "transparent", color: secili ? G : "#5b6478", boxShadow: secili ? "0 1px 4px rgba(0,0,0,0.12)" : "none" });

  return (
    <div onClick={kapat} style={{ position: "fixed", inset: 0, background: "rgba(10,16,32,0.6)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Kapak görselini düzenle" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 980, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eef0f5" }}>
          <div>
            <div style={{ fontFamily: ffT, fontWeight: 700, fontSize: 18, color: "#14213d" }}>Kapak görselini düzenle</div>
            <div style={{ fontFamily: ff, fontSize: 12, color: "#6b7385", marginTop: 2 }}>Görsel dosyası değişmez; yalnızca sitede nasıl görüneceği ayarlanır.</div>
          </div>
          <button onClick={kapat} aria-label="Kapat" style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#f2f4f9", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: 20 }}>
          {/* Sol: görselin tamamı ve odak noktası */}
          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <div style={{ display: "flex", background: "#f2f4f9", borderRadius: 10, padding: 4, gap: 4, marginBottom: 12 }}>
              <button onClick={() => setA({ ...a, mod: "kirp" })} style={sekmeStili(a.mod === "kirp")}>✂️ Kırp ve odakla</button>
              <button onClick={() => setA({ ...a, mod: "sigdir" })} style={sekmeStili(a.mod === "sigdir")}>🖼️ Tamamını göster</button>
            </div>
            <p style={{ fontFamily: ff, fontSize: 12, color: "#5b6478", margin: "0 0 10px", lineHeight: 1.5 }}>
              {a.mod === "kirp"
                ? "Görselde ortada kalmasını istediğiniz yere tıklayın ya da noktayı sürükleyin. Kesikli çerçeve, etkinlik kartında görünecek bölümdür."
                : "Görselin tamamı kutuya sığdırılır, kenarlardaki boşluk aynı görselin bulanık hâliyle dolar. Afiş gibi dik görseller için uygundur."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", background: "#1f2433", borderRadius: 12, padding: 10 }}>
              <div ref={alanRef}
                onMouseDown={basla} onMouseMove={hareket} onMouseUp={bitir} onMouseLeave={bitir}
                onTouchStart={basla} onTouchMove={hareket} onTouchEnd={bitir}
                style={{ position: "relative", display: "inline-block", lineHeight: 0, cursor: a.mod === "kirp" ? "crosshair" : "default", userSelect: "none", touchAction: "none" }}>
                <img src={src} alt="" draggable={false}
                  onLoad={(e) => setBoyut({ en: e.currentTarget.naturalWidth, boy: e.currentTarget.naturalHeight })}
                  style={{ maxWidth: "100%", maxHeight: "52vh", display: "block", borderRadius: 6 }} />
                {cerceve && <>
                  {/* Çerçeve dışını karart */}
                  <span style={{ position: "absolute", left: cerceve.sol + "%", top: cerceve.ust + "%", width: cerceve.en + "%", height: cerceve.boy + "%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", border: "2px dashed #fff", borderRadius: 4, pointerEvents: "none" }} />
                  <span style={{ position: "absolute", left: a.x + "%", top: a.y + "%", width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: "50%", border: "3px solid #fff", background: TURL, boxShadow: "0 0 0 2px rgba(0,0,0,0.35)", pointerEvents: "none" }} />
                </>}
              </div>
            </div>
            {a.mod === "kirp" && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontFamily: ff, fontSize: 13, fontWeight: 700, color: G }}>
                Yakınlaştır
                <input type="range" min="1" max="3" step="0.05" value={a.yakinlik} onChange={(e) => setA({ ...a, yakinlik: +e.target.value })} style={{ flex: 1, accentColor: TUR }} />
                <span style={{ width: 44, textAlign: "right", fontWeight: 600, color: "#5b6478" }}>{a.yakinlik.toFixed(1)}×</span>
              </label>
            )}
          </div>

          {/* Sağ: sitedeki görünümler */}
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            <div style={{ fontFamily: ff, fontWeight: 800, fontSize: 13, color: G, marginBottom: 8 }}>Sitede böyle görünecek</div>
            <div style={{ display: "grid", gap: 12 }}>
              {KAPAK_KUTULARI.slice(0, 3).map((k) => (
                <div key={k.ad}>
                  <div style={{ fontFamily: ff, fontSize: 11, fontWeight: 700, color: "#6b7385", marginBottom: 4 }}>{k.ad}</div>
                  <div style={{ width: "100%", aspectRatio: k.en + " / " + k.boy, borderRadius: 10, overflow: "hidden", background: "#e9e4d8" }}>
                    <KapakResmi src={src} ayar={a} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flex: "none" }}><KapakResmi src={src} ayar={a} /></div>
                <div style={{ fontFamily: ff, fontSize: 11, fontWeight: 700, color: "#6b7385" }}>Küçük liste ve yönetim paneli</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", bottom: 0, zIndex: 2, background: "#fff", display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", padding: "14px 20px", borderTop: "1px solid #eef0f5" }}>
          <button onClick={() => setA({ ...KAPAK_VARSAYILAN })} style={{ ...btnS, borderColor: "#c9cfdc", color: "#5b6478" }}>Sıfırla</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={kapat} style={btnS}>Vazgeç</button>
            <button onClick={() => { uygula(a); kapat(); }} style={btnP}>Uygula</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Görsellerin tamamını büyük gösteren pencere (ziyaretçi tarafı) */
function GorselPenceresi({ gorseller, baslangic, baslik, kapat }) {
  const [sira, setSira] = React.useState(baslangic || 0);
  const adet = gorseller.length;
  const git = (fark) => setSira((s) => (s + fark + adet) % adet);
  React.useEffect(() => {
    const tus = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); kapat(); }
      else if (e.key === "ArrowRight" && adet > 1) git(1);
      else if (e.key === "ArrowLeft" && adet > 1) git(-1);
    };
    window.addEventListener("keydown", tus, true);
    return () => window.removeEventListener("keydown", tus, true);
  }, [adet, kapat]);
  const okStili = (taraf) => ({ position: "absolute", [taraf]: 12, top: "50%", transform: "translateY(-50%)", width: 46, height: 46, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.92)", color: "#14213d", fontSize: 22, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.3)" });
  return (
    <div onClick={kapat} role="dialog" aria-modal="true" aria-label={(baslik || "Etkinlik") + " görseli"} style={{ position: "fixed", inset: 0, background: "rgba(8,12,24,0.88)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 16px 40px" }}>
      <button onClick={kapat} aria-label="Kapat" style={{ position: "absolute", top: 12, right: 12, width: 42, height: 42, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.92)", fontSize: 18, cursor: "pointer" }}>✕</button>
      <img src={gorseller[sira]} alt={baslik || ""} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", background: "#fff" }} />
      {adet > 1 && <>
        <button onClick={(e) => { e.stopPropagation(); git(-1); }} aria-label="Önceki görsel" style={okStili("left")}>‹</button>
        <button onClick={(e) => { e.stopPropagation(); git(1); }} aria-label="Sonraki görsel" style={okStili("right")}>›</button>
        <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", color: "#fff", fontFamily: ff, fontSize: 13, fontWeight: 700 }}>{sira + 1} / {adet}</div>
      </>}
    </div>
  );
}

/* Detay penceresinde küçük kutucuk(lar): görselin tamamını gösterir, tıklayınca büyük açılır */
function TamGorselKutulari({ gorseller, baslik }) {
  const [acik, setAcik] = React.useState(null);
  const liste = (gorseller || []).filter(Boolean);
  if (!liste.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: ff, fontSize: 10, color: "#888", fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 }}>{liste.length > 1 ? "GÖRSELLER" : "GÖRSELİN TAMAMI"}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {liste.map((g, i) => (
          <button key={g + i} onClick={() => setAcik(i)} aria-label={"Görseli büyüt" + (liste.length > 1 ? " (" + (i + 1) + ")" : "")} title="Büyütmek için tıklayın"
            style={{ position: "relative", width: 84, height: 112, padding: 0, border: "1px solid #dde3ef", borderRadius: 10, background: "#f2f4f9", cursor: "zoom-in", overflow: "hidden" }}>
            <img src={g} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            <span aria-hidden="true" style={{ position: "absolute", right: 5, bottom: 5, width: 24, height: 24, borderRadius: "50%", background: "rgba(20,33,61,0.82)", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🔍</span>
          </button>
        ))}
      </div>
      {acik !== null && <GorselPenceresi gorseller={liste} baslangic={acik} baslik={baslik} kapat={() => setAcik(null)} />}
    </div>
  );
}
