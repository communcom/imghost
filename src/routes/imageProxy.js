const express = require('express');
const sharp = require('sharp');
const urlParser = require('url');
const request = require('request-promise-native');

const { domainName } = require('../config');
const { ExternalImage } = require('../db');
const { getFromStorage, saveToStorage } = require('../utils/discStorage');
const { processAndSave } = require('../utils/uploading');
const { apiWrapper, ResponseError } = require('../utils/express');

const DOWNLOAD_FILE_LIMIT = 10 * 1024 * 1024;

const router = express.Router();

function makeResizedFileId(fileId, { width, height }) {
    return fileId.replace('.', `_${width}x${height}.`);
}

async function checkResizedCache({ fileId, width, height }) {
    try {
        const resizedFileId = makeResizedFileId(fileId, { width, height });
        return await getFromStorage(resizedFileId);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn('Resized cache reading failed:', err);
        }
    }

    return null;
}

async function process({ fileId, width, height, buffer }) {
    const resizedCache = await sharp(buffer)
        .resize(width, height, { fit: 'cover', withoutEnlargement: true })
        .toBuffer();

    setTimeout(async () => {
        try {
            const resizedFileId = makeResizedFileId(fileId, { width, height });

            await saveToStorage(resizedFileId, resizedCache);
        } catch (err) {
            console.warn('Cache saving failed:', err);
        }
    }, 0);

    return resizedCache;
}

router.get(
    '/images/:width(\\d+)x:height(\\d+)/:fileId',
    apiWrapper(async (req, res) => {
        const width = Number(req.params.width);
        const height = Number(req.params.height);
        const { fileId } = req.params;

        let buffer = await checkResizedCache({ fileId, width, height });

        if (buffer) {
            res.send(buffer);
            return;
        }

        try {
            buffer = await getFromStorage(fileId);
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new ResponseError(404, 'Not found');
            }
            throw err;
        }

        buffer = await process({
            fileId,
            width,
            height,
            buffer,
        });

        res.send(buffer);
    })
);

router.get(
    '/proxy/:width(\\d+)x:height(\\d+)/*',
    apiWrapper(async (req, res) => {
        const width = Number(req.params.width);
        const height = Number(req.params.height);

        const url = decodeURIComponent(req.originalUrl.match(/^\/proxy\/\d+x\d+\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        let buffer;
        let fileId;

        if (urlInfo.protocol === 'https:' && urlInfo.host === domainName) {
            const match = urlInfo.path.match(/^\/images\/([A-Za-z0-9]+\.(?:jpg|gif|png))$/);

            if (match) {
                fileId = match[1];

                buffer = await checkResizedCache({ fileId, width, height });

                if (buffer) {
                    res.send(buffer);
                    return;
                }

                buffer = await getFromStorage(fileId);
            }
        }

        if (!buffer) {
            const externalImage = await ExternalImage.findOne(
                {
                    url,
                },
                'fileId'
            );

            if (externalImage) {
                fileId = externalImage.fileId;

                buffer = await checkResizedCache({ fileId, width, height });

                if (buffer) {
                    res.send(buffer);
                    return;
                }

                try {
                    buffer = await getFromStorage(fileId);
                } catch (err) {
                    console.warn('File not found in cache:', err);
                }
            }

            if (!buffer) {
                try {
                    buffer = await request({
                        url,
                        gzip: true,
                        encoding: null,
                        timeout: 20000,
                        headers: {
                            'user-agent':
                                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36',
                        },
                    });

                    if (buffer.length > DOWNLOAD_FILE_LIMIT) {
                        throw new ResponseError(400, 'Too big file');
                    }

                    try {
                        const data = await processAndSave(buffer);
                        fileId = data.fileId;
                        buffer = data.buffer;

                        await new ExternalImage({
                            url,
                            fileId: data.fileId,
                        }).save();
                    } catch (err) {
                        // Ignore error
                    }
                } catch (err) {
                    console.warn('Request failed:', err);
                }
            }
        }

        if (!buffer) {
            throw new ResponseError(404, 'Not found');
        }

        buffer = await process({ fileId, width, height, buffer });

        res.send(buffer);
    })
);

module.exports = router;
