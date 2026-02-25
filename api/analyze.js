export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'API Key belum di-set di Vercel' });
        if (!image) return res.status(400).json({ error: 'Data gambar kosong' });

        // Menggunakan v1 (Versi paling stabil)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analisis penyakit pada daun ini dan berikan saran penanganan dalam Bahasa Indonesia." },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: image // Pastikan ini base64 murni tanpa header data:image/jpeg;base64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Jika ada error dari Google, kita tangkap detailnya
        if (!response.ok) {
            console.error("Google Error:", data);
            return res.status(response.status).json({ 
                error: "Google API Reject", 
                detail: data.error?.message || JSON.stringify(data)
            });
        }

        // Cek jika candidate ada
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const analysis = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ analysis });
        } else {
            return res.status(500).json({ error: "Respon kosong dari AI", detail: JSON.stringify(data) });
        }

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
            } 
