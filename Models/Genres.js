var mongoose = require('mongoose');

var GenresSchema = new mongoose.Schema({
    Name: {type: String, required: true, trim: true},
    Description: {type: String, default:"none"}
});

module.exports = mongoose.model("Genres", GenresSchema);