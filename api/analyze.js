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
        let promptText = "Tolong analisis gambar daun, batang, atau akar tanaman ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nSebagai informasi tambahan dari pengguna, ini adalah tanaman: ${plantName}. Tolong fokuskan analisis pada penyakit yang sering menyerang tanaman ini jika visualnya mendukung.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Tugasmu memberikan diagnosa tanaman yang profesional, akurat, dan terstruktur. Analisis bisa berupa daun, batang, atau akar.\n\nATURAN FORMAT WAJIB (Ikuti persis seperti ini):\n1. JANGAN letakkan tanda titik dua (:) di baris baru. Tanda titik dua HARUS menempel dengan kata sebelumnya (Contoh: **Solusi Pengobatan:**).\n2. Gunakan paragraf yang rapi dan terstruktur menggunakan Markdown.\n3. WAJIB berikan bagian '---STATISTIK---' tepat setelah solusi pengobatan yang berisi daftar probabilitas penyakit (contoh: Penyakit A: 85%, Penyakit B: 15%).\n4. Di bagian PALING AKHIR, buat baris '---REFERENSI---', lalu berikan 2-3 link sumber terkait. Format link WAJIB: [Nama Website](https://link-website.com)." 
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
                temperature: 0.4, 
                maxOutputTokens: 4096,
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
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
}
