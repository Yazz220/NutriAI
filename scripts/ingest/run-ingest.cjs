// CommonJS launcher to run the TypeScript ingestion script reliably on Windows/PowerShell.
// - Loads env from DOTENV_CONFIG_PATH or default scripts/ingest/.env
// - Registers ts-node in transpileOnly mode with CommonJS compiler option
// - Requires the TS entrypoint

const path = require('path');
const dotenvPath = process.env.DOTENV_CONFIG_PATH || path.join('scripts', 'ingest', '.env');

require('dotenv').config({ path: dotenvPath });
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

require('./ingest-recipes.ts');
