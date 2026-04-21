const app = require('../backend/server');

// Export a function wrapper to ensure the Vercel Node builder invokes the Express app
module.exports = (req, res) => app(req, res);
