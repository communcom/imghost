const sharp = require('sharp');

async function sendImageInfo(res, buffer) {
    const meta = await sharp(buffer).metadata();

    res.json({
        mimeType: `image/${meta.format}`,
        width: meta.width,
        height: meta.height,
        size: meta.size,
    });
}

module.exports = {
    sendImageInfo,
};
