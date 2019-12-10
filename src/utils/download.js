const request = require('request-promise-native');

const { ResponseError } = require('../utils/express');

const DOWNLOAD_FILE_LIMIT = 10 * 1024 * 1024;

async function downloadImage(url) {
    console.log('downloading', url);

    const buffer = await request({
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

    return buffer;
}

module.exports = {
    downloadImage,
};
