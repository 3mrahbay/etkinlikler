# Etkinlikler sitesi — Firestore kural bloğu

Canlı kurallarda (21 Ekim 2026 sürümü) `etkinlik_kayitlari`, `etkinlik_profiller` ve
`etkinlik_ayarlar` için kural yoktu; sondaki genel madde bunları yalnız yöneticiye açıyordu.
Sonuç: dışarıdan veli kayıt oluşturamıyor, kontenjan artmıyor, profil kaydedilmiyor,
ziyaretçi bültene abone olamıyor ve site ayarlarını (slogan) okuyamıyordu.

`firestore-etkinlikler-blogu.rules` yalnız **ekleme** yapar; mevcut kurallara dokunmaz.

## Yayınlama (Firebase konsolu)

1. Firebase › Firestore › Rules (Kurallar) sekmesini açın.
2. `match /etkinlik_aboneler/{email} {` bloğunu bulun (Ctrl+F). Bloğun kapanış `}` satırının
   hemen altına `firestore-etkinlikler-blogu.rules` dosyasının tamamını yapıştırın.
3. "Publish / Yayınla"ya basın. Sorun olursa sağdaki geçmişten bir önceki sürüme dönülür.

## Test

Blok, zeky-backend `prod-work/rules-gizlilik/firestore.rules` üzerine eklenerek emülatörde
36 senaryoyla denendi (veli kendi kaydını açar/okur, başkası adına açamaz, kontenjan yalnız
1–20 artar, profil yalnız sahibine, ayarlar herkese okunur, bülten aboneliği yalnız beklenen
alanlarla, yorumu yalnız kaydı olan veli yazar, herkese açık okuma yalnız onaylı+izinli+seçili
yorumlarda). Hepsi beklenen sonucu verdi.

## Storage kuralı (yorum fotoğrafları)

`storage-etkinlik-yorumlari.rules`: Firebase › Storage › Rules içinde `match /b/{bucket}/o {`
satırının altına, mevcut fonksiyonlardan (`adminMi()` dahil) sonra yapıştırıp **Publish**.
Veli yalnız kendi klasörüne (`etkinlik_yorumlari/{uid}/`) 5 MB altı görsel yükleyebilir;
dosyaları yalnız yönetici görür ve siler. Fotoğrafların herkese açık bağlantısı oluşturulmaz.
