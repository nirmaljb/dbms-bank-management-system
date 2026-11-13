// The build emits CommonJS (see tsconfig.build.json). This package is
// "type": "module", so mark dist as CommonJS for local `node dist/index.js`.
import { writeFileSync } from 'node:fs';
import { URL } from 'node:url';

writeFileSync(new URL('../dist/package.json', import.meta.url), '{ "type": "commonjs" }\n');
