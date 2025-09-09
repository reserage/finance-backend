const express = require('express');
const lineController = require('../Controllers/lineController');
const app = express();

app.post('/webhook', lineController.easyResponse);

app.post('/bind/code', lineController.generateLineBindCode);

module.exports = app;