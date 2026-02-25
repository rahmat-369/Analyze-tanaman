const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

        // Inisialisasi tanpa menyebutkan versi API agar SDK memilih yang terbaik
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Gunakan nama model dasar
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash" 
        });

        const prompt = "Analisis gambar daun ini secara detail: nama tanaman, diagnosis penyakit, dan solusi pengobatan dalam bahasa Indonesia.";

        // Pastikan format gambar benar
        const result = await model.generateContent([
            {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg"
                }
            },
            { text: prompt }
        ]);

        const response = await result.response;
        return res.status(200).json({ analysis: response.text() });

    } catch (error) {
        console.error("LOG_ERROR:", error.message);
        
        // Pesan error ramah pengguna
        return res.status(500).json({ 
            error: "Gagal memproses gambar.",
            detail: error.message 
        });
    }
        } 
