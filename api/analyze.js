export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime, plantName } = req.body;
        
        // 1. Siapkan Array untuk 3 API Key
        const keys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3
        ].filter(Boolean); // Hanya ambil key yang terisi di Vercel

        if (keys.length === 0) throw new Error("API Key belum diset di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        // 2. Prompt Multimodal (Daun, Batang, Akar)
        let promptText = "Tolong analisis gambar bagian tanaman ini (bisa berupa daun, batang, atau akar) secara mendalam.";
        if (plantName) {
            promptText += ` Pengguna menyebut ini adalah tanaman: ${plantName}.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Analisis gambar (daun/batang/akar). Berikan diagnosa dalam Bahasa Indonesia. Format wajib:\n**Nama Tanaman**\n**Diagnosa Penyakit**\n**Solusi Pengobatan**\n\nDi bagian PALING AKHIR, buat baris '---REFERENSI---', lalu berikan 2-3 link sumber terpercaya dalam format Markdown: [Nama Web](https://link-web.com)." 
                }]
            },
            contents: [{
                role: "user",
                parts: [{ text: promptText }, { inlineData: { mimeType: mime || "image/jpeg", data: image } }]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
        };

        let lastError = null;
        let responseData = null;
        let isSuccess = false;

        // 3. Sistem Rotasi (Mencoba Key 1, 2, 3 berurutan jika limit)
        for (let i = 0; i < keys.length; i++) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keys[i]}`, {
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
                
                if (!response.ok) throw new Error(data.error?.message || "API Error");

                responseData = data;
                isSuccess = true;
                break; // Berhasil, keluar dari perulangan
            } catch (err) {
                lastError = err.message;
            }
        }

        if (!isSuccess) return res.status(500).json({ error: "Semua API Key kehabisan kuota", detail: lastError });

        const analysis = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "AI Tidak Merespon.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
                    } 
