const fs = require('fs-extra');

const { filesPath } = require('../config');
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
        console.log('Duplicate registered');
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

module.exports = {
    saveToStorage,
    getFromStorage,
};
