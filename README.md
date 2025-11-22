# Energy Project Management Platform

Una piattaforma completa per la gestione di progetti nel settore delle energie rinnovabili, con strumenti integrati per business planning, marketing, documentazione e monitoraggio del team.

## 🎯 Panoramica

Questa applicazione è progettata specificamente per gestire progetti nel settore energetico (solare, eolico, efficienza energetica), offrendo un ecosistema completo di strumenti per la pianificazione, l'esecuzione e il monitoraggio di progetti complessi.

## ✨ Caratteristiche Principali

### 📊 Dashboard Progetti
- Visualizzazione centralizzata di tutti i progetti
- Creazione e gestione progetti multipli
- Panoramica dello stato di avanzamento
- Accesso rapido a tutte le funzionalità

### 📝 Business Plan Editor
Sistema completo per la creazione e gestione di business plan con sezioni dedicate:
- **Executive Summary**: Sintesi esecutiva del progetto
- **Descrizione Azienda**: Presentazione dell'organizzazione
- **Prodotti e Servizi**: Catalogo dell'offerta
- **Analisi di Mercato**: Studio del mercato di riferimento
- **Strategia Marketing**: Piano di marketing integrato
- **Organizzazione**: Struttura organizzativa e team
- **Piano Finanziario**: Proiezioni economiche e finanziarie
- **Esportazione PDF**: Generazione automatica di documenti professionali

### 🎯 Marketing Plan Editor
Editor avanzato per piani marketing con:
- **Mercato Target**: Segmentazione clientela e dimensione mercato
- **Strategia Acquisizione**: Tattiche per acquisire nuovi clienti
- **Piano Prezzi**: Struttura prezzi e offerte
- **Posizionamento Competitivo**: Vantaggio competitivo e USP
- **Canali Comunicazione**: Mix canali marketing (digital, social, eventi)
- **Budget Marketing**: Allocazione investimenti e KPI

#### 🤖 Funzionalità AI Avanzate
- **Selezione Tipo Progetto**: Personalizzazione per progetti solari, eolici, efficienza energetica o generici
- **Generazione AI Contestuale**: Suggerimenti AI specifici per tipo di progetto
- **Validazione Automatica**: Verifica della coerenza dei contenuti con il tipo di progetto
  - Badge di validazione con percentuale di match
  - Identificazione parole chiave mancanti
  - Pulsante "Rigenera" per contenuti non validati
- **Metriche Auto-Generate**: 
  - Tasso di completamento attività marketing
  - Stime di budget (min/max)
  - Timeline in giorni
  - Numero step marketing
  - Canali raccomandati con priorità

### 📁 Document Manager
Sistema completo di gestione documentale con:
- **Upload Documenti**: Caricamento multiplo di file
- **Categorizzazione**: Organizzazione per categorie personalizzabili
- **Versionamento**: Storico completo delle versioni
- **Condivisione**: Sistema di permessi e condivisione documenti
- **Preview**: Anteprima documenti direttamente in app
- **Storage Cloud**: Archiviazione sicura su Lovable Cloud

### 🔄 Process Tracker
Monitoraggio avanzato dei processi con:
- **Step Multipli**: Gestione di fasi complesse
- **Checklist Integrate**: Liste di controllo per ogni fase
- **Tracking Temporale**: Data inizio/completamento
- **Note e Commenti**: Annotazioni per ogni step
- **Assegnazioni**: Assegnazione task ai membri del team
- **Visualizzazione Progresso**: Barre di progresso e indicatori visivi

### 📊 Team Analytics Dashboard
Analisi dettagliate delle performance del team:
- **Metriche Individuali**: 
  - Completion rate per membro
  - Numero task completati
  - Task in ritardo
  - Efficienza
- **Grafici Interattivi**:
  - Completion rate nel tempo (area chart)
  - Distribuzione task per categoria (bar chart)
  - Activity heatmap
  - Distribuzione workload (pie chart)
