# Metodi RES Builder

Piattaforma di simulazione finanziaria per reseller di energia elettrica nel mercato libero italiano. Modella ciclo di vita clienti, switching SII, accise (D.Lgs. 43/2025), IVA in reverse charge (art. 17 c.6 DPR 633/72), deposito cauzionale grossista, fatturazione, cash flow e flussi fiscali.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind
- **Backend**: Supabase (Postgres + Auth + Edge Functions Deno + Storage)
- **Hosting**: Vercel
- **DNS**: Cloudflare

## Sviluppo locale

```bash
cp .env.example .env
# Compila .env con le chiavi del tuo progetto Supabase
npm install
npm run dev
```

L'app sarà disponibile su `http://localhost:8080`.

## Comandi

```bash
npm run dev       # dev server
npm run build     # build di produzione (output in dist/)
npm run preview   # preview del build
npm run lint      # ESLint
```

## Deploy

Push su `main` → deploy automatico su Vercel.

## Edge functions Supabase

```bash
# Deploy di una singola function
supabase functions deploy <function-name> --project-ref <project-ref>

# Gestione segreti
supabase secrets set KEY=value --project-ref <project-ref>
supabase secrets list --project-ref <project-ref>
```

## Struttura

```
src/
  components/      # Componenti React (UI + dominio)
  hooks/           # Custom hooks (data + calcoli derivati)
  lib/             # simulationEngine.ts (motore di calcolo) + utilities
  pages/           # Pagine top-level
  integrations/    # Client Supabase + tipi auto-generati
supabase/
  functions/       # Edge functions Deno
  migrations/      # Migrazioni Postgres
  config.toml      # Configurazione progetto Supabase
public/            # Asset statici
```

## Note

- Il file `.env` non è versionato. Vedi `.env.example` per le chiavi richieste.
- Le chiavi `VITE_SUPABASE_*` sono lette a build time.
- La chiave `VITE_SUPABASE_PUBLISHABLE_KEY` è la "anon key" pubblica di Supabase: la sicurezza dei dati è garantita dalle Row Level Security policy lato database, non dal segreto della chiave.
