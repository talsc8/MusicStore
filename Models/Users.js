var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    Username: {type: String, required: true, trim: true, unique: true},
    Password: {type: String, required: true, trim: true}
});

module.exports = mongoose.model("Users", UserSchema);
