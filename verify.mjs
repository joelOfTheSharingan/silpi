import { createClient } from '@supabase/supabase-js';
const url = 'https://nvayoiarsbsrzwbcszen.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YXlvaWFyc2Jzcnp3YmNzemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODI5MDcsImV4cCI6MjEwNTA1ODkwN30.FdiHBCvelm8GWB4TdnmJKVpGyc4k5Hv46XO7u0yIiUI';
const svc = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YXlvaWFyc2Jzcnp3YmNzemVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ4MjkwNywiZXhwIjoyMTA1MDU4OTA3fQ.1Xpjz_7YSMOhtc_hFlZYLa4qsWfBsnDjdL6oZWH-azI';
const cAnon = createClient(url, anon);
const cSvc = createClient(url, svc);

async function q(client, label){
  const tables = ['users','projects','billing_stages','bills','bill_taxes','bill_deductions','payments'];
  for(const t of tables){
    const {count, error, data} = await client.from(t).select('*', {count:'exact', head:true});
    if(error) console.log(`[${label}] ${t}: ERROR ${error.code} ${error.message}`);
    else console.log(`[${label}] ${t}: count=${count}`);
  }
  // views
  for(const v of ['project_billing_totals','bill_payment_totals']){
    const {count, error, data} = await client.from(v).select('*', {count:'exact'});
    if(error) console.log(`[${label}] VIEW ${v}: ERROR ${error.code} ${error.message}`);
    else console.log(`[${label}] VIEW ${v}: count=${data?.length} sample=${JSON.stringify(data?.slice(0,1))}`);
  }
  // try silpidb schema too
  for(const t of ['projects','bills']){
    const {count, error} = await client.schema('silpidb').from(t).select('*', {count:'exact', head:true});
    if(error) console.log(`[${label}] silpidb.${t}: ERROR ${error.code} ${error.message}`);
    else console.log(`[${label}] silpidb.${t}: count=${count}`);
  }
}
console.log('=== ANON ===');
await q(cAnon, 'anon');
console.log('=== SERVICE ===');
await q(cSvc, 'svc');
