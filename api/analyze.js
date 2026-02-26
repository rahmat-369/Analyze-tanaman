export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime, plantName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let promptText = "Tolong analisis gambar daun tanaman ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nTanaman ini diidentifikasi pengguna sebagai: ${plantName}. Tolong fokuskan analisis pada penyakit yang sering menyerang tanaman ini.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Berikan diagnosa profesional dalam Bahasa Indonesia. Format wajib:\n**Nama Tanaman**\n**Diagnosa Penyakit**\n**Solusi Pengobatan**\n\nJawab dengan paragraf yang rapi dan mudah dibaca. Di bagian PALING AKHIR jawabanmu, buat baris baru dengan tulisan persis '---REFERENSI---', lalu di bawahnya berikan 2-3 link URL valid terkait penyakit tersebut dalam format Markdown standar seperti ini: [Nama Web](https://url-web.com)." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: mime || "image/jpeg", data: image } }
                ]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Google API Error");

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak merespon.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
    }
