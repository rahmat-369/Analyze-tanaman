export default async function handler(req, res) {
    // Header untuk mengizinkan akses dari frontend (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        // Menggunakan model gemini-2.5-flash sesuai hasil diagnostik akunmu
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { 
                        text: "Kamu adalah pakar tanaman profesional. Analisis gambar daun ini dan berikan laporan lengkap yang mencakup: 1. Nama Tanaman, 2. Diagnosa Penyakit/Masalah, 3. Langkah Pengobatan/Solusi. Jawab dalam Bahasa Indonesia dengan format yang rapi." 
                    },
                    {
                        inlineData: {
                            mimeType: mime || "image/jpeg",
                            data: image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.5,
                // Dinaikkan ke 4096 agar respon panjang tidak terpotong lagi
                maxOutputTokens: 4096,
                topP: 0.95,
                topK: 64
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: "Google API Reject", 
                detail: data.error?.message || JSON.stringify(data)
            });
        }

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak memberikan jawaban.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
}
