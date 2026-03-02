import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Pengaturan CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan method GET' });

    try {
        // Ambil credential dari Environment Variable Vercel
        const supabaseUrl = process.env.SUPABASE_URL;
        // Disarankan menggunakan Service Role Key untuk bypass RLS (Row Level Security)
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: "Supabase credentials belum diset di Vercel!" });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Mengambil baris pertama dari tabel web_config
        const { data, error } = await supabase
            .from('web_config')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;

        // Mengirimkan state database langsung ke frontend
        return res.status(200).json(data || {});

    } catch (error) {
        // Fallback darurat jika database Supabase belum siap/error
        return res.status(200).json({ 
            is_maintenance: false, 
            maintenance_reason: "Gagal terhubung ke database.", 
            admin_message: "",
            error_log: error.message
        });
    }
    }
