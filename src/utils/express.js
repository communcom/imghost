const { sendImageInfo } = require('../utils/imageInfo');

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

function sendFile(res, { mimeType, buffer }) {
    res.header('Content-Type', mimeType);
    res.send(buffer);
}

function apiWrapper(func) {
    return async (req, res) => {
        try {
            const img = await Promise.race([func(req, res), timeoutError(REQUEST_TIMEOUT)]);

            if (req.params.action === 'info') {
                await sendImageInfo(res, img.buffer);
            } else {
                sendFile(res, img);
            }
        } catch (err) {
            let errorMessage = err.message.substr(0, 200);

            if (errorMessage.includes('{"type":"Buffer"')) {
                errorMessage = 'Proxying Error';
            }

            if (err instanceof ResponseError) {
                res.status(err.statusCode);
                res.json({
                    status: err.statusCode,
                    statusText: err.statusText || 'Internal Server Error',
                });
                return;
            }

            if (err.name === 'StatusCodeError') {
                let code = 500;

                if (err.statusCode >= 400 && err.statusCode < 600) {
                    code = err.statusCode;
                }

                if (code !== 404) {
                    console.warn('Error status code:', err);
                }

                res.status(code);
                res.json({
                    status: code,
                    statusText: errorMessage,
                });
                return;
            }

            if (err.name === 'RequestError') {
                console.warn('Request handling error:', err);
                res.status(500);
                res.json({
                    status: 500,
                    statusText: errorMessage,
                });
                return;
            }

            console.warn('Request handling error:', err);
            res.status(500);
            res.json({
                status: 500,
                statusText: 'Internal Server Error',
            });
        }
    };
}

module.exports = {
    apiWrapper,
    ResponseError,
};
