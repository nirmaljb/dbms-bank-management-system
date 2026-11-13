import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from './create-app.js';

if (!process.env.DATABASE_URL) {
  if (process.env.VERCEL) {
    // Exiting here kills the function on every request (FUNCTION_INVOCATION_FAILED)
    // and hides this message. Keep serving so requests that need the database
    // return a JSON 500 and this line shows in the Vercel logs.
    console.error(
      'DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.'
    );
  } else {
    console.error('DATABASE_URL is not set. Add it to apps/server/.env, then run npm run db:setup.');
    process.exit(1);
  }
}

const app = createApp();
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
