# MoodWeather - Akıllı Müzik Terapi Uygulaması
## Proje Dokümantasyonu

### 📋 Proje Özeti
MoodWeather, kullanıcının duygusal durumu ve çevresel faktörleri (hava durumu, saat, mevsim) analiz ederek kişiselleştirilmiş müzik terapi seansları oluşturan web uygulamasıdır.

---

## 🎯 Ana Hedefler

### Birincil Hedefler
- Kullanıcının mevcut ruh halini hedef ruh haline geçirmek
- Hava durumu ve zaman faktörlerini müzik seçiminde kullanmak
- AI destekli kişiselleştirilmiş müzik önerileri sunmak

### İkincil Hedefler
- Kullanıcının müzik dinleme alışkanlıklarını analiz etmek
- Duygusal değişimleri takip etmek
- Müzik terapi geçmişini kaydetmek

---

## 🔧 Teknik Mimari

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Kütüphane:** Shadcn/ui (isteğe bağlı)
- **State Management:** React Context API / Zustand

### Backend
- **Platform:** Next.js API Routes (Serverless)
- **Veritabanı:** SQLite (başlangıç için) / PostgreSQL (production)
- **ORM:** Prisma

### Üçüncü Taraf API'ler
- **Spotify Web API** (Müzik verileri)
- **OpenWeatherMap API** (Ücretsiz hava durumu)
- **Groq API** (Ücretsiz AI - Llama 3.1 modeli)

### Deployment
- **Platform:** Vercel (Ücretsiz tier)
- **Domain:** Vercel subdomain (.vercel.app)

---

## 🤖 Ücretsiz AI Çözümü: Groq API

### Neden Groq?
- **Tamamen ücretsiz** (rate limit ile)
- **Hızlı response süreleri**
- **Llama 3.1 70B modeli** kullanımı
- **Günlük 14,400 request** limiti (hobi için yeterli)

### Alternatif Ücretsiz AI Seçenekleri
1. **Hugging Face Inference API** (günlük limit ile)
2. **Google Gemini API** (aylık ücretsiz quota)
3. **Ollama** (yerel model çalıştırma)

---

## 📱 Uygulama Özellikleri

### 🌦️ Çevresel Algı Motoru
- **Hava Durumu Entegrasyonu**
  - Anlık sıcaklık, nem, basınç
  - Hava durumu koşulları (güneşli, yağmurlu, bulutlu)
  - Görünürlük ve rüzgar hızı

- **Zaman Analizi**
  - Günün saati (sabah, öğle, akşam, gece)
  - Mevsim tespiti
  - Hafta içi/hafta sonu ayrımı

### 🧠 Duygusal Zeka Sistemi
- **Mood Input Yöntemleri**
  - Metin tabanlı mood açıklaması
  - Emoji seçimi
  - Önceden tanımlı mood kategorileri

- **AI Mood Analizi**
  - Kullanıcı metninden duygu çıkarımı
  - Enerji seviyesi tespiti
  - Hedef mood belirleme

### 🎶 Müzik Terapi Motoru
- **Spotify Entegrasyonu**
  - Kullanıcının saved tracks analizi
  - Recently played tracks
  - Top artists ve genres

- **Playlist Oluşturma**
  - Mevcut -> Hedef mood geçiş algoritması
  - Hava durumu uyumlu şarkı seçimi
  - Tempo ve enerji seviyesi gradasyonu

---

## 📊 Veri Modeli

### User Table
```sql
- id (Primary Key)
- spotify_id
- display_name
- email
- created_at
- last_login
```

### MoodSession Table
```sql
- id (Primary Key)  
- user_id (Foreign Key)
- current_mood
- target_mood
- weather_data (JSON)
- playlist_id
- session_date
- session_duration
- effectiveness_rating
```

### PlaylistHistory Table
```sql
- id (Primary Key)
- user_id (Foreign Key)
- session_id (Foreign Key)
- spotify_playlist_id
- track_count
- generated_at
```

---

## 🎨 Kullanıcı Deneyimi Akışı

