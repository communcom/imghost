function normalizeUrl(url) {
    if (!/^\w+:\/\//.test(url)) {
        return decodeURIComponent(url);
    }

    return url;
}

module.exports = {
    normalizeUrl,
};
