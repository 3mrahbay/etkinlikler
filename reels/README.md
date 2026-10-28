# Etkinlik Reels üreticisi

Yönetim panelinde bir etkinliğe **Instagram Reels: Normal gönderi** ya da **Ücretli reklam** seçildiğinde,
etkinliğin `instagram` alanı `durum: "hazirlanacak"` olur. Zamanlanmış görev (ya da istek üzerine bir Claude
oturumu) bu dosyadaki adımlarla seslendirmeli, animasyonlu bir Reels ve paylaşım metnini hazırlar.

## 1. Bekleyen istekleri bul

Etkinlikler herkese açık okunur:

```
curl -s "https://firestore.googleapis.com/v1/projects/bcka-site/databases/(default)/documents/etkinlikler?pageSize=300&key=AIzaSyARlqAoh-HRBC9xPwj7qRgG-IuZFSH39Uc"
```

Hazırlanacaklar: `status == "published"`, `instagram.paylasimTuru` `organik` ya da `reklam`,
`instagram.durum == "hazirlanacak"` ve `reels/uretilenler.json` içinde **aynı `id` + `istekTarihi`** yok.
Etkinlik tarihi geçmişse atlanır.

## 2. Seslendirme metni

- Yalnız etkinlikte yazan bilgiler kullanılır (başlık, açıklama, tarih, saat, yer, ücret, katılımcı türü,
  kimlere açık, `instagram.not`). Bilinmeyen hiçbir şey (ücret, kontenjan, ödül) uydurulmaz.
- 20–28 saniye (yaklaşık 55–75 kelime). İlk cümle bir kanca: kime seslendiğini söyler ("Babalar…", "Anneler…").
- Adres okutulmaz; "Kayıt bağlantısı profilimizde" denir.
- Ses (model `eleven_v4`, `generations_count: 1`), katılımcı türüne göre:
  - `anneler`, `anneCocuk` → kadın sesi **Begonvil** `AHe3yhPzR46IM8ONphwK`
  - diğerleri (`babalar`, `babaCocuk`, `aile`, `ebeveynler`) → **Kadir Kayışcı** `j82ax9yhzfYwq9lDvRWL`
- Duygu etiketleri az ve yerinde: `[warmly]`, `[short pause]`, `[pause]`. Bağırır gibi coşku (`[excited]`)
  yerine, öne çıkacak cümle sır verir gibi kısık söylenir: `[whispers] Aramızda kalsın… okul dışından annelere de açık.`
- Ses indirilir, `ffmpeg -i ses.mp3 -af silencedetect=noise=-35dB:d=0.35 -f null -` ile duraklar bulunur;
  sahne `agirlik` değerleri bu aralıklara göre verilir.

## 3. veri.json

```json
{
  "renk": "#a2365f", "zemin": "#fbe6ee", "koyu": "#3b1527",
  "sahneler": [
    {"tur": "kanca", "agirlik": 3.5, "koyuZemin": true, "ustRozet": "KİTAP KULÜBÜ", "buyuk": "*Anneler…*", "kucuk": "bu akşam biraz da kendimize zaman ayıralım."},
    {"tur": "baslik", "agirlik": 6, "cizim": "kitapCay", "ustRozet": "2. BULUŞMA", "baslik": "Ebeveynliği Hissetmek", "alt": "Jennifer Day"},
    {"tur": "metin", "agirlik": 7, "metin": "… *vurgulanan* kelimeler yıldızla …"},
    {"tur": "bilgi", "agirlik": 5.5, "kartlar": [{"ikon": "takvim", "etiket": "TARİH", "deger": "26 Kasım Perşembe"}]},
    {"tur": "cta", "agirlik": 4.4, "rozetler": ["Annelere özel", "Okul dışına açık"], "baslik": "Kayıt zorunlu", "dugme": "Bağlantı profilimizde", "adres": "etkinlikler.bircicekkoleji.com"}
  ]
}
```

- Renkler `etkinlik-turleri.js` içindeki katılımcı türünden alınır (`renk`, `zemin`); `koyu` aynı tonun çok koyusu.
- İkonlar: `takvim`, `saat`, `konum`, `kisi`, `kitap`, `ucret`. Çizimler: `kitapCay`, `yapraklar`.
- **Fotoğraf kullanılmaz** (sosyal medyada çocuk yüzü görünmeme kuralı); sahneler çizim ve yazıyla kurulur.
- Kapanış: okul logosu + "Bir Çiçek Koleji Anaokulu · Tuzla" (kendiliğinden eklenir).

## 4. Videoyu üret

```
python3 reels/uret.py --veri veri.json --ses ses.mp3 --cikti cikti/<etkinlik-id>.mp4
```

1080×1920, 30 fps, H.264 + AAC; ayrıca `kapak.jpg`. Önizleme için birkaç kare çıkarılıp kontrol edilir.

## 5. Paylaşım metni

- **Normal gönderi:** açılış cümlesi, 2–3 satır açıklama, tarih/saat/eşlik eden, "Kayıt bağlantısı profilimizde",
  5–8 etiket (#tuzla #tuzlaanaokulu #bircicekkoleji + konuya özel).
- **Ücretli reklam:** ana metin (125 karakter içinde ilk cümle), başlık (40 karakter), açıklama, düğme
  ("Kaydol" / "Daha fazla bilgi"), hedef kitle önerisi (Tuzla ve çevresi 10–15 km; katılımcı türüne göre
  cinsiyet/yaş; ebeveynlik ilgi alanları), bütçe: `instagram.butceGunluk` × `instagram.gunSayisi`.
- Paylaşım saati: Türkiye'de Instagram kullanımının yoğun olduğu akşam saatleri.

## 6. Teslim ve kayıt

1. Video, kapak ve metin Emrah Bey'e gönderilir (bildirimle).
2. `reels/uretilenler.json` dosyasına `{ "id", "istekTarihi", "paylasimTuru", "uretimTarihi" }` eklenir,
   `main` dalına gönderilir. Aynı istek bir daha üretilmez.
3. Paylaşım Meta Business Suite'ten yapılır (normal gönderi ya da reklam). Paylaşınca panelde durum
   "Paylaşıldı" yapılır. "Reels'i yeniden hazırlat" işaretlenirse yeni bir istek oluşur.
