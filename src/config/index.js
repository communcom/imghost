const config = {
    // When protocol === 'https' a default port url is used (ignores UPLOAD_PORT)
    domainName: process.env.DOMAIN_NAME || 'localhost',
    port: process.env.HOST_PORT || 3000,
    protocol: process.env.PROTOCOL || 'http',
    filesPath: process.env.STORAGE_PATH || './files',
    mongoDbConnect: process.env.MONGO_CONNECT || 'mongodb://localhost:27017/imagehoster',
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(/\s*,\s*/) : [],
};

module.exports = config;
