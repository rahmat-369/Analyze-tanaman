const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const { image } = req.body;
        const prompt = "Analisis gambar daun ini. Sebutkan nama penyakitnya (jika ada), gejala singkat, dan cara penanganannya dalam bahasa Indonesia yang mudah dipahami.";

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: image, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        res.status(200).json({ analysis: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
