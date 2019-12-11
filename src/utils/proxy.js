const sharp = require('sharp');

const { domainName } = require('../config');
const { getFromStorage, saveToStorage } = require('../utils/discStorage');
const { getMimeTypeByFileName } = require('../utils/mime');

function makeResizedFileId(fileId, { width, height, needConvert }) {
    let newFileId = fileId.replace('.', `_${width}x${height}.`);

    if (needConvert) {
        newFileId += '.jpg';
    }

    return newFileId;
}

async function checkResizedCache({ fileId, width, height, needConvert }) {
    try {
        const resizedFileId = makeResizedFileId(fileId, { width, height, needConvert });
        return {
            mimeType: getMimeTypeByFileName(resizedFileId),
            buffer: await getFromStorage(resizedFileId),
        };
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn('Resized cache reading failed:', err);
        }
    }

    return null;
}

function checkSelfHost(res, urlInfo) {
    if (!(urlInfo.protocol === 'https:' && urlInfo.host === domainName)) {
        return null;
    }

    const match = urlInfo.path.match(/^\/images\/([A-Za-z0-9]+\.(?:jpg|gif|png|webp))$/);

    if (!match) {
        return null;
    }

    return match[1];
}

async function process({ fileId, width, height, buffer, needConvert }) {
    let sharpProcess = sharp(buffer).resize(width, height, {
        fit: 'cover',
        withoutEnlargement: true,
    });

    let mimeType;

    if (needConvert) {
        mimeType = 'image/jpeg';
        sharpProcess = sharpProcess.jpeg({
            quality: 80,
        });
    } else {
        mimeType = getMimeTypeByFileName(fileId);
    }

    const newBuffer = await sharpProcess.toBuffer();

    setTimeout(async () => {
        try {
            const resizedFileId = makeResizedFileId(fileId, { width, height, needConvert });

            await saveToStorage(resizedFileId, newBuffer);
        } catch (err) {
            console.warn('Cache saving failed:', err);
        }
    }, 0);

    return {
        mimeType,
        buffer: newBuffer,
    };
}

module.exports = {
    makeResizedFileId,
    checkResizedCache,
    checkSelfHost,
    process,
};
