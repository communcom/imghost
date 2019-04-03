const { getMimeTypeByFileName } = require('./mime');

const REQUEST_TIMEOUT = 5000;

class ResponseError extends Error {
    constructor(statusCode, text) {
        super(text);

        this.statusCode = statusCode;
        this.statusText = text;
    }
}

class TimeoutError extends ResponseError {
    constructor() {
        super(504, 'Timeout');
    }
}

function timeoutError(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new TimeoutError()), ms);
    });
}

function apiWrapper(func) {
    return async (req, res) => {
        try {
            await Promise.race([func(req, res), timeoutError(REQUEST_TIMEOUT)]);
        } catch (err) {
            if (err instanceof ResponseError) {
                res.status(err.statusCode);
                res.json({
                    status: err.statusCode,
                    statusText: err.statusText || 'Internal Server Error',
                });
                return;
            }

            console.error('Request handling error:', err);
            res.status(500);
            res.json({
                status: 500,
                statusText: 'Internal Server Error',
            });
        }
    };
}

function sendFile(res, filename, buffer) {
    res.header('Content-Type', getMimeTypeByFileName(filename));
    res.send(buffer);
}

module.exports = {
    apiWrapper,
    sendFile,
    ResponseError,
};
