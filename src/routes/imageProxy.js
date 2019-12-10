/* eslint-disable no-use-before-define */
const express = require('express');
const urlParser = require('url');

const { ExternalImage } = require('../db');
const { getFromStorage, forceGetFromStorage } = require('../utils/discStorage');
const { downloadImage } = require('../utils/download');
const { processAndSave } = require('../utils/uploading');
const { normalizeUrl } = require('../utils/urls');
const { isNeedConvertToJpg, convertIfNeed } = require('../utils/convert');
const { apiWrapper, sendFile, ResponseError } = require('../utils/express');
const { checkResizedCache, checkSelfHost, process } = require('../utils/proxy');

const router = express.Router();

router.get(
    '/images/:width(\\d+)x:height(\\d+)/:fileId',
    apiWrapper(async (req, res) => {
        const { params, headers } = req;

        const width = Number(params.width);
        const height = Number(params.height);
        const { fileId } = params;

        const needConvert = isNeedConvertToJpg(fileId, headers.accept);

        const cached = await checkResizedCache({ fileId, width, height, needConvert });

        if (cached) {
            sendFile(res, cached);
            return;
        }

        sendFile(
            res,
            await process({
                fileId,
                width,
                height,
                buffer: await forceGetFromStorage(fileId),
                needConvert,
            })
        );
    })
);

router.get(
    '/proxy/:width(\\d+)x:height(\\d+)/*',
    apiWrapper(async (req, res) => {
        const { params, headers } = req;

        const width = Number(params.width);
        const height = Number(params.height);

        const url = normalizeUrl(req.originalUrl.match(/^\/proxy\/\d+x\d+\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        let buffer;
        let fileId;
        let needConvert;

        fileId = checkSelfHost(res, urlInfo);

        if (fileId) {
            needConvert = isNeedConvertToJpg(fileId, headers.accept);

            const cached = await checkResizedCache({
                fileId,
                width,
                height,
                needConvert,
            });

            if (cached) {
                sendFile(res, cached);
                return;
            }

            buffer = await forceGetFromStorage(fileId);
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
                needConvert = isNeedConvertToJpg(fileId, headers.accept);

                const cached = await checkResizedCache({ fileId, width, height, needConvert });

                if (cached) {
                    sendFile(res, cached);
                    return;
                }

                try {
                    buffer = await getFromStorage(fileId);
                } catch (err) {
                    console.warn('File not found in cache:', err);
                }
            }

            if (!buffer) {
                buffer = await downloadImage(url);

                try {
                    ({ fileId, buffer } = await processAndSave(buffer));
                    fileId = isNeedConvertToJpg(fileId, headers.accept);

                    await ExternalImage.updateOne(
                        { url },
                        {
                            url,
                            fileId,
                        },
                        { upsert: true }
                    );
                } catch (err) {
                    console.error('Image processing failed:', err);
                }
            }
        }

        if (!buffer) {
            throw new ResponseError(404, 'Not found');
        }

        console.log('1 needConvert', needConvert);

        sendFile(res, await process({ fileId, width, height, buffer, needConvert }));
    })
);

router.get(
    '/proxy/*',
    apiWrapper(async (req, res) => {
        const { headers } = req;
        const url = normalizeUrl(req.originalUrl.match(/^\/proxy\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        const selfFileId = checkSelfHost(res, urlInfo);

        if (selfFileId) {
            sendFile(
                res,
                await convertIfNeed(
                    await forceGetFromStorage(selfFileId),
                    selfFileId,
                    headers.accept
                )
            );
            return;
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
                sendFile(res, await convertIfNeed(buffer, fileId, headers.accept));
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

        sendFile(res, await convertIfNeed(buffer, fileId, headers.accept));
    })
);

module.exports = router;
