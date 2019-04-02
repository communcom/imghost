const path = require('path');

function formatFullPath(dir, filename) {
    const subDir = path.join(dir, filename.substr(0, 2));
    const subInnerDir = path.join(subDir, filename.substr(0, 4));

    const fullPath = path.join(subInnerDir, filename);

    return {
        subDir,
        subInnerDir,
        fullPath,
    };
}

module.exports = {
    formatFullPath,
};
