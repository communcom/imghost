const fs = require('fs-extra');

const { filesPath } = require('../config');
const { ResponseError } = require('./express');
const { formatFullPath } = require('./path');

async function saveTo(dir, filename, buffer) {
    const { subDir, subInnerDir, fullPath } = formatFullPath(dir, filename);

    if (!(await fs.exists(subDir))) {
        await fs.mkdir(subDir, 0o744);
    }

    if (!(await fs.exists(subInnerDir))) {
        await fs.mkdir(subInnerDir, 0o744);
    }

    if (await fs.exists(fullPath)) {
        return;
    }

    const randomNumber = Math.floor(Math.random() * 1000000);
    const tmpFileName = `${fullPath}.tmp${randomNumber}`;

    await fs.writeFile(tmpFileName, buffer);
    await fs.rename(tmpFileName, fullPath);
}

async function getFrom(dir, filename) {
    const { fullPath } = formatFullPath(dir, filename);

    return fs.readFile(fullPath);
}

function saveToStorage(fileId, buffer) {
    return saveTo(filesPath, fileId, buffer);
}

function getFromStorage(fileId) {
    return getFrom(filesPath, fileId);
}

// function getRandomFileId() {
//     return new Promise((resolve, reject) => {
//         crypto.randomBytes(20, (err, buffer) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(base58.encode(buffer));
//             }
//         });
//     });
// }

async function forceGetFromStorage(fileId) {
    try {
        return await getFromStorage(fileId);
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new ResponseError(404, 'Not found');
        }

        throw err;
    }
}

module.exports = {
    saveToStorage,
    getFromStorage,
    forceGetFromStorage,
};
