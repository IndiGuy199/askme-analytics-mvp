import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ENCRYPTION_KEY = process.env.POSTHOG_ENCRYPTION_KEY;

// Encrypt PostHog API key before storing
function encryptApiKey(apiKey) {
  if (!ENCRYPTION_KEY) {
    console.warn('No encryption key found, storing API key in plaintext (not recommended for production)');
    return apiKey;
  }
  
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt PostHog API key when reading
function decryptApiKey(encryptedKey) {
  if (!ENCRYPTION_KEY) {
    console.warn('No encryption key found, assuming plaintext API key');
    return encryptedKey;
  }
  
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getCompanyPostHogConfig(companyId) {
  const { data: company, error } = await supabase
    .from('companies')
    .select('posthog_project_id, posthog_api_key_encrypted, posthog_client_id, name, slug')
    .eq('id', companyId)
    .eq('is_active', true)
    .single();

  if (error || !company) {
    throw new Error(`Company not found or inactive: ${companyId}`);
  }

  if (!company.posthog_project_id || !company.posthog_api_key_encrypted) {
    throw new Error(`PostHog not configured for company: ${company.name}`);
  }

  return {
    clientId: company.posthog_client_id || company.slug, // Use client_id if set, fallback to slug
    name: company.name,
    projectId: company.posthog_project_id,
    apiKey: decryptApiKey(company.posthog_api_key_encrypted)
  };
}

export async function getCompanyEmailRecipients(companyId) {
  const { data: recipients, error } = await supabase
    .from('email_recipients')
    .select('email')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw error;

  return recipients.map(r => r.email);
}

export async function getAllActiveCompanies() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, slug, posthog_project_id, posthog_api_key_encrypted, posthog_client_id')
    .eq('is_active', true)
    .not('posthog_project_id', 'is', null)
    .not('posthog_api_key_encrypted', 'is', null);

  if (error) throw error;

  return companies.map(company => ({
    companyId: company.id,
    clientId: company.posthog_client_id || company.slug, // Use client_id if set, fallback to slug
    name: company.name,
    projectId: company.posthog_project_id,
    apiKey: decryptApiKey(company.posthog_api_key_encrypted)
  }));
}
