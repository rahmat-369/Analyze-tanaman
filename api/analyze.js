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

        // Memanggil API Google secara langsung via REST (v1 stabil)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analisis gambar daun ini. Identifikasi jenis tanaman dan penyakitnya (jika ada), serta berikan solusi pengobatan dalam Bahasa Indonesia." },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: image
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Cek jika Google mengembalikan error
        if (data.error) {
            return res.status(data.error.code || 500).json({ 
                error: "Google API Error", 
                detail: data.error.message 
            });
        }

        // Ambil teks dari struktur response Google
        const analysis = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ 
            error: "Server Error", 
            detail: error.message 
        });
    }
                            }
