export default async function handler(req, res) {
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

        // Menggunakan Gemini 2.5 Flash sesuai data list-model akunmu
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Tugasmu memberikan diagnosa tanaman yang profesional, akurat, dan terstruktur. Gunakan Bahasa Indonesia. Gunakan format Markdown: **Nama Tanaman**, **Diagnosa**, dan **Solusi**. Jawablah dengan nada yang membantu namun teknis." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: "Tolong analisis gambar daun tanaman ini secara mendalam." },
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
                maxOutputTokens: 4096, // Menghindari respon terpotong
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

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak merespon.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
            } 
