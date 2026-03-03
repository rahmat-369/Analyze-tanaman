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
        let promptText = "Analisis gambar bagian tanaman (daun, batang, akar, bunga, atau buah) ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nUser menyebut ini sebagai: ${plantName}. Identifikasi penyakit atau hama yang menyerang bagian tersebut jika ada.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: `Kamu adalah Pakar Botani, Pomologi (Pakar Buah), dan Florikultura (Pakar Bunga) AI tingkat global.

TUGAS UTAMA DAN FILTER (WAJIB DIIKUTI):
1. Cek apakah gambar ini berisi bagian dari tanaman, daun, bunga, atau buah.
2. JIKA GAMBAR ADALAH: Manusia, wajah, hewan, benda mati (kursi, kendaraan, dll), atau gambar random yang tidak ada hubungannya dengan flora, BERHENTI SEGERA. Jawab HANYA dengan kalimat ini: "ERROR_INVALID_IMAGE: Maaf, sistem Flora.AI hanya dapat mendeteksi tanaman, bunga, dan buah. Harap unggah foto yang relevan."
3. JIKA GAMBAR VALID (Tanaman/Bunga/Buah), lanjutkan ke analisis mendalam.

ATURAN FORMAT OUTPUT ANALISIS (JIKA GAMBAR VALID):
1. JANGAN letakkan tanda titik dua (:) di baris baru. Tanda titik dua HARUS menempel dengan kata sebelumnya (Contoh: **Solusi Pengobatan:**).
2. Gunakan paragraf yang rapi dan terstruktur menggunakan Markdown.
3. WAJIB berikan bagian '---STATISTIK---' tepat setelah solusi pengobatan yang berisi daftar probabilitas deteksi penyakit/kategori (contoh: Antraknosa Buah: 85%, Karat Daun: 15%).
4. Di bagian PALING AKHIR, buat baris '---REFERENSI---'. JANGAN membuat link URL palsu/mati. Sebagai gantinya, berikan daftar istilah ilmiah (Latin) dari tanaman atau penyakit tersebut dan instruksikan pengguna untuk mencarinya secara mandiri di Google Scholar atau jurnal pertanian terpercaya.`
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
                temperature: 0.2, // Sengaja direndahkan agar AI lebih disiplin memfilter gambar spam
                maxOutputTokens: 2048,
                topP: 0.8,
                topK: 40
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
