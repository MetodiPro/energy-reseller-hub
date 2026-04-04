import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BUCKET = 'config';
const TARIFF_PATH = 'arera-tariffs/current.json';

interface AreraTariffs {
  quarter: string;
  year: number;
  effective_date: string;
  delibera: string;
  trasporto: {
    quotaFissaAnno: number;
    quotaPotenzaKwAnno: number;
    quotaEnergiaKwh: number;
  };
  oneri: {
    asosKwh: number;
    arimKwh: number;
  };
  accise: {
    domesticoKwh: number;
    altriUsiKwh: number;
  };
  next_update_date: string;
  last_updated_at: string;
  updated_by: string;
}

const DEFAULT_TARIFFS: AreraTariffs = {
  quarter: 'Q1',
  year: 2026,
  effective_date: '2026-01-01',
  delibera: '588/2025/R/com',
  trasporto: {
    quotaFissaAnno: 23.00,
    quotaPotenzaKwAnno: 22.00,
    quotaEnergiaKwh: 0.00812,
  },
  oneri: {
    asosKwh: 0.02500,
    arimKwh: 0.00700,
  },
  accise: {
    domesticoKwh: 0.02270,
    altriUsiKwh: 0.01250,
  },
  next_update_date: '2026-04-01',
  last_updated_at: '',
  updated_by: 'system_init',
};

function buildResponse(tariffs: AreraTariffs, freshness: 'storage' | 'default_init', clientType?: string) {
  const now = new Date();
  const nextUpdate = new Date(tariffs.next_update_date);
  const diffMs = nextUpdate.getTime() - now.getTime();
  const daysUntilUpdate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const requiresUpdate = now > nextUpdate;

  const isBusinessClient = clientType === 'business' || clientType === 'pmi';

  return {
    success: true,
    data: {
      ...tariffs,
      acciseApplicate: isBusinessClient ? tariffs.accise.altriUsiKwh : tariffs.accise.domesticoKwh,
      ivaPercent: isBusinessClient ? 22 : 10,
      clientType: clientType || 'domestico',
    },
    data_freshness: freshness,
    next_update: tariffs.next_update_date,
    days_until_update: daysUntilUpdate,
    requires_update: requiresUpdate,
  };
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey);
}

async function readTariffsFromStorage(supabase: ReturnType<typeof createClient>): Promise<{ tariffs: AreraTariffs; freshness: 'storage' | 'default_init' }> {
  const { data, error } = await supabase.storage.from(BUCKET).download(TARIFF_PATH);

  if (error || !data) {
    console.log('Tariff file not found in storage, initializing with defaults...');
    // Save defaults to storage
    const blob = new Blob([JSON.stringify(DEFAULT_TARIFFS, null, 2)], { type: 'application/json' });
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(TARIFF_PATH, blob, { contentType: 'application/json', upsert: true });

    if (uploadError) {
      console.error('Failed to save default tariffs:', uploadError);
    }

    return { tariffs: { ...DEFAULT_TARIFFS, last_updated_at: new Date().toISOString() }, freshness: 'default_init' };
  }

  const text = await data.text();
  const tariffs: AreraTariffs = JSON.parse(text);
  return { tariffs, freshness: 'storage' };
}

async function writeTariffsToStorage(supabase: ReturnType<typeof createClient>, tariffs: AreraTariffs): Promise<AreraTariffs> {
  const updated: AreraTariffs = {
    ...tariffs,
    last_updated_at: new Date().toISOString(),
    updated_by: 'admin',
  };

  const blob = new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(TARIFF_PATH, blob, { contentType: 'application/json', upsert: true });

  if (error) {
    throw new Error(`Failed to save tariffs: ${error.message}`);
  }

  return updated;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // supabase.functions.invoke usa sempre POST — distinguiamo read/write tramite _action
    const body = await req.json().catch(() => ({}));
    const { _action, clientType, ...tariffData } = body;

    if (!_action || _action === 'read') {
      // Lettura tariffe
      const { tariffs, freshness } = await readTariffsFromStorage(supabase);
      const response = buildResponse(tariffs, freshness, clientType);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (_action === 'write') {
      // Scrittura tariffe — tariffData contiene i campi da aggiornare
      if (tariffData.trasporto || tariffData.oneri || tariffData.accise || tariffData.delibera) {
        // Merge with existing to allow partial updates
        const { tariffs: existing } = await readTariffsFromStorage(supabase);
        const merged: AreraTariffs = {
          ...existing,
          ...tariffData,
          trasporto: { ...existing.trasporto, ...(tariffData.trasporto || {}) },
          oneri: { ...existing.oneri, ...(tariffData.oneri || {}) },
          accise: { ...existing.accise, ...(tariffData.accise || {}) },
        };

      let saved: AreraTariffs;
      let freshness: 'storage' | 'default_init' = 'storage';
      try {
        saved = await writeTariffsToStorage(supabase, merged);
      } catch (writeError) {
        console.error('Storage write failed:', writeError);
        return new Response(
          JSON.stringify({ success: false, error: `Salvataggio fallito: ${(writeError as Error).message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const response = buildResponse(saved, freshness, clientType);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      }
    }

    // _action sconosciuta — lettura di fallback
    const { tariffs, freshness } = await readTariffsFromStorage(supabase);
    const response = buildResponse(tariffs, freshness, clientType);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-arera-tariffs:', error);

    // Fallback response with defaults
    const response = buildResponse(DEFAULT_TARIFFS, 'default_init');

    return new Response(
      JSON.stringify({
        ...response,
        success: false,
        warning: `Errore interno: ${(error as Error).message}. Utilizzate tariffe di default (delibera ${DEFAULT_TARIFFS.delibera}).`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
