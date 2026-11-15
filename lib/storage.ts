import path from "path";

/**
 * Onde a plataforma guarda análises, capas, categorias e acessos do opt-in.
 * Na Vercel só dá pra gravar em /tmp, que é apagado de tempos em tempos.
 * Pra guardar de forma permanente, o próximo passo é trocar por um banco (Supabase).
 */
export const DATA_DIR = process.env.VERCEL ? "/tmp/perfilab" : path.join(process.cwd(), ".data");
