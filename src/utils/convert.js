const sharp = require('sharp');

const { getFromStorage, saveToStorage } = require('../utils/discStorage');
const { getMimeTypeByFileName } = require('./mime');

function isNeedConvertToJpg(filename, accept) {
    return filename.endsWith('.webp') && (accept && !/\bimage\/webp\b/.test(accept));
}

async function covertWrapper(buffer, filename, isConvert) {
    if (isConvert) {
        const jpgFilename = `${filename}.jpg`;

        let jpg = null;

        try {
            jpg = await getFromStorage(jpgFilename);
        } catch {
            // Not found, do nothing
        }

        if (jpg) {
            return {
                buffer: jpg,
                mimeType: 'image/jpeg',
            };
        }

        jpg = await sharp(buffer)
            .jpeg({
                quality: 80,
            })
            .toBuffer();

        try {
            await saveToStorage(jpgFilename, jpg);
        } catch (err) {
            console.warn('Cache saving failed:', err);
        }

        return {
            buffer: jpg,
            mimeType: 'image/jpeg',
        };
    }

    return {
        buffer,
        mimeType: getMimeTypeByFileName(filename),
    };
}

async function convertIfNeeded(buffer, filename, accept) {
    // If we want to get webp but our browser doesn't support this format
    return covertWrapper(buffer, filename, isNeedConvertToJpg(filename, accept));
}

module.exports = {
    isNeedConvertToJpg,
    convertIfNeeded,
    covertWrapper,
};
