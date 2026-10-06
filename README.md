# Murottal Qur'an • Updated

Versi static/mobile-first untuk Netlify/Vercel.

## Yang sudah diperbarui
- Foto yang diberikan dipakai sebagai visual hero/background dengan overlay transparan agar UI tetap terbaca.
- Dark/light mode + auto mengikuti perangkat.
- 114 surah, metadata, Arab, latin, terjemahan Indonesia.
- Navigasi 30 juz memakai endpoint Juz Al Quran Cloud.
- Pilihan qari dari EQuran.id: Juhany, Qasim, Sudais, Ibrahim Al-Dossari, Misyari Al-Afasi, Yasser Ad-Dosari.
- Untuk Syekh Yasser Ad-Dosari ada pilihan `Voice in 2025/2026` dan `Voice in 2004`.
- Rekaman 2004 diperlakukan sebagai arsip legacy. Karena arsip lama tidak dijamin menyediakan 114 surah ayat-per-ayat dengan struktur yang sama, kontrol ayat tetap memakai audio ayah modern sebagai fallback supaya playback tidak terputus.
- Continuous ayah/surah, repeat ayah/surah/off, progress, volume, speed, Media Session, favorit, riwayat/resume, share, ukuran Arab.
- Service worker untuk shell offline.

## Sumber data
EQuran.id API v2 menyediakan 114 surah, 6.236 ayat, transliterasi, terjemahan Indonesia, tafsir dan audio dari 6 qari.
Juz navigator menggunakan Al Quran Cloud.

## Deploy Netlify
Upload folder ini langsung. `index.html` harus berada di root folder upload.
