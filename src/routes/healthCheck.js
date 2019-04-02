const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ status: 200, statusText: 'OK' });
});

router.get('/healthcheck', (req, res) => {
    res.json({ status: 200, statusText: 'OK' });
});

module.exports = router;
