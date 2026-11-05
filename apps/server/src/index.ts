import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to apps/server/.env, then run npm run db:setup.');
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
