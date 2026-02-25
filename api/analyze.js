export default async function handler(req, res) {
    // Pengaturan CORS agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Pastikan hanya menerima POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan method POST' });

    try {
        const { image, mime, plantName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Environment Variable Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Menyusun prompt dinamis jika user memasukkan nama tanaman
        let promptText = "Tolong analisis gambar daun tanaman ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nSebagai informasi tambahan dari pengguna, ini adalah tanaman: ${plantName}. Tolong fokuskan analisis pada penyakit yang sering menyerang tanaman ini jika visualnya mendukung.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Tugasmu memberikan diagnosa tanaman yang profesional, akurat, dan terstruktur. Gunakan Bahasa Indonesia. Gunakan format Markdown: **Nama Tanaman**, **Diagnosa Penyakit**, dan **Solusi Pengobatan**. Jawablah dengan nada yang membantu namun teknis." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: mime || "image/jpeg",
                            data: image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4, // Sedikit diturunkan agar lebih analitis dan akurat
                maxOutputTokens: 4096,
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

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak merespon dengan teks yang valid.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
    }
