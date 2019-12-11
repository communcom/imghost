const express = require('express');

const { forceGetFromStorage } = require('../utils/discStorage');
const { convertIfNeed } = require('../utils/convert');
const { apiWrapper, sendFile } = require('../utils/express');
const { checkReferer } = require('../utils/origin');

const router = express.Router();

router.get(
    '/images/:filename',
    checkReferer,
    apiWrapper(async (req, res) => {
        const { params, headers } = req;
        const { filename } = params;

        sendFile(
            res,
            await convertIfNeed(await forceGetFromStorage(filename), filename, headers.accept)
        );
    })
);

module.exports = router;
