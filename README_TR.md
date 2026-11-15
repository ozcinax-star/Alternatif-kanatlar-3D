# Melek Kanatları 3D (Supernatural'dan esinlenen)

Hayran yapımı, resmî olmayan bir Blockbench modeli: 150 küp, 81 kemik, 5 animasyon, 64x64 doku.

- Site ve 3B görüntüleyici: https://ozcinax-star.github.io/Alternatif-kanatlar-3D/
- İndir: https://github.com/ozcinax-star/Alternatif-kanatlar-3D/releases/latest (zip: model, doku, önizleme, betikler)
- Lisans: MIT (model, doku, betikler). Supernatural ve ilgili adlar hak sahiplerine aittir; depoda diziden hiçbir görüntü yoktur. `site/vendor/` three.js (MIT), yazı tipi Bricolage Grotesque (SIL OFL 1.1).

English: fan-made, unofficial angel-wing model for Blockbench (.bbmodel) inspired by the TV show Supernatural, with a browser viewer on the site. Not tested with BetterModel/Geyser (see below).

Not: `arac/` betikleri MCP çıktısı dosyalarına (geometry.json vb.) bağlıdır; bağımsız çalıştırılabilir bir araç değil, modelin nasıl üretildiğinin kaydıdır.

---

# Supernatural Tarzı Melek Kanatları (Paper 26.1 plugin için)

## Dosyalar
| Dosya | Açıklama |
|---|---|
| `supernatural_angel_wings.bbmodel` | Blockbench "Generic Model" (bone rig + animasyon + gömülü doku). Plugin'e verilecek ana dosya. |
| `angel_wings.png` | 64×64 doku (modelin içinde de gömülü). |
| `onizleme/` | Açık / kapalı / süzülme pozlarının önizlemeleri. |
| `arac/` | Modeli üreten ve doğrulayan betikler (geometri, animasyon, kamera analizi). |

Model: 150 küp, 81 bone, kanat açıklığı ≈ 5 blok (≈ 82 px), oyuncu merkezi (8, 0, 8) / ayaklar y=0. Kanat kökü (skapula) torsonun sırt yüzeyine gömülü, yani karakterin parçası gibi durur.

