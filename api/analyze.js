export default async function handler(req, res) {
    // Pengaturan CORS agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Pastikan hanya menerima POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan method POST' });

    try {
        const { image, mime, plantName } = req.body;
        
        // 1. Siapkan Array untuk 3 API Key (Sistem Rotasi Anti Limit 429)
        const keys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3
        ].filter(Boolean); // Hanya ambil key yang terisi di Vercel

        if (keys.length === 0) throw new Error("API Key belum diset di Environment Variable Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        // Menyusun prompt dinamis jika user memasukkan nama tanaman
        let promptText = "Analisis gambar bagian flora (akar, batang, daun, bunga, atau buah) ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nUser menyebut ini sebagai: ${plantName}. Identifikasi penyakit atau hama yang menyerang bagian tersebut jika ada.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: `Kamu adalah Flora Scan AI, Pakar Botani, Pomologi, dan Florikultura tingkat global.

TUGAS UTAMA DAN FILTER (WAJIB DIIKUTI):
1. Cek apakah gambar berisi bagian flora (akar, batang, daun, bunga, atau buah).
2. JIKA GAMBAR ADALAH: Manusia, wajah, hewan, benda mati, atau gambar acak non-tanaman, BERHENTI SEGERA. Jawab HANYA dengan: "ERROR_INVALID_IMAGE: Maaf, Flora Scan AI hanya dapat mendeteksi flora (akar, batang, daun, bunga, buah). Harap unggah foto yang relevan."
3. JIKA GAMBAR VALID, berikan diagnosa yang sangat mendalam.

WAJIB IKUTI STRUKTUR INI SECARA BERURUTAN (JANGAN DIKURANGI):
1. IDENTIFIKASI & GEJALA: Sebutkan nama tanaman, bagian yang terdampak, dan jelaskan detail gejalanya.
2. DIAGNOSA PENYAKIT: Berikan nama penyakit/hama dan penyebab biologisnya.
3. SOLUSI & REKOMENDASI OBAT: Berikan langkah organik dan kimiawi. JIKA menyarankan obat/bahan kimia (misal: Fungisida Mankozeb, Insektisida Abamektin), KAMU WAJIB MENJELASKAN FUNGSI SPESIFIK DARI OBAT TERSEBUT (contoh: "...berfungsi untuk menghentikan penyebaran spora pada jaringan...").
    
4. ---STATISTIK---
Bagian ini WAJIB ADA. Berikan daftar probabilitas penyakit dalam persentase.
Contoh:
Penyakit A: 85%
Penyakit B: 10%
    
5. ---REFERENSI---
Bagian ini WAJIB ADA. Berikan istilah ilmiah (Latin) penyakit/hama. JANGAN membuat link URL palsu. Berikan instruksi untuk mencari istilah tersebut di Google Scholar.
    
6. ---DISCLAIMER---
Di bagian PALING AKHIR, berikan peringatan persis seperti ini: "⚠️ Peringatan: Diagnosa AI ini bersifat referensi awal. Harap lakukan validasi silang (cross-check) mencari info lebih lanjut atau konsultasikan dengan penyuluh pertanian setempat sebelum mengaplikasikan bahan kimia."

CATATAN: JANGAN letakkan tanda titik dua (:) di baris baru. Tanda titik dua HARUS menempel di akhir kata. Gunakan Markdown.`
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: mime || "image/jpeg",
                            data: image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4, // Sedikit diturunkan agar lebih akurat soal nama obat
                maxOutputTokens: 4096, // Memastikan analisis panjang tidak terpotong
                topP: 0.95,
                topK: 64
            }
        };

        let lastError = null;
        let responseData = null;
        let isSuccess = false;

        // 3. Sistem Rotasi (Mencoba Key 1, 2, 3 berurutan jika limit 429)
        for (let i = 0; i < keys.length; i++) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keys[i]}`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                // Jika error 429 (Too Many Requests), lanjut ke Key berikutnya
                if (response.status === 429) { 
                    lastError = `Key ${i+1} Limit, mencoba key selanjutnya...`; 
                    continue; 
                }
                
                if (!response.ok) {
                    throw new Error(data.error?.message || JSON.stringify(data));
                }

                responseData = data;
                isSuccess = true;
                break; // Berhasil, keluar dari perulangan
            } catch (err) {
                lastError = err.message;
            }
        }

        if (!isSuccess) return res.status(500).json({ error: "Semua API Key kehabisan kuota atau error", detail: lastError });

        const analysis = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak merespon dengan teks yang valid.";
        
        // Cek jika gambar ditolak oleh AI (Filter SPAM)
        if (analysis.includes("ERROR_INVALID_IMAGE")) {
            const cleanError = analysis.replace("ERROR_INVALID_IMAGE:", "").trim();
            return res.status(400).json({ error: cleanError });
        }

        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
            } 
