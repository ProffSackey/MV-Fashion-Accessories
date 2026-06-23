/**
 * Script to clear all shipping zones from the database
 * Usage: node scripts/clear-shipping-zones.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function clearShippingZones() {
  try {
    console.log('Clearing all shipping zones...');

    // Fetch all zones first to show what's being deleted
    const { data: zones, error: fetchError } = await supabase
      .from('shipping_zones')
      .select('*');

    if (fetchError) {
      console.error('Error fetching zones:', fetchError);
      process.exit(1);
    }

    if (!zones || zones.length === 0) {
      console.log('No shipping zones to delete.');
      process.exit(0);
    }

    console.log(`Found ${zones.length} shipping zones:`);
    zones.forEach(zone => {
      console.log(`  - ${zone.name} (${zone.country}): GHS ${zone.base_fee}`);
    });

    // Delete all zones
    const { error: deleteError } = await supabase
      .from('shipping_zones')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (where id != impossible-value)

    if (deleteError) {
      console.error('Error deleting zones:', deleteError);
      process.exit(1);
    }

    console.log(`\n✓ Successfully deleted ${zones.length} shipping zone(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

clearShippingZones();
