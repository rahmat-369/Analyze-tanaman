export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Vercel!");

        // Gunakan v1 agar stabil, panggil langsung tanpa library
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Kamu adalah pakar tanaman. Lihat gambar ini dan jelaskan: 1. Nama Tanaman, 2. Masalah/Penyakit yang ada, 3. Cara mengobatinya. Jawab dalam Bahasa Indonesia." },
                    {
                        inlineData: {
                            mimeType: mime || "image/jpeg",
                            data: image
                        }
                    }
                ]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: "Google Reject", 
                detail: data.error?.message || "Kesalahan API" 
            });
        }

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak memberikan jawaban.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
} 
