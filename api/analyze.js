export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime, plantName } = req.body;
        
        // Mengambil kumpulan API Key dari Environment Variable Vercel
        const keys = [];
        if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
        if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
        if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);

        if (keys.length === 0) throw new Error("Tidak ada API Key yang diset di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        // Prompt mendukung Daun, Batang, dan Akar
        let promptText = "Tolong analisis gambar bagian tanaman ini (bisa berupa daun, batang, kulit kayu, atau akar) secara mendalam untuk mendeteksi penyakit, hama, atau pembusukan.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nTanaman ini diidentifikasi pengguna sebagai: ${plantName}. Tolong fokuskan analisis pada penyakit yang sering menyerang tanaman ini berdasarkan visual yang terlihat. Pastikan hasilkan solusi dengan akurat dan kesimpulan`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Analisis gambar tanaman yang diberikan (daun, batang, atau akar). Berikan diagnosa profesional dalam Bahasa Indonesia. Format wajib:\n**Nama Tanaman**\n**Diagnosa Penyakit**\n**Solusi Pengobatan**\n\nJawab dengan paragraf yang rapi dan mudah dibaca. Di bagian PALING AKHIR jawabanmu, buat baris baru dengan tulisan persis '---REFERENSI---', lalu di bawahnya berikan 2-3 link URL valid terkait penyakit tersebut dalam format Markdown standar seperti ini: [Nama Web](https://url-web.com)." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: mime || "image/jpeg", data: image } }
                ]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
        };

        let lastError = null;
        let responseData = null;
        let isSuccess = false;

        // SISTEM ROTASI API KEY (Auto-Failover)
        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 429) {
                        lastError = `Kuota Key ${i + 1} Habis. Mencoba key berikutnya...`;
                        continue; // Lanjut ke key berikutnya
                    } else {
                        throw new Error(data.error?.message || "Google API Error");
                    }
                }

                responseData = data;
                isSuccess = true;
                break; // Berhasil, keluar dari loop
            } catch (err) {
                lastError = err.message;
            }
        }

        if (!isSuccess) {
            return res.status(500).json({ error: "Semua API Key kehabisan kuota atau gagal", detail: lastError });
        }

        const analysis = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak merespon.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
    }
