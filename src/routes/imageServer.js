const express = require('express');
const urlParser = require('url');

const { ExternalImage } = require('../db');
const { getFromStorage, forceGetFromStorage } = require('../utils/discStorage');
const { downloadImage } = require('../utils/download');
const { processAndSave } = require('../utils/uploading');
const { normalizeUrl } = require('../utils/urls');
const { isNeedConvertToJpg, convertIfNeeded } = require('../utils/convert');
const { apiWrapper, ResponseError } = require('../utils/express');
const { checkResizedCache, checkSelfHost, process } = require('../utils/proxy');

const router = express.Router();

router.get(
    '/:action(info)?/images/:filename',
    apiWrapper(async ({ params, headers }) => {
        const { filename } = params;

        return convertIfNeeded(await forceGetFromStorage(filename), filename, headers.accept);
    })
);

router.get(
    '/:action(info)?/images/:width(\\d+)x:height(\\d+)/:fileId',
    apiWrapper(async ({ params, headers }) => {
        const width = Number(params.width);
        const height = Number(params.height);
        const { fileId } = params;

        const needConvert = isNeedConvertToJpg(fileId, headers.accept);

        const cached = await checkResizedCache({ fileId, width, height, needConvert });

        if (cached) {
            return cached;
        }

        return process({
            fileId,
            width,
            height,
            buffer: await forceGetFromStorage(fileId),
            needConvert,
        });
    })
);

router.get(
    '/:action(info)?/proxy/:width(\\d+)x:height(\\d+)/*',
    apiWrapper(async req => {
        const { params, headers } = req;

        const width = Number(params.width);
        const height = Number(params.height);

        const url = normalizeUrl(req.originalUrl.match(/^(?:\/info)?\/proxy\/\d+x\d+\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        let buffer;
        let fileId;
        let needConvert;

        fileId = checkSelfHost(urlInfo);

        if (fileId) {
            needConvert = isNeedConvertToJpg(fileId, headers.accept);

            const cached = await checkResizedCache({
                fileId,
                width,
                height,
                needConvert,
            });

            if (cached) {
                return cached;
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
                    return cached;
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
                    needConvert = isNeedConvertToJpg(fileId, headers.accept);

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

        return process({ fileId, width, height, buffer, needConvert });
    })
);

router.get(
    '/:action(info)?/proxy/*',
    apiWrapper(async req => {
        const { headers } = req;
        const url = normalizeUrl(req.originalUrl.match(/^(?:\/info)?\/proxy\/(.+)$/)[1]);

        const urlInfo = urlParser.parse(url);

        if (!urlInfo.hostname) {
            throw new ResponseError(400, 'Invalid URL');
        }

        const selfFileId = checkSelfHost(urlInfo);

        if (selfFileId) {
            return convertIfNeeded(
                await forceGetFromStorage(selfFileId),
                selfFileId,
                headers.accept
            );
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
                return convertIfNeeded(buffer, fileId, headers.accept);
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

        return convertIfNeeded(buffer, fileId, headers.accept);
    })
);

module.exports = router;