- **Tabella Performance**: Ranking e dettagli membri del team
- **Filtri Temporali**: Analisi per periodo personalizzato

### 🔔 Sistema Notifiche
Centro notifiche avanzato con:
- **Notifiche Real-time**: Aggiornamenti istantanei
- **Reminder Personalizzati**: Promemoria per scadenze
- **Impostazioni Granulari**: Configurazione per step/attività
- **Note Personalizzate**: Annotazioni associate ai reminder
- **Calcolo Date**: Reminder con giorni di anticipo configurabili

### 👥 Gestione Team
Sistema di collaborazione completo:
- **Inviti Progetto**: Invio inviti via email
- **Ruoli e Permessi**: Owner, Admin, Member, Viewer
- **Gestione Membri**: Aggiunta/rimozione membri
- **Assegnazioni Task**: Distribuzione lavoro al team
- **Commenti Collaborativi**: Discussioni su step specifici

### 🔐 Autenticazione e Sicurezza
- **Sistema Auth Completo**: Registrazione e login
- **Gestione Profili**: Profili utente personalizzabili
- **Row Level Security (RLS)**: Sicurezza a livello database
- **Sessioni Sicure**: Gestione sessioni con Supabase Auth

## 🛠 Tecnologie Utilizzate

### Frontend
- **React 18**: Framework UI moderno
- **TypeScript**: Type safety
- **Vite**: Build tool ultra-veloce
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Componenti UI di alta qualità
- **Lucide React**: Icone moderne
- **React Router**: Routing SPA
- **TanStack Query**: Data fetching e caching
- **React Hook Form**: Gestione form
- **Zod**: Schema validation
- **Recharts**: Grafici e visualizzazioni
- **date-fns**: Manipolazione date
- **jsPDF**: Generazione PDF

### Backend (Lovable Cloud)
- **Supabase**: 
  - Database PostgreSQL
  - Authentication
  - Storage
  - Edge Functions
  - Real-time subscriptions
- **Row Level Security (RLS)**: Sicurezza dati
- **Database Functions**: Logic server-side
- **Triggers**: Automazioni database

### AI Integration
- **Lovable AI Gateway**: 
  - Google Gemini 2.5 Flash
  - Generazione suggerimenti contestuali
  - Validazione automatica contenuti
  - Rate limiting integrato

## 📂 Struttura del Progetto

```
├── src/
│   ├── components/           # Componenti React
│   │   ├── ui/              # Componenti shadcn/ui
│   │   ├── AuthForm.tsx     # Form autenticazione
│   │   ├── BusinessPlanEditor.tsx
│   │   ├── MarketingPlanEditor.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DocumentManager.tsx
│   │   ├── ProcessTracker.tsx
│   │   ├── TeamAnalyticsDashboard.tsx
│   │   └── NotificationCenter.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useBusinessPlan.tsx
│   │   ├── useMarketingPlan.tsx
│   │   ├── useDocuments.tsx
│   │   ├── useStepProgress.tsx
│   │   ├── useTeamAnalytics.tsx
│   │   ├── useNotifications.tsx
│   │   └── useExportPDF.tsx
│   ├── pages/               # Pagine principali
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── integrations/        # Integrazioni esterne
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts     # Auto-generato da Supabase
│   ├── data/                # Dati statici
│   │   └── processSteps.ts
│   ├── lib/                 # Utilities
│   │   └── utils.ts
│   ├── index.css            # Stili globali + design system
│   └── main.tsx             # Entry point
├── supabase/
│   ├── functions/           # Edge Functions
│   │   └── generate-marketing-suggestions/
│   │       └── index.ts
│   ├── migrations/          # Database migrations
│   └── config.toml          # Configurazione Supabase
├── public/                  # Asset statici
└── package.json
```

## 🗄 Schema Database

### Tabelle Principali

#### `projects`
Progetti principali
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT)
- `owner_id` (UUID)
- `created_at`, `updated_at`

