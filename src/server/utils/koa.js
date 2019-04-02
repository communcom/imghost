function asyncWrapper(func) {
    return function* wrapper() {
        yield func(this);
    };
}

module.exports = {
    asyncWrapper,
};
