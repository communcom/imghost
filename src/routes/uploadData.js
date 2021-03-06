const express = require('express');
const multer = require('multer');

const config = require('../config');
const { ALLOWED_MIME_TYPES } = require('../utils/mime');
const { processAndSave } = require('../utils/uploading');
const { apiWrapper, ResponseError, JSONResponse } = require('../utils/express');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fieldSize: '10MB',
        fileSize: '10MB',
    },
    fileFilter(req, file, cb) {
        if (file.fieldname !== 'file') {
            cb(null, false);
            return;
        }

        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new ResponseError(400, 'Invalid type'), false);
    },
});

router.post(
    '/upload',
    upload.single('file'),
    apiWrapper(async req => {
        if (!req.file) {
            throw new ResponseError(400, 'No file');
        }

        const { buffer } = req.file;

        const { fileId } = await processAndSave(buffer);

        const { protocol, domainName, port } = config;
        const filePath = `images/${fileId}`;
        let url;

        if (protocol === 'https') {
            url = `https://${domainName}/${filePath}`;
        } else {
            url = `${protocol}://${domainName}:${port}/${filePath}`;
        }

        return new JSONResponse({
            url,
        });
    })
);

module.exports = router;
