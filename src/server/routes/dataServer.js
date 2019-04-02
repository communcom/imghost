const express = require('express');

const { getFromStorage } = require('../utils/discStorage');
const { apiWrapper, ResponseError } = require('../utils/express');

const router = express.Router();

router.get(
    '/images/:filename',
    apiWrapper(async (req, res) => {
        const { filename } = req.params;

        try {
            res.send(await getFromStorage(filename));
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new ResponseError(404, 'File not found');
            }

            throw new ResponseError(500, `Error fetching ${filename}`);
        }
    })
);

module.exports = router;
