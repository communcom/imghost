const express = require('express');
const sharp = require('sharp');
const urlParser = require('url');

const { domainName } = require('../config');
const { ExternalImage } = require('../db');
const { getFromStorage, saveToStorage } = require('../utils/discStorage');
const { downloadImage } = require('../utils/download');
const { processAndSave } = require('../utils/uploading');
const { apiWrapper, sendFile, ResponseError } = require('../utils/express');

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
            sendFile(res, fileId, buffer);
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

        sendFile(res, fileId, buffer);
    })
);

router.get(
    '/proxy/*',
    apiWrapper(async (req, res) => {
        const url = decodeURIComponent(req.originalUrl.match(/^\/proxy\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        if (urlInfo.protocol === 'https:' && urlInfo.host === domainName) {
            const match = urlInfo.path.match(/^\/images\/([A-Za-z0-9]+\.(?:jpg|gif|png))$/);

            if (match) {
                const fileId = match[1];

                const buffer = await getFromStorage(fileId);

                if (buffer) {
                    sendFile(res, fileId, buffer);
                    return;
                }
            }
        }

        const externalImage = await ExternalImage.findOne(
            {
                url,
            },
            'fileId'
        );

        if (externalImage) {
            const fileId = externalImage.fileId;

            let buffer;

            try {
                buffer = await getFromStorage(fileId);
            } catch (err) {
                // Ignore error
                console.error('File not found in storage:', err);
            }

            if (buffer) {
                sendFile(res, fileId, buffer);
                return;
            }
        }

        const downloadedImage = await downloadImage(url);

        const { fileId, buffer } = await processAndSave(downloadedImage);

        try {
            await ExternalImage.updateOne(
                { url },
                {
                    url,
                    fileId,
                },
                { upsert: true }
            );
        } catch (err) {
            console.error(err);
        }

        sendFile(res, fileId, buffer);
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
                    sendFile(res, fileId, buffer);
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
                    sendFile(res, fileId, buffer);
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
                    buffer = await downloadImage(url);

                    try {
                        const data = await processAndSave(buffer);
                        fileId = data.fileId;
                        buffer = data.buffer;

                        await ExternalImage.updateOne(
                            { url },
                            {
                                url,
                                fileId,
                            },
                            { upsert: true }
                        );
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

        sendFile(res, fileId, await process({ fileId, width, height, buffer }));
    })
);

module.exports = router;