## Tasarım (Supernatural'dan çıkarım)
Dizide kanatlar hiç 3B gösterilmedi; yalnızca duvara yansıyan/yanan **gölge** olarak görüldü (Castiel'in ilk girişi, melek bıçağıyla ölen meleklerin yere yanan kanat izi). Bu yüzden şunlar çıkarıldı: siyah-lacivert, kuş (yırtıcı) tipi, çok geniş, uçları sivri **primer tüyler**, kol boyunca sıralı sekonder / tertial tüyler ve üstlerinde örtü tüyleri; omuzdan yükselip bilekte kırılan, dışa doğru yelpaze açılan siluet. Ölçü ve renk resmi bir kaynağa dayanmıyor, yorumdur.

Bone hiyerarşisi (her kanat için `_r` / `_l`):
`wings_root > wing > sweep > humerus > forearm > pri0‑6 / sec0‑5 / alula0‑1 / csec / cpri` ve `humerus > ter0‑3 / cter0‑3`.
Her tüy ayrı bone olduğu için tüyler birbirinden bağımsız (gecikmeli) hareket eder.

## Animasyonlar
| Ad | Süre | Döngü | Ne zaman |
|---|---|---|---|
| `open` | 1.3 sn | hold | Kanat açılırken: tüyler içten dışa belirir, kanatlar sırttan açılır, hafif aşma (overshoot) ile yerleşir. Son kare = `idle` başlangıç pozu. |
| `close` | 1.3 sn | hold | Kanat kapanırken: Z şeklinde katlanıp sırta yatar, tüyler dıştan içe küçülerek dağılır, kanat sırtta yumuşakça yok olur (ölçek ≈ 0). Bittiğinde modeli kaldırın. |
| `idle` | 5 sn | loop | Yerde: nefes alma, tüy dalgalanması, ara sıra primer tüy kıpırtısı; sol/sağ biraz farklı fazda. |
| `hover` | 3.2 sn | loop | Havada dik / yukarı doğru (roket, düşme vb.) pasif çırpış, tüyler gecikmeli. |
| `fly` | 1.6 sn | loop | Elytra süzülmesi: kamerayı kapatmayacak şekilde tasarlanmış çırpış. |

Önerilen akış: `open` → (`idle` | `hover` | `fly` duruma göre) → `close` → modeli kaldır. `fly`/`hover`/`idle` arası geçişlerde plugin'in animasyon karıştırma (blend/lerp) özelliğini kullanın; `fly` pozu kanadı z ekseninde düzleştirir, anlık geçiş sıçrama yapar.

## Kamera analizi (süzülürken birinci şahıs)
Süzülmede (Pose.FALL_FLYING) hitbox ayakların ortasındaki 0.6 küptür ve model ayaklardan öteye doğru yatar. Kamera ayak noktasından ~0.4 blok yukarıdadır, yani **modelin ayak düzeyinde, sırt yüzeyinin ~4 px üstünde**; kanatlar (y 10–45 px) kameranın önünde kalır. Bu kabulle ekran kaplama oranı hesaplandı (kamera ileri = model +y, yukarı = model +z):

| Durum | Ekran kaplama |
|---|---|
| Açık poz ile süzülme (animasyonsuz) | %12.6 |
| İlk denenen çırpış | %27 |
| **Son `fly`** (kanat z‑ekseninde 0.1'e düzleştirilmiş, sırt düzlemi kameradan geçecek şekilde eğik, geriye süpürülmüş) | **FOV70 %2.1, FOV90 %1.8, FOV110 %1.6** (ince bir kenar çizgisi) |
| Ayakta/dikey, bakış 0°–45° aşağı, tüm yukarı bakışlar | %0 |
| Ayakta/`hover`, 75° aşağı | %8–11 |
| Ayakta/`hover`, tam aşağı (90°) | %23–27 (kanatlar sırtın hemen arkasında) |

Önemli kabuller:
- Plugin modeli oyuncunun vanilla süzülme duruşu gibi, **ayak noktası etrafında pitch ile döndürmelidir**. Farklı bir pivot/offset kullanılırsa bu sayılar değişir.
- Düz aşağı bakışta kaplama yüksektir; bu istenmiyorsa plugin bu durumda kanadı sahibine gizleyebilir (ör. `hover` sırasında pitch > 70°).
- Kamera hesabı vanilla değerlerine dayanır (süzülme hitbox'ı ayak merkezli: Minecraft Wiki "Hitbox"); eye height 0.4 değeri kaynaklarda doğrulanamadı, koddan hatırlanan değerdir.

## Resource pack / Geyser
- Java (Paper 26.1): `.bbmodel` dosyasını BetterModel ile kullanabilirsiniz (Hangar'da Paper 1.21.4–26.1.2 için güncel; kaynak paketini kendisi üretir). Bu dosya ile **denenmedi**.
- Bedrock/Geyser: BetterModel için Geyser köprüsü bulunamadı. FreeMinecraftModels "Bedrock entity bundle" dışa aktarımı sunuyor (ResourcePackManager gerekli), Geyser'ın özel varlık API'si ise deneysel. Hiçbiri bu modelle **denenmedi**; Bedrock desteği için ayrıca test gerekir.
- Model Minecraft'ın Java blok sınırını (‑16…32) aşıyor (kanat açıklığı 82 px); bone başına küpler sınırın içinde kalıyor, ancak engine'in büyük modeli nasıl böldüğünü test edin.

## Doğrulama (yapılanlar / yapılmayanlar)
- Geometri ve animasyonlar Blockbench MCP ile canlı projeye uygulandı; `measure_model` sınırları betikteki kinematikle birebir eşleşti (±0.01 px).
- `.bbmodel` dosyası, MCP'nin kaydetme izni (Node `path`/`fs` modülü) verilmediği için **betikle yazıldı**; Blockbench'te açılıp test edilmedi. Açıp doğrulayın; sorun görürseniz Blockbench'te açık projeden `File > Save` ile yeniden kaydedebilirsiniz.
- Bağımsız kontrol (`arac/verify.mjs`): `open` son karesi = dinlenme pozu, `close` ilk karesi = dinlenme pozu, kapalı poz sırt gövdesi içinde (z ≥ 2.5 px).
- Blockbench'in MCP ekran görüntüsü grup rotasyonlarını göstermiyor; bu yüzden pozlar `onizleme/` altında kendi kinematiğimle çizilen önizlemelerdir, Blockbench görüntüsü değildir.
