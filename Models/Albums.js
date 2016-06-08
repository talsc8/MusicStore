var mongoose = require('mongoose');

var AlbumsSchema = new mongoose.Schema({
    Title: {type: String, required: true, trim: true },
    Price: {type: Number, default: 0, min: 0, required: true},
    Inventory: {type: Number, default: 0, min: 0, required: true},
    Genre: {type: String, required: true},
    Artist: {type: String, required: true}
});

module.exports = mongoose.model("Albums", AlbumsSchema);