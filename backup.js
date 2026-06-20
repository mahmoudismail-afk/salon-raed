const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'profiles',
  'membership_plans',
  'members',
  'memberships',
  'payments',
  'expenses'
];

async function backup() {
  console.log('🚀 Starting "One-Click" Backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseBackupDir = 'C:\\WEB\\backup raed';
  const backupDir = path.join(baseBackupDir, `backup-${timestamp}`);
  
  if (!fs.existsSync(baseBackupDir)) {
    fs.mkdirSync(baseBackupDir, { recursive: true });
  }
  fs.mkdirSync(backupDir);

  const fullBackup = {};

  for (const table of TABLES) {
    console.log(`📦 Fetching data from: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`❌ Error backing up ${table}:`, error.message);
      continue;
    }

    fullBackup[table] = data;
    
    // Save individual CSV-like JSON for this table
    fs.writeFileSync(
      path.join(backupDir, `${table}.json`),
      JSON.stringify(data, null, 2)
    );
  }

  // Save everything into one master file
  const masterPath = path.join(backupDir, 'full_database_backup.json');
  fs.writeFileSync(masterPath, JSON.stringify(fullBackup, null, 2));

  console.log('\n✅ Backup Complete!');
  console.log(`📁 Files saved in: ${backupDir}`);
  console.log(`📄 Total tables backed up: ${Object.keys(fullBackup).length}`);
}

backup().catch(err => {
  console.error('💥 Critical Backup Failure:', err);
});
