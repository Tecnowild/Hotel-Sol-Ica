const { createClient } = require("@supabase/supabase-js");

let clienteAdmin;

const obtenerSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL;
    const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !claveServicio) {
        const error = new Error(
            "La gestión de usuarios requiere SUPABASE_SERVICE_ROLE_KEY configurada solo en el backend."
        );
        error.status = 503;
        throw error;
    }

    if (!clienteAdmin) {
        clienteAdmin = createClient(url, claveServicio, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }

    return clienteAdmin;
};

module.exports = { obtenerSupabaseAdmin };
