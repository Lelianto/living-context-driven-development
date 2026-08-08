# LCDD Concepts

**Status:** Documentation
**Version:** 0.1.0
**Last Updated:** 2026-08-08

Dokumen ini menjelaskan istilah-istilah utama LCDD dengan bahasa sederhana.

## Apa itu Context?

`Context` adalah unit terkecil LCDD. Ia adalah aturan atau keputusan yang dibuat eksplisit, ditulis dalam format terstruktur.

Contoh sederhana:
- "Semua endpoint API harus memvalidasi input"
- "Fitur baru harus disetujui product sebelum dimasukkan ke sprint"
- "Database resmi adalah PostgreSQL 16"

## Apa yang membedakan Context dari dokumentasi biasa?

- Terstruktur: bisa dibaca oleh manusia dan mesin.
- Bernilai: berisi `source`, `authority`, dan `enforcement`.
- Hidup: ada siklus hidup (`lifecycle`) dan dapat berubah secara terkontrol.

## Istilah penting

### Source

Sumber asal context.
- Contoh: `product`, `team`, `regulation`, `internal-policy`.
- Artinya: dari mana aturan ini berasal dan siapa yang melaporkannya.

### Authority

Siapa yang memberi otoritas pada context.
- `level: 0` sampai `4`.
- Level lebih tinggi berarti lebih sulit diubah.

Contoh:
- `level 4`: aturan legal atau compliance.
- `level 2`: standar tim atau product.
- `level 1`: preferensi developer.
- `level 0`: eksperimen otomatis.

### Lifecycle

Tahapan perubahan sebuah context:
- `draft` — awal dan belum disetujui.
- `candidate` — mulai ditinjau.
- `approved` — diterima tetapi belum aktif.
- `active` — berlaku dan harus dihormati.
- `deprecated` — mulai tidak lagi direkomendasikan.
- `archived` — disimpan untuk audit, tidak lagi diberlakukan.

### Governance classification

Bagian ini menjelaskan bagaimana aturan boleh berubah:
- `hardened` — aturan lambat berubah, membutuhkan approval formal.
- `local` — aturan lebih cepat berubah, bisa disesuaikan tim.

Contoh:
- `hardened-standard`: aturan organisasi yang memblokir jika dilanggar.
- `local-guideline`: preferensi tim yang hanya memberi komentar.

### Enforcement

Bagian ini menjelaskan bagaimana aturan diterapkan.

Mode umum:
- `block` — pelanggaran dapat menghentikan merge atau deploy.
- `warn` — hanya peringatan.
- `comment` — komentar atau review note.
- `silent` — hanya dicatat tanpa interupsi.

### Context Pack

`Context Pack` adalah kumpulan Context yang saling terkait.
- Contoh: pack untuk `security`, `product`, `team style`.
- Memudahkan startup mengambil paket aturan siap pakai.

## Mengapa ini berguna untuk startup

Startup sering berubah cepat, jadi aturan yang kaku sering jadi usang.
LCDD membantu dengan:
- memisahkan aturan yang harus stabil dari yang bisa berubah cepat,
- memberi struktur pada keputusan produk,
- menjaga filosofi governance tetap sederhana tetapi dapat dilacak.

## Contoh sederhana

```yaml
id: "ctx-release-approval"
version: 1
title: "Semua release produk harus disetujui oleh manajemen produk"
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

## Bagaimana membaca Context

1. `id`: kunci unik aturan.
2. `title`: ringkas aturan.
3. `description`: apa dan mengapa.
4. `source`: asal aturan.
5. `authority`: siapa yang membuatnya sah.
6. `lifecycle`: apakah aturan ini sudah aktif.
7. `governance`: seberapa mudah diubah.
8. `enforcement`: bagaimana aturan ini diberlakukan.

## Bagan sederhana

- `draft` → `candidate` → `approved` → `active`
- `active` → `deprecated` → `archived`

Gunakan bagan ini sebagai peta ketika Anda berbicara dengan tim:
- Draft untuk ide.
- Active untuk aturan yang bisa diikuti.
- Deprecated saat aturan akan dihentikan.

## Untuk siapa dokumen ini?

Dokumen ini cocok untuk siapa saja yang perlu memahami konsep LCDD tanpa jargon teknis:
- solo founder,
- product manager,
- developer,
- tim startup kecil.