### 1. Giriş ve Yetkilendirme
- Spotify OAuth ile giriş
- İzin onayları (read-only erişim)
- Konum izni (hava durumu için)

### 2. Ana Dashboard
- Güncel hava durumu widget'ı
- "Bugün nasıl hissediyorsun?" mood input
- Son playlistler
- İstatistikler özeti

### 3. Mood Selection
- Text input: "Yorgun ve stresli hissediyorum"
- Emoji selector: 😔 😴 😰 😌
- Target mood: "Enerjik olmak istiyorum"

### 4. AI Analizi
- Loading animation
- "Duygusal durumunuz analiz ediliyor..."
- "Hava durumu faktörleri hesaplanıyor..."

### 5. Playlist Oluşturma
- "Size özel playlist hazırlanıyor..."
- Şarkı seçim algoritması çalışıyor
- Spotify'da playlist oluşturuluyor

### 6. Müzik Terapi Seansı
- Player interface
- İlerleme çubuğu
- "Şu an nasıl hissediyorsun?" ara kontrolleri

### 7. Seans Tamamlama
- Geri bildirim formu
- Effectiveness rating (1-5 yıldız)
- "Bugün daha fazla seansa ihtiyacın var mı?"

---

## 🚀 Geliştirme Aşamaları

### Faz 1: Temel MVP (2-3 hafta)
- [ ] Next.js projesinin kurulumu
- [ ] Spotify OAuth entegrasyonu
- [ ] Basit mood input formu
- [ ] Hava durumu API entegrasyonu
- [ ] Groq AI ile basit mood analizi
- [ ] Spotify'dan basit playlist oluşturma

### Faz 2: AI Geliştirme (1-2 hafta)
- [ ] Gelişmiş mood analizi algoritması
- [ ] Hava durumu + mood kombinasyon mantığı
- [ ] Spotify track feature analizi (energy, valence, tempo)
- [ ] Intellignet playlist curation

### Faz 3: UX İyileştirmeleri (1-2 hafta)
- [ ] Modern UI/UX tasarımı
- [ ] Loading states ve animasyonlar
- [ ] Mobile responsive design
- [ ] Error handling ve user feedback

### Faz 4: Veri & Analytics (1 hafta)
- [ ] Session tracking
- [ ] User statistics dashboard
- [ ] Effectiveness analytics
- [ ] Historical data visualization

---

## 💻 Kurulum ve Geliştirme

### Gerekli API Keys
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
OPENWEATHER_API_KEY=your_openweather_key
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_nextauth_secret
```

### Başlangıç Komutları
```bash
# Proje oluşturma
npx create-next-app@latest moodweather --typescript --tailwind --app

# Gerekli paketler
npm install prisma @prisma/client next-auth
npm install @spotify/web-api-sdk axios date-fns

# AI için
npm install groq-sdk

# UI için (isteğe bağlı)
npm install @radix-ui/react-* lucide-react
```

---

## 📈 Gelecek Özellikler (V2)

### Sosyal Özellikler
- Mood sharing (anonim)
- Community playlists
- Friend mood tracking

### Gelişmiş AI
- Makine öğrenmesi ile kişiselleştirme
- Circadian rhythm analizi
- Predictive mood modeling

### Wellness Integration
- Meditation breaks
- Breathing exercises
- Sleep quality correlation

### Analytics Dashboard
- Mood trends over time
- Weather correlation reports
- Music effectiveness metrics

---

## 💡 Başlangıç için Basit Alternatifler

Eğer tüm özellikler karmaşık geliyorsa, şunlarla başlayabilirsiniz:

1. **Sadece Hava Durumu + Spotify**: Mevcut havaya uygun playlist öneren basit uygulama
2. **Mood Only**: Sadece mood input alıp Spotify'dan uygun şarkılar öneren versiyon
3. **Static Playlists**: AI olmadan, önceden hazırlanmış playlist'lerden seçim yapan versiyon

Bu dokümandan hangi bölümünü detaylandırmamı istiyorsunuz?