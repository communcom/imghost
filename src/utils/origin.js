const config = require('../config');

function checkOrigin(origin) {
    return (
        !origin ||
        config.allowedOrigins.includes(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
    );
}

function checkReferer(req, res, next) {
    const { referer } = req.headers;

    if (!referer) {
        next();
        return;
    }

    const url = new URL(referer);

    if (checkOrigin(url.origin)) {
        next();
        return;
    }

    res.status(403);
    res.json({
        status: 403,
        statusText: 'Access from this referral is restricted',
    });
}

module.exports = {
    checkOrigin,
    checkReferer,
};
