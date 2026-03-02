import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Pengaturan CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Pastikan hanya menerima POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan method POST' });

    try {
        const { action, password, is_maintenance, maintenance_reason, admin_message } = req.body;
        
        // Cek Keamanan
        const validPassword = process.env.ADMIN_PASSWORD;
        if (!validPassword) {
            return res.status(500).json({ error: "Variabel ADMIN_PASSWORD belum diset di Vercel!" });
        }
        if (password !== validPassword) {
            return res.status(401).json({ error: "Password Admin Salah!" });
        }

        // Setup Koneksi Supabase
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: "Supabase credentials belum diset di Vercel!" });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Eksekusi berdasarkan instruksi frontend
        if (action === 'login') {
            const { data, error } = await supabase.from('web_config').select('*').limit(1).single();
            if (error) throw error;
            return res.status(200).json(data || {});
        } 
        else if (action === 'set_maintenance') {
            // Update database di row ID = 1
            const { data, error } = await supabase
                .from('web_config')
                .update({ 
                    is_maintenance: is_maintenance, 
                    maintenance_reason: maintenance_reason || "" 
                })
                .eq('id', 1)
                .select();
                
            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }
        else if (action === 'set_notification') {
            // Update database di row ID = 1
            const { data, error } = await supabase
                .from('web_config')
                .update({ 
                    admin_message: admin_message || "" 
                })
                .eq('id', 1)
                .select();

            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }
        else {
            return res.status(400).json({ error: "Action tidak dikenali" });
        }

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
} 
