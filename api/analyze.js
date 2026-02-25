export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Vercel!");

        // GUNAKAN v1beta dengan nama model murni "gemini-1.5-flash"
        // Google terkadang menolak "-latest" jika versi API-nya sangat ketat
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analisis gambar daun ini secara detail. Sebutkan nama tanaman, penyakit, dan solusinya dalam Bahasa Indonesia." },
                    {
                        inlineData: {
                            mimeType: mime || "image/jpeg",
                            data: image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 1, // Menaikkan kreativitas sedikit agar tidak kaku
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
            // Jika Google menyarankan ListModels, tampilkan pesan error yang lebih informatif
            return res.status(response.status).json({ 
                error: "Google API Reject", 
                detail: data.error?.message || "Model tidak dikenali.",
                hint: "Coba ganti nama model ke gemini-1.5-pro jika flash tidak tersedia."
            });
        }

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak memberikan jawaban.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
            }
