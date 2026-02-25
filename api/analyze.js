export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: "Gagal mengambil daftar model", 
                detail: data 
            });
        }

        // Ini akan menampilkan semua model yang BISA kamu pakai
        const availableModels = data.models.map(m => ({
            name: m.name,
            displayName: m.displayName,
            description: m.description,
            supportedMethods: m.supportedMethods
        }));

        return res.status(200).json({ 
            message: "Gunakan salah satu nama model di bawah ini pada kodingan kamu:",
            models: availableModels 
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
} 
