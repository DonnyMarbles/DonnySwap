import 'dotenv/config';

import createApp from './src/app.js';
import { SERVER_PORT } from './src/config/constants.js';

const app = createApp();
const port = SERVER_PORT;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

