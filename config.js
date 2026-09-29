// Supabase self-hosted no VPS (mesmo projeto do administrativo-empresa).
// A chave anon só consegue ler a tabela campanha_ranking (totais por vendedor, sem dados de clientes).
window.SUPABASE_URL = "https://supabase.infinitypromvendas.com.br";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5MjM2ODg0LCJleHAiOjE5NDY5MTY4ODR9.nzMRPNMZHKpBIq6oTof9pG5sGdxbHAbogkviMCE5pPA";

// Regras da campanha
window.CAMPANHA = {
  metaParcelinha: 3000000,
  metaNormal: 1000000,
  fim: "2026-12-31T23:59:59-03:00",
};
