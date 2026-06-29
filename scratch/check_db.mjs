import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfjzyqhcfvlhfwvoseds.supabase.co';
const supabaseAnonKey = 'sb_publishable_9cVqmTrC24LPk2DXPDoPSw_Gk4sWLD8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('soal_skd').select('id, tipe');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Total Soal: ${data.length}`);
  
  const counts = {};
  for (const row of data) {
    counts[row.tipe] = (counts[row.tipe] || 0) + 1;
  }
  
  console.log('Counts by Tipe:', counts);
}

check();
