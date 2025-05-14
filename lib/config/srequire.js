module.exports = function(path) {
    try {
        return require(path);
    }catch(err) {
        console.error(`Error loading module at ${path}: ${err.message}`);
        return null;
    }
}
