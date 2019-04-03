const express = require('express');

const { getFromStorage } = require('../utils/discStorage');
const { apiWrapper, sendFile, ResponseError } = require('../utils/express');

const router = express.Router();

router.get(
    '/images/:filename',
    apiWrapper(async (req, res) => {
        const { filename } = req.params;

        try {
            sendFile(res, filename, await getFromStorage(filename));
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new ResponseError(404, 'File not found');
            }

            throw err;
        }
    })
);

module.exports = router;
