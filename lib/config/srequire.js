module.exports = function(path) {
    try {
        return require(path);
    }catch(err) {
        return null;
    }
}
