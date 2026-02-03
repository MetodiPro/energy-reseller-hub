import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SalesChannel {
  id: string;
  project_id: string;
  channel_name: string;
  channel_type: 'predefined' | 'custom';
  commission_amount: number;
  commission_type: 'per_contract' | 'per_activation';
  activation_rate: number;
  contract_share: number;
  is_active: boolean;
  notes: string | null;
}

// Predefined channels with defaults
export const PREDEFINED_CHANNELS = [
  { name: 'Agenti', commission: 80, type: 'per_activation' as const, activationRate: 85 },
  { name: 'Call Center', commission: 50, type: 'per_contract' as const, activationRate: 70 },
  { name: 'Web/Online', commission: 20, type: 'per_activation' as const, activationRate: 90 },
  { name: 'Sportelli', commission: 60, type: 'per_activation' as const, activationRate: 88 },
  { name: 'Referral', commission: 40, type: 'per_activation' as const, activationRate: 92 },
];

export const useSalesChannels = (projectId: string | null) => {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchChannels = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('project_sales_channels')
      .select('*')
      .eq('project_id', projectId)
      .order('channel_name');

    if (error) {
      console.error('Error fetching sales channels:', error);
      setLoading(false);
      return;
    }

    setChannels(data as SalesChannel[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Initialize predefined channels for a project
  const initializePredefinedChannels = async () => {
    if (!projectId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const channelsToInsert = PREDEFINED_CHANNELS.map((ch, index) => ({
      project_id: projectId,
      channel_name: ch.name,
      channel_type: 'predefined' as const,
      commission_amount: ch.commission,
      commission_type: ch.type,
      activation_rate: ch.activationRate,
      contract_share: index === 0 ? 100 : 0, // First channel gets 100% by default
      is_active: index === 0, // Only first channel active by default
      created_by: user.id,
    }));

    const { error } = await supabase
      .from('project_sales_channels')
      .insert(channelsToInsert);

    if (error) {
      console.error('Error initializing channels:', error);
      return false;
    }

    await fetchChannels();
    return true;
  };

  // Add a custom channel
  const addChannel = async (channel: Omit<SalesChannel, 'id' | 'project_id'>) => {
    if (!projectId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Errore', description: 'Devi essere autenticato', variant: 'destructive' });
      return null;
    }

    const { data, error } = await supabase
      .from('project_sales_channels')
      .insert({
        ...channel,
        project_id: projectId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding channel:', error);
      toast({ title: 'Errore', description: 'Impossibile aggiungere il canale', variant: 'destructive' });
      return null;
    }

    await fetchChannels();
    toast({ title: 'Canale aggiunto', description: `${channel.channel_name} configurato` });
    return data as SalesChannel;
  };

  // Update a channel
  const updateChannel = async (id: string, updates: Partial<SalesChannel>) => {
    const { error } = await supabase
      .from('project_sales_channels')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating channel:', error);
      toast({ title: 'Errore', description: 'Impossibile aggiornare il canale', variant: 'destructive' });
      return false;
    }

    await fetchChannels();
    return true;
  };

  // Delete a channel
  const deleteChannel = async (id: string) => {
    const { error } = await supabase
      .from('project_sales_channels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting channel:', error);
      toast({ title: 'Errore', description: 'Impossibile eliminare il canale', variant: 'destructive' });
      return false;
    }

    await fetchChannels();
    toast({ title: 'Canale eliminato' });
    return true;
  };

  // Calculate weighted average activation rate
  const getWeightedActivationRate = useCallback(() => {
    const activeChannels = channels.filter(c => c.is_active && c.contract_share > 0);
    if (activeChannels.length === 0) return 85; // default

    const totalShare = activeChannels.reduce((sum, c) => sum + c.contract_share, 0);
    if (totalShare === 0) return 85;

    const weightedRate = activeChannels.reduce((sum, c) => 
      sum + (c.activation_rate * c.contract_share), 0
    ) / totalShare;

    return weightedRate;
  }, [channels]);

  // Calculate total commission costs for a given number of contracts
  const calculateCommissionCosts = useCallback((totalContracts: number, activatedCustomers: number) => {
    const activeChannels = channels.filter(c => c.is_active && c.contract_share > 0);
    
    let totalCost = 0;
    activeChannels.forEach(channel => {
      const channelContracts = Math.round(totalContracts * (channel.contract_share / 100));
      
      if (channel.commission_type === 'per_contract') {
        // Pay on contract signing
        totalCost += channelContracts * channel.commission_amount;
      } else {
        // Pay on activation - use channel-specific activation rate
        const channelActivations = Math.round(channelContracts * (channel.activation_rate / 100));
        totalCost += channelActivations * channel.commission_amount;
      }
    });

    return totalCost;
  }, [channels]);

  // Get breakdown by channel
  const getChannelBreakdown = useCallback((totalContracts: number) => {
    return channels
      .filter(c => c.is_active && c.contract_share > 0)
      .map(channel => {
        const contracts = Math.round(totalContracts * (channel.contract_share / 100));
        const activations = Math.round(contracts * (channel.activation_rate / 100));
        const cost = channel.commission_type === 'per_contract'
          ? contracts * channel.commission_amount
          : activations * channel.commission_amount;

        return {
          ...channel,
          contracts,
          activations,
          cost,
        };
      });
  }, [channels]);

  return {
    channels,
    loading,
    initializePredefinedChannels,
    addChannel,
    updateChannel,
    deleteChannel,
    getWeightedActivationRate,
    calculateCommissionCosts,
    getChannelBreakdown,
    refetch: fetchChannels,
  };
};
