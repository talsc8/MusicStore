var mongoose = require('mongoose');

var ArtistsSchema = new mongoose.Schema({
    Name: {type: String, required: true, trim: true}
});

module.exports = mongoose.model("Artists", ArtistsSchema);

