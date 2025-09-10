import { createClient } from '@supabase/supabase-js';
import { CLIENTS } from '../config/clients.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getQueryConfigForCompany(companyId) {
  const { data: configs, error } = await supabase
    .from('query_configurations')
    .select('query_type, query_config')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;

  // Convert array to object keyed by query_type
  const queries = {};
  configs.forEach(config => {
    queries[config.query_type] = config.query_config;
  });

  // Fallback to default queries if not configured in database
  const defaultClient = CLIENTS[0]; // Use first client as template

  return {
    traffic: queries.traffic || defaultClient.queries.traffic.query,
    funnel: queries.funnel || defaultClient.queries.funnel.query,
    retention: queries.retention || defaultClient.queries.retention.query,
    deviceMix: queries.deviceMix || defaultClient.queries.deviceMix.query,
    geography: queries.geography || defaultClient.queries.geography?.query,
    lifecycle: queries.lifecycle || defaultClient.queries.lifecycle?.query,
  };
}
