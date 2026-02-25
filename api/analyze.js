const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // Basic Security & Headers
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima metode POST' });
    }

    try {
        const { image } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key Gemini belum diset di Vercel!' });
        }

        if (!image) {
            return res.status(400).json({ error: 'Gambar tidak ditemukan' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Kamu adalah pakar botani digital. Analisis gambar daun ini:
            1. Identifikasi jenis tanaman.
            2. Berikan diagnosis apakah tanaman sehat atau terserang penyakit.
            3. Jika sakit, sebutkan nama penyakit dan penyebabnya.
            4. Berikan langkah pengobatan praktis.
            Gunakan bahasa Indonesia yang santai tapi profesional.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ analysis: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(500).json({ error: "Terjadi kesalahan pada AI: " + error.message });
    }
            }
