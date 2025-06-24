**Proje Adı:** AI MoodPlay — Yapay Zeka Destekli Müzik Ruh Hali Listeleri

---

### ✨ Proje Amacı

Kullanıcının konumu, hava durumu, ruh hali (AI ile sohbet), ve mevcut müzik zevklerine göre Spotify üzerinde otomatik olarak akıllı çalma listeleri oluşturan bir uygulama.

---

### 🔧 Kullanılacak Teknolojiler

| Amaç                  | Teknoloji                                                       |
| --------------------- | --------------------------------------------------------------- |
| Frontend              | Next.js + Tailwind CSS                                          |
| Giriş / Yetkilendirme | Spotify OAuth 2.0                                               |
| Veritabanı            | Supabase (PostgreSQL + Auth + Storage)                          |
| Hava Durumu           | OpenWeatherMap veya WeatherAPI                                  |
| Yapay Zeka            | OpenRouter üzerinden Mixtral, Gemini 1.5 veya benzeri bir model |
| Spotify API           | Playlist, şarkı arama, öneriler                                 |

---

### 💡 Uygulama Akışı

1. **Spotify ile Giriş:** Kullanıcı, Spotify hesabıyla OAuth yoluyla giriş yapar.
2. **Konum ve Hava Durumu:** IP adresinden veya kullanıcı onaylı konum verisinden mevcut hava durumu bilgisi alınır.
3. **AI Prompt:** Kullanıcıya ruh hali, planı veya hisleriyle ilgili sorular sorularak bir prompt alınır.
4. **LLM Entegrasyonu:** Prompt + hava durumu bilgisi birleştirilip yapay zeka modeline gönderilir.

   Yapay zeka, şu JSON formatında cevap verir:
   ```json
   {
     "playlist_name": "Rainy Day Focus",
     "description": "Lo-fi and soft electronica for rainy afternoons",
     "mood_tags": ["lofi", "focus", "calm", "rain"]
   }
   ```
5. **Spotify Playlist Oluşturma:** mood\_tags kullanılarak şarkılar aratılır ve playlist oluşturulur.
6. **Supabase'e Kayıt:** Playlist bilgisi kullanıcıya bağlı olarak veritabanına kaydedilir.
7. **Kullanıcı Arayüzü:** Oluşturulan playlist sunulur, Spotify'da açılabilir hale getirilir.

---

### 📅 Sayfa Yapısı

- `/` Ana Sayfa (Spotify login)
- `/dashboard` Hava durumu + prompt alma + playlist gösterimi
- `/history` Daha önce oluşturulan playlist'lerin listesi
- `/about` Uygulama hakkında bilgiler

---

### 🚀 Klasör Yapısı

```
/app
  /api
    - generate-playlist.ts
    - get-weather.ts
    - get-spotify-tracks.ts
  /dashboard
  /history

/lib
  - spotify.ts
  - ai.ts
  - weather.ts
  - supabase.ts

/components
  - WeatherPanel.tsx
  - PromptInput.tsx
  - PlaylistCard.tsx
  - LoginButton.tsx
```

---

### 🛠️ API ve Yardımcılar

- `spotify.ts`: Spotify token alma, playlist oluşturma, track arama.
- `ai.ts`: OpenRouter API ile istek yapar.
- `weather.ts`: Konuma göre hava durumu verisi getirir.
- `supabase.ts`: Kullanıcı verisi ve playlist kaydı işlemleri.

---

### 📊 LLM Prompt Örneği

AI modeline gönderilecek prompt şu şekilde olabilir:

```
Kullanıcının ruh hali, konumu ve hava durumuna göre şu formatta bir playlist önerisi oluştur:

Ruh hali: [mutlu, huzurlu, enerjik]
Konum: Ankara
Hava Durumu: Gökgürültülü Sağanak Yağışlı

Lütfen aşağıdaki JSON formatında sadece cevap ver:
{
  "playlist_name": "Enerjik Yağmurlar",
  "description": "Yağmurlu havalarda enerji veren dans ritimleri",
  "mood_tags": ["dance", "energetic", "rain", "pop"]
}
```

---

### 🌐 Weather API Örneği

- OpenWeatherMap: `https://api.openweathermap.org/data/2.5/weather?q=Ankara&appid=API_KEY&units=metric`

---

### 🚫 Riskler ve Notlar

- Spotify token süresi kısıtlamalı (refresh token kullanılmalı)
- OpenRouter'da model değişebilir, fallback model yapısı kullanılabilir
- Rate limit aşımlara dikkat edilmeli (Spotify + OpenRouter + Weather)

---

### ✅ Yol Haritası (Roadmap)

1. Spotify OAuth login
2. Supabase ile user verisi tutma
3. Weather API entegresi
4. Prompt arayüzü ve AI entegrasyonu
5. Playlist oluşturma
6. Dashboard ve tarihçe ekranları
7. Mobil uyum + stil güzelleştirme

---

Hazır! Tüm bu yapıya göre adım adım geliştime başlayabilirsin. Yardıma ihtiyacın olduğunda destek vermeye hazırım.

