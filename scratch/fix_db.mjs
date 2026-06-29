import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfjzyqhcfvlhfwvoseds.supabase.co';
const supabaseAnonKey = 'sb_publishable_9cVqmTrC24LPk2DXPDoPSw_Gk4sWLD8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
  const { data, error } = await supabase.from('soal_skd').select('id, tipe');
  if (error) {
    console.error(error);
    return;
  }
  
  let updatedCount = 0;
  for (const row of data) {
    let newTipe = row.tipe;
    if (row.tipe.startsWith('TWK')) newTipe = 'TWK';
    else if (row.tipe.startsWith('TIU')) newTipe = 'TIU';
    else if (row.tipe.startsWith('TKP')) newTipe = 'TKP';
    
    if (newTipe !== row.tipe) {
      console.log(`Mengubah ID ${row.id} dari '${row.tipe}' menjadi '${newTipe}'`);
      const { error: updateError } = await supabase
        .from('soal_skd')
        .update({ tipe: newTipe })
        .eq('id', row.id);
        
      if (updateError) {
        console.error(`Gagal mengubah ID ${row.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Selesai! ${updatedCount} soal berhasil diperbaiki.`);
}

fix();
