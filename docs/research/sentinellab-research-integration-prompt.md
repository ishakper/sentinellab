# SentinelLab Research Integration — Technical Control

## Tujuan

Integrasikan governance penelitian, OSINT melalui theHarvester, validasi terbatas melalui Metasploit, evidence chain, tunnel demonstrasi ngrok, dashboard, laporan, dan dokumen penelitian.

## Urutan fase

1. Governance dan scope enforcement.
2. Worker dan normalisasi OSINT.
3. Adapter Metasploit untuk validation job terkontrol.
4. Evidence chain.
5. Tunnel demonstrasi ngrok.
6. Dashboard dan laporan.
7. Dokumen governance.

Epic 3 dilarang dimulai sebelum GOV-01 sampai GOV-04 lulus.

## Batasan mutlak

1. Endpoint hanya menerima ID katalog Metasploit tetap; nama/path modul dan command console bebas dilarang.
2. Handler RPC hanya `module.execute`, `module.info`, `job.list`, `job.stop`, `session.list`, dan `session.stop`. `console.write` dan `console.read` dilarang.
3. Validation job hanya dapat `RUNNING` bila target lolos scope, sudah disetujui pengguna selain requester, dan belum kedaluwarsa.
4. Tunnel ngrok hanya menuju allowlist web/API; PostgreSQL, Redis, Metasploit RPC, Docker daemon, ADB, dan lab simulator dilarang.
5. Token dan API key hanya berasal dari environment secret; source, migration, seed, dan database dilarang menyimpannya.
6. Semua OSINT dan validation job wajib melewati `ScopeEnforcementService` tanpa bypass admin/internal.
7. Test hanya memakai reserved domain seperti `example.com`, `.test`, atau lab simulator milik project.

## Model governance

- `ResearchProject`: tenant-owned project dengan periode, status, institusi, peneliti, pembimbing, dan nomor persetujuan etik.
- `AuthorizationRecord`: izin, hash dokumen, periode, approved targets, prohibited actions, dan status.
- `ScopeAsset`: target ternormalisasi bertipe DOMAIN, IP, HOST, atau CIDR serta izin active testing.
- `ScopeEnforcementService`: hanya menerima authorization `APPROVED`, sedang valid, dan target cocok.

## OSINT

Worker terpisah memakai Redis/BullMQ. Domain harus valid dan in-scope. Source memakai allowlist tetap. Proses memiliki timeout, resource limit, dan rate limit. Output JSON dinormalisasi. Raw artifact diberi SHA-256. Email asli bersifat rahasia dan harus teredaksi pada laporan publik.

## Metasploit

Metasploit RPC berada pada jaringan terisolasi. Adapter memakai secret environment dan katalog modul tetap. Workflow menerapkan segregation of duty, expiry, timeout, satu job aktif per target, emergency stop, serta audit lengkap. Persistence, credential dumping, evasion, pivoting, destructive module, dan mass exploitation dilarang.

## Evidence

Artifact menyimpan SHA-256, hash artifact sebelumnya, klasifikasi, timestamp, retensi, operator, tool version, configuration hash, dan correlation ID. Verifikasi melaporkan titik pertama rantai rusak. Audit evidence bersifat read-only.

## ngrok

Tunnel hanya untuk demonstrasi web/API terautentikasi, wajib kedaluwarsa otomatis, dan token tidak disimpan. Endpoint lokal divalidasi server terhadap allowlist tetap.

## Laporan

Laporan mencakup scope, metode, versi alat, discovered assets, temuan, validasi, batasan, evidence, kejadian, kesimpulan, etika, dan otorisasi.

## Skenario wajib

- Governance: GOV-01..GOV-04, TEN-01.
- OSINT: OSINT-01..OSINT-02.
- Metasploit: MSF-01..MSF-06.
- Evidence: EVD-01, AUD-01.
- Tunnel: NG-01..NG-02.

Detail task dan acceptance criteria normatif berada di `sentinellab-research-backlog.csv`.
