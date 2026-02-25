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

        // Kita gunakan endpoint v1beta dengan model gemini-1.5-flash
        // Berdasarkan log dashboard kamu, ini adalah jalur yang paling mungkin diterima
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Kamu adalah pakar tanaman. Analisis gambar daun ini: Sebutkan nama tanaman, penyakitnya, dan berikan solusi pengobatan dalam Bahasa Indonesia." },
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
                maxOutputTokens: 1000
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Jika Google menolak, berikan detail error aslinya agar kita tidak menebak lagi
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