#### `business_plans`
Business plan per progetto
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `executive_summary` (TEXT)
- `company_description` (TEXT)
- `products_services` (TEXT)
- `market_analysis` (TEXT)
- `marketing_strategy` (TEXT)
- `organization` (TEXT)
- `financial_plan` (TEXT)

#### `marketing_plans`
Piani marketing per progetto
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `project_type` (TEXT) - solare, eolico, efficienza_energetica, generale
- `target_market` (TEXT)
- `acquisition_strategy` (TEXT)
- `pricing_strategy` (TEXT)
- `competitive_positioning` (TEXT)
- `communication_channels` (TEXT)
- `budget_allocation` (TEXT)

#### `documents`
Sistema di gestione documentale
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `title` (TEXT)
- `description` (TEXT)
- `file_name`, `file_path`, `file_type`, `file_size`
- `category_id` (UUID, FK → document_categories)
- `version` (INTEGER)
- `is_latest` (BOOLEAN)
- `uploaded_by` (UUID)

#### `step_progress`
Tracciamento avanzamento step
- `id` (UUID, PK)
- `user_id` (UUID)
- `project_id` (UUID, FK → projects)
- `step_id` (TEXT)
- `completed` (BOOLEAN)
- `start_date`, `completion_date`
- `notes` (TEXT)
- `checklist_progress` (JSONB)

#### `project_members`
Membri del progetto
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `user_id` (UUID)
- `role` (ENUM: owner, admin, member, viewer)

#### `notification_settings`
Configurazione notifiche
- `id` (UUID, PK)
- `user_id` (UUID)
- `step_id` (TEXT)
- `enabled` (BOOLEAN)
- `reminder_date` (TIMESTAMP)
- `reminder_days_before` (INTEGER)
- `note` (TEXT)

### Altre Tabelle
- `profiles`: Profili utente estesi
- `document_categories`: Categorie documentali
- `document_versions`: Storico versioni documenti
- `document_shares`: Condivisioni documenti
- `project_invites`: Inviti a progetti
- `step_assignments`: Assegnazioni task
- `step_comments`: Commenti su step

## 🔐 Row Level Security (RLS)

Tutte le tabelle implementano RLS policies per garantire:
- Accesso solo ai propri dati
- Permessi basati su ruolo nel progetto
- Isolamento completo tra progetti
- Sicurezza a livello database

## 🚀 Edge Functions

### `generate-marketing-suggestions`
Genera suggerimenti AI per piani marketing
- **Input**: `sectionId`, `projectData`, `projectType`
- **Output**: Contenuto generato specifico per tipo di progetto
- **AI Model**: Google Gemini 2.5 Flash (via Lovable AI)
- **Features**:
  - Prompting contestuale per tipo progetto
  - Validazione automatica contenuti
  - Rate limiting gestito
  - Gestione errori 429/402

## 🎨 Design System

Il design system è definito in `src/index.css` e `tailwind.config.ts`:
- **Semantic Tokens**: Colori HSL tematici (primary, secondary, accent, etc.)
- **Dark/Light Mode**: Supporto completo
- **Typography**: Sistema tipografico coerente
- **Spacing**: Scale di spacing consistente
- **Animations**: Transizioni fluide
- **Responsive**: Mobile-first approach

## 📦 Installazione e Setup

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Installa dipendenze
npm install

# Configura variabili ambiente
# Le variabili Supabase sono auto-configurate da Lovable Cloud
# Non serve configurare .env manualmente

