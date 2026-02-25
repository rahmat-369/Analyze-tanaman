const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. Set Header CORS (Penting untuk Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima POST request' });
    }

    try {
        const { image } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key tidak ditemukan di Environment Variable Vercel' });
        }

        if (!image) {
            return res.status(400).json({ error: 'Data gambar (base64) diperlukan' });
        }

        // 2. Inisialisasi Google Generative AI
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Gunakan nama model yang paling standar untuk menghindari 404
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash" 
        });

        // 3. Siapkan Konten
        const prompt = "Analisis gambar daun ini. Identifikasi jenis tanaman, sebutkan penyakitnya jika ada, dan berikan saran penanganan dalam Bahasa Indonesia.";
        
        const imageParts = [
            {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg"
                }
            }
        ];

        // 4. Panggil API Gemini
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        // 5. Kirim Hasil
        return res.status(200).json({ analysis: text });

    } catch (error) {
        console.error("Backend Error Detail:", error);
        
        // Error handling khusus untuk masalah model/auth
        const statusCode = error.message.includes('not found') ? 404 : 500;
        
        return res.status(statusCode).json({ 
            error: "Kesalahan AI: " + error.message,
            suggestion: "Cek apakah API Key sudah aktif dan limit kuota gratis masih tersedia."
        });
    }
    }
