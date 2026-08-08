# LCDD Quick Start

**Status:** Documentation
**Version:** 0.1.0
**Last Updated:** 2026-08-08

## Siapa yang ini untuk?

Dokumen ini dibuat untuk:
- solo founder yang ingin menjalankan governance kontekstual tanpa birokrasi berat,
- tim kecil yang butuh cara cepat untuk membuat aturan hidup,
- startup baru yang belum punya proses formal tapi ingin menjaga keputusan tetap konsisten.

## Kenapa LCDD penting?

LCDD membuat aturan, keputusan, dan kebijakan menjadi "living artifacts" — bukan hanya dokumentasi biasa.
Jika Anda ingin:
- mencegah keputusan produk menempel di kepala satu orang,
- menjaga aturan teknis tidak usang selama iterasi cepat,
- memberi AI coding agent konteks yang dapat dipercaya,
maka LCDD adalah pendekatan yang bisa membantu.

## Apa yang Anda butuhkan dulu

1. repositori Git dengan file konfigurasi dan dokumentasi.
2. satu aturan atau keputusan yang ingin Anda jadikan jelas.
3. kemampuan untuk menyimpan file YAML/Markdown di repositori.

LCDD bisa dimulai tanpa tooling kompleks. Mulai dari satu file `CONTEXT.yaml` sekali pun.

## 5 Menit Untuk Mulai

### 1. Definisikan satu Context

Buat file sederhana seperti ini:

```yaml
id: "ctx-api-validation"
version: 1
title: "Semua endpoint API harus memvalidasi input"
description: "Setiap endpoint wajib memeriksa payload terhadap schema sebelum memproses data."
source:
  type: "product"
  uri: "internal-roadmap"
authority:
  level: 2
  source:
    type: "team"
    name: "Engineering"
lifecycle: "draft"
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn"
```

### 2. Simpan di repositori

Letakkan file ini di folder yang jelas, misalnya:
- `/contexts/ctx-api-validation.yaml`
- atau `/lcd-contexts/ctx-api-validation.yaml`

### 3. Jalankan review sederhana

Jika Anda tim kecil, minta satu rekan membaca dan menyetujui isi konteks.
Kalau Anda solo founder, baca sendiri sekali lagi dan simpan perubahan.

### 4. Tandai sebagai active saat siap

Ubah `lifecycle` dari `draft` ke `active` ketika aturan ini sudah sah dan bisa dipakai.

### 5. Gunakan sebagai referensi

- untuk diskusi product: tunjukkan konteks ini pada tim.
- untuk developer: jadikan konteks ini bahan kerja.
- untuk AI: gunakan sebagai input structured constraint.

## Minimal Adoption Path

Untuk startup yang belum punya proses formal, gunakan jalur ini:

1. `Define` — pilih satu keputusan atau aturan yang sering dilupakan.
2. `Document` — tulis sebagai structured Context.
3. `Review` — baca bersama tim atau stakeholder.
4. `Activate` — tetapkan status `active` saat siap.
5. `Inspect` — cek ulang setiap 2–4 minggu.

## Contoh Praktis

### Contoh 1: Produk

`Context` ini cocok untuk keputusan bisnis:

```yaml
id: "ctx-feature-launch-window"
version: 1
title: "Fitur baru harus diluncurkan sesuai roadmap kuartalan"
description: "Semua fitur baru harus sesuai dengan prioritas kuartal yang disetujui oleh product management."
source:
  type: "product"
  uri: "roadmap-q3"
authority:
  level: 2
  source:
    type: "product"
    name: "Product Team"
lifecycle: "active"
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn"
```

### Contoh 2: Tim kecil

Gunakan `Local-Guideline` untuk preferensi tim:

```yaml
id: "ctx-code-style"
version: 1
title: "Gunakan nama variabel camelCase di frontend"
description: "Semua JavaScript/TypeScript file harus mengikuti camelCase untuk variabel lokal."
source:
  type: "team"
  uri: "engineering-style-guide"
authority:
  level: 1
  source:
    type: "team"
    name: "Frontend Team"
lifecycle: "active"
governance:
  classification: "local-guideline"
  approval_required: false
enforcement:
  mode: "comment"
```

## Tips untuk Solo Founder dan Startup Awam

- mulai dengan satu atau dua konteks penting.
- jangan langsung menulis puluhan aturan; fokus pada yang menimbulkan masalah nyata.
- gunakan kata-kata sederhana dan contoh spesifik.
- catat siapa yang membuat aturan dan mengapa.
- pisahkan aturan yang "perlu stabil" dari yang "boleh berubah cepat".

## Next Step

Setelah 5 menit awal, lanjutkan ke dokumen berikut:
- `lcdd-concepts.md` untuk mengenal istilah utama.
- `lcdd-templates.md` untuk template file.
- `lcdd-cheat-sheet.md` untuk ringkasan cepat.