# Avvia dev server
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:8080`

## 🔧 Comandi Disponibili

```bash
npm run dev          # Avvia dev server (http://localhost:8080)
npm run build        # Build produzione
npm run preview      # Preview build locale
npm run lint         # Lint codice con ESLint
```

## 🌐 Deploy

L'applicazione è configurata per il deploy su Lovable Cloud:

1. **Frontend**: 
   - Apri [Lovable](https://lovable.dev/projects/3c754453-d8bf-47cd-9b61-62038424040e)
   - Click su "Publish" (icona Share)
   - Conferma deploy

2. **Backend**: 
   - Edge functions deployano automaticamente
   - Migrations applicate automaticamente
   - Storage configurato automaticamente

### Custom Domain

Per collegare un dominio personalizzato:
1. Vai su Project > Settings > Domains
2. Click "Connect Domain"
3. Segui le istruzioni per configurare DNS

Documentazione: [Custom Domain Setup](https://docs.lovable.dev/features/custom-domain)

## 📱 Funzionalità Mobile

- Design completamente responsive
- Touch-friendly UI
- Navigazione ottimizzata per mobile
- Performance ottimizzate
- PWA-ready

## 🔒 Sicurezza

- ✅ Row Level Security su tutte le tabelle
- ✅ Autenticazione sicura con Supabase Auth
- ✅ Validazione input con Zod
- ✅ CORS configurato correttamente
- ✅ Secrets gestiti tramite Supabase Vault
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Rate limiting su Edge Functions

## 📈 Performance

- Code splitting automatico con Vite
- Lazy loading componenti
- Caching intelligente con TanStack Query
- Ottimizzazione bundle size
- Edge functions serverless auto-scaling
- Database indexing ottimizzato

## 🧪 Testing e Debug

Per accedere agli strumenti di debug:
- **Console Logs**: Disponibili nel browser DevTools
- **Database**: Accesso via Lovable Cloud > Database
- **Edge Functions Logs**: Lovable Cloud > Edge Functions > Logs
- **Network Requests**: Browser DevTools > Network tab

## 🤝 Sviluppo Locale

Sono supportati diversi metodi di sviluppo:

### Lovable Editor (Raccomandato)
- Visita [Lovable Project](https://lovable.dev/projects/3c754453-d8bf-47cd-9b61-62038424040e)
- Modifica con AI prompting
- Changes auto-committed al repo

### IDE Locale
- Clone repo e lavora localmente
- Push changes sincronizzati con Lovable
- Richiede Node.js & npm

### GitHub Codespaces
- Launch Codespace dal repo
- Ambiente di sviluppo cloud completo
- Zero setup required

### Edit diretto su GitHub
- Navigate al file
- Click "Edit" (pencil icon)
- Commit changes direttamente

## 📚 Documentazione Utile

- [Lovable Documentation](https://docs.lovable.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 🆘 Supporto

Per problemi o domande:
- Apri una issue su GitHub
- Consulta [Lovable Docs](https://docs.lovable.dev)
- Join [Lovable Discord Community](https://discord.com/channels/1119885301872070706)

## 🎯 Roadmap

### In Sviluppo
- ✅ Validazione automatica contenuti AI
- ✅ Sistema notifiche avanzato
- ✅ Team analytics dashboard

### Prossime Funzionalità
- [ ] Export Excel per analytics
- [ ] Integrazione calendario Google/Outlook
- [ ] Mobile app nativa (iOS/Android)
- [ ] Template business plan predefiniti
- [ ] Analisi predittiva con AI
- [ ] Benchmark settoriali automatici
- [ ] Integrazione CRM (Salesforce, HubSpot)
- [ ] API pubblica REST/GraphQL
- [ ] White-label option per agenzie
- [ ] Multi-language support
- [ ] Gantt chart per project planning
- [ ] Budget tracking in tempo reale

## 🏆 Credits

**Sviluppato con**: [Lovable](https://lovable.dev)  
**AI Powered by**: Lovable AI Gateway (Google Gemini)  
**Backend**: Lovable Cloud (Supabase)

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: Novembre 2025  
**Stato**: ✅ Produzione  
**Licenza**: Proprietaria

## 📊 Project Info

**Project URL**: https://lovable.dev/projects/3c754453-d8bf-47cd-9b61-62038424040e
