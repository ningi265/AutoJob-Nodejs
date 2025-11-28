require('dotenv').config();
require('express-async-errors');

const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 8001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
});
