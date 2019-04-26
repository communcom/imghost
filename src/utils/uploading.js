const crypto = require('crypto');
const fileType = require('file-type');
const base58 = require('bs58');
const sharp = require('sharp');

const { exif, hasLocation, hasOrientation } = require('./exifUtils');
const { ResponseError } = require('./express');
const { saveToStorage } = require('./discStorage');

async function processAndSave(buffer) {
    const fType = fileType(buffer);

    let extension;

    if (fType) {
        switch (fType.mime) {
            case 'image/gif':
                extension = 'gif';
                break;
            case 'image/jpeg':
                extension = 'jpg';
                break;
            case 'image/png':
                extension = 'png';
                break;
            default:
        }
    }

    if (!extension) {
        throw new ResponseError(415, 'Supported only formats: jpg, png, gif');
    }

    const shaSum = crypto.createHash('sha1');

    shaSum.update(buffer);

    const sum = shaSum.digest();
    const key = base58.encode(sum);

    const fileName = `${key}.${extension}`;

    if (fType.mime === 'image/jpeg') {
        try {
            const exifData = await exif(buffer);
            const orientation = hasOrientation(exifData);
            const location = hasLocation(exifData);

            if (location || orientation) {
                const image = sharp(buffer);

                // For privacy, remove: GPS Information, Camera Info, etc..
                // Sharp will remove EXIF info by default unless withMetadata is called..
                if (!location) {
                    image.withMetadata();
                }

                // Auto-orient based on the EXIF Orientation.  Remove orientation (if any)
                if (orientation) {
                    image.rotate();
                }

                // eslint-disable-next-line no-param-reassign
                buffer = await image.toBuffer();
            }
        } catch (err) {
            console.error('upload-data process image', fileName, err.message);
        }
    }

    await saveToStorage(fileName, buffer);

    return {
        buffer,
        fileId: fileName,
    };
}

module.exports = {
    processAndSave,
};
