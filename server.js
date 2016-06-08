var mongoose = require('mongoose');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var async = require('async');
var Albums = require('./Models/Albums');
var Genres = require('./Models/Genres');
var Artists = require('./Models/Artists');
var Users = require('./Models/Users');
var jwt = require('jsonwebtoken');

// The key to the encoding/decoding of the token.
var secret = 'good-secret';

// Opens connection to the my local database.
mongoose.connect('mongodb://localhost/MusicStoreDatabase');

// Check if succeeded to connect to the database
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function () {
    //we are connected.
});
app.use(bodyParser.json());
app.listen(3000, function () {
    console.log("listening on port 3000");
});

// Checks the validity of the user's token (used as middelware function in all methods excepts login)
var hasAuthentication = function(req, res, next) {
    async.series([
        // Check if the client sent a token, if so continue to the next callback.
        function (callback) {
            if (!req.headers) {
                res.send(401 ,'Authentication token needed');
            } else {
                callback();
            }
            // Decrypt the token created from the username and password and check it validity.
        }, function (callback) {
            jwt.verify(req.headers.authorization, secret, function(err, decoded) {
                if (err || !decoded) {
                    res.send(401, 'invalid token given');
                } else {
                    Users.findOne({'Username': decoded.Username}, function (err, user) {
                        if (err || !user) {
                            res.send(401, 'Invalid token given');
                        } else if (user.Password != decoded.Password) {
                            res.send(401, 'Invalid token given');
                        } else {
                            next();
                        }
                    })
                }
            });
        }
    ]);
};

// Returns albums/artists/genres collection.
app.get('/:type(albums|artists|genres)',hasAuthentication, function (req, res) {
    async.waterfall([
        // Decides which type.
        function(callback) {
            switch (req.params.type) {
                case 'albums':
                    callback(null, Albums);
                    break;
                case 'artists':
                    callback(null, Artists);
                    break;
                case 'genres':
                    callback(null, Genres);
                    break;
            }
            // After getting the right type, finds the collection from the DB.
        }, function(currentObj, callback) {
            currentObj.find({},{'_id': 0,'__v': 0}, function (err, collection) {
                if (err || (collection.length == 0)) {
                    res.send("There are no " + req.params.type);

                } else {
                    res.send(collection);
                }
            });
        }
    ]);
});

// Returns a specific document (album/artist/genre) by id.
app.get('/:type(albums|artists|genres)/:id', hasAuthentication, function (req, res) {
    async.waterfall([
        function(callback) {
            switch (req.params.type) {
                case 'albums':
                    callback(null, Albums);
                    break;
                case 'artists':
                    callback(null, Artists);
                    break;
                case 'genres':
                    callback(null, Genres);
                    break;
            }
        }, function(currentObj, callback) {
            currentObj.findOne({'_id': req.params.id},{'_id': 0,'__v': 0}, function (err, doc) {
                if (err || !doc) {
                    res.send("Could not find " + req.params.type + " with this id");

                } else {
                    res.send(doc);
                }
            });
        }
    ]);
});

// Creates a new document (album/artist/genre) and return its new ID.
app.post('/:type(albums|artists|genres)', hasAuthentication, function (req, res) {
    async.waterfall([
        function (callback) {
            if (!req.body) {
                res.send("Invalid data");

            } else {
                switch (req.params.type) {
                    case 'albums':
                        // Avoid creating an album with a title that already exists in the DB.
                        Albums.findOne({'Title': req.body.Title}, function (err, album) {
                            if (album) {
                                res.send('Cannot add this album, there is already album with this name.');
                            } else {
                                // Avoid creating an album with a genre that does not exists in the DB.
                                Genres.findOne({'_id': req.body.Genre}, function (err, genre) {
                                    if (err || !genre) {
                                        res.send('Cannot add this album, the genre given does not exists');
                                    } else {
                                        // Avoid creating an album with an artist that does not exists in the DB.
                                        Artists.findOne({'_id': req.body.Artist}, function (err, artist) {
                                            if (err || !artist) {
                                                res.send('Cannot add this album, the artist given does not exists');
                                            } else {
                                                callback(null, Albums(req.body));
                                            }
                                        });
                                    }
                                });
                            }
                        });
                        break;
                    case 'artists':
                        // Avoid creating an artist with a name that already exists in the DB.
                        Artists.findOne({'Name': req.body.Name}, function (err, artist) {
                            if (artist) {
                                res.send('Cannot add this artist, there is already artist with this name.');
                            } else {
                                callback(null, Artists(req.body));
                            }
                        });
                        break;
                    case 'genres':
                        // Avoid creating a genre with a name that already exists in the DB.
                        Genres.findOne({'Name': req.body.Name}, function (err, genre) {
                            if (genre) {
                                res.send('Cannot add this genre, there is already genre with this name.');
                            } else {
                                callback(null, Genres(req.body));
                            }
                        });
                        break;
                }
            }
            // After checking that all input given by the client is valid, create the doc.
        }, function (currentObj, callback) {
            currentObj.save(function (err, newDoc) {
                if (err) {
                    res.send(err);

                } else {
                    res.send("The new " + req.params.type + " was saved successfully." + "\r\n" +
                        "The new ID is: " + JSON.stringify({'ID': currentObj._id}));
                }
            });
        }
    ]);
});

// Updates a specific document by id.
app.put('/:type(albums|artists|genres)/:id', hasAuthentication, function (req, res) {
    async.waterfall([
        function (callback) {
            if (!req.body) {
                res.send("Invalid data given");

            } else {
                switch (req.params.type) {
                    case 'albums':
                        /*the update of an album will fail if trying changing value of the genre and the artist
                         to one which does not exists in the DB.*/
                        if (req.body.Genre) {
                            Genres.findOne({'_id': req.body.Genre}, function (err, genre) {
                                if (err || (!genre)) {
                                    res.send('Cannot update this album, the genre given does not exists');
                                } else if (req.body.Artist) {
                                    Artists.findOne({'_id': req.body.Artist}, function (err, artist) {
                                        if (err || (!artist)) {
                                            res.send('Cannot update this album, the artist given does not exists');
                                        } else {
                                            callback(null, Albums);
                                        }
                                    });
                                } else {
                                    callback(null, Albums);
                                }
                            });
                            //the update of an album will fail if trying changing value of the artist to one which does not exists in the DB.
                        } else if (req.body.Artist) {
                            Artists.findOne({'_id': req.body.Artist}, function (err, artist) {
                                if (err || (!artist)) {
                                    res.send('Cannot update this album, the artist given does not exists');
                                } else {
                                    callback(null, Albums);
                                }
                            });
                        } else {
                            callback(null, Albums);
                        }
                        break;
                    case 'artists':
                        callback(null, Artists);
                        break;
                    case 'genres':
                        callback(null, Genres);
                        break;
                }
            }
            // After checking the validity of the changes the client want, do them.
        }, function (currentObj, callback) {
            currentObj.findByIdAndUpdate({'_id': req.params.id}, { $set: req.body}, function (err, doc) {
                if (err || (!doc)) {
                    res.send(err);

                } else {
                    res.send("The document with id: " + doc._id + " was updated successfully.");
                }
            });
        }
    ]);
});

// Deletes a specific document by id.
app.delete('/:type(albums|artists|genres)/:id', hasAuthentication, function (req, res) {
    async.waterfall([
        function(callback) {
            if (!req.body) {
                res.send("Invalid data given");

            } else {
                switch (req.params.type) {
                    case 'albums':
                        callback(null, Albums);
                        break;
                    case 'artists':
                        // Check if there is no dependency of albums with this artist.
                        Albums.find({'Artist': req.params.id}, function (err, albums) {
                            if (albums.length > 0) {
                                res.send("Cannot delete this artist, there are albums depend on it.");
                            }else {
                                callback(null, Artists);
                            }
                        });
                        break;
                    // Check if there is no dependency of albums with this genre.
                    case 'genres':
                        Albums.find({'Genre': req.params.id}, function (err, albums) {
                            if (albums.length > 0) {
                                res.send("Cannot delete this genre, there are albums depend on it.");
                            }else{
                                callback(null, Genres);
                            }
                        });
                        break;
                }
            }
            // After ensuring that there are no dependencies, delete the document.
        }, function(currentObj, callback){
            currentObj.findOneAndRemove({'_id': req.params.id}, function (err, data) {
                if (err || !data) {
                    res.send("Couldn't find and delete the given id");

                } else {
                    res.send("The document with the id: " + data._id + "has been deleted");
                }
            });
        }
    ]);
});

// Returns a list of all the albums of a specific genre by genre id
app.get('/albums/genre/:genreId', hasAuthentication, function (req, res) {
    Albums.find({'Genre': req.params.genreId},{'_id': 0,'__v': 0}, function (err, albums) {
        if (err) {
            res.send("Couldn't find albums related to this genre");

        } else {
            res.send(albums);
        }
    });
});

// Returns a list of all the albums of a specific artist by artist id
app.get('/albums/artist/:artistId', hasAuthentication, function (req, res) {
    Albums.find({'Artist': req.params.artistId},{'_id': 0,'__v': 0}, function (err, albums) {
        if (err) {
            res.send("Couldn't find albums related to this artist");

        } else {
            res.send(albums);
        }
    });
});

// Gets a list of albums and quantities, and for each album, reduce the inventory quantity with the purchased quantity.
app.post('/shoppingCart/purchase', hasAuthentication, function (req, res) {
    var wantedAlbums = req.body;
    // Creates a sorted (by id) collection of the albums being purchased.
    Albums.find({'_id':  {$in: wantedAlbums} }, {_id: 1, Inventory: 1}).sort({_id: 1}).exec(function(err, albums) {
        // Check if all the wanted albums do exist in the DB.
        if(albums.length < wantedAlbums.length) {
            res.send("At least one of the albums does not exists in the store");
        }else {
            // Sort the array given from the client by id also to match the collection created above.
            wantedAlbums.sort(function (album1, album2) {
                if (album1._id > album2._id) {
                    return 1;
                }
                if (album1._id < album2._id) {
                    return -1;
                }
                return 0;
            });
            // Check the availability of each album in the store according to the quantity given.
            for (var i = 0, len = wantedAlbums.length; i < len; i++) {
                if (albums[i].Inventory < wantedAlbums[i].Quantity) {
                    res.send("Failed to purchase, the album " + albums[i].Title + " does not enough quantity in the inventory.");
                    return;
                }
            }
            // Update the inventory of each album that was purchased.
            for (var i = 0, len = wantedAlbums.length; i < len; i++) {
                albums[i].Inventory -= wantedAlbums[i].Quantity;
                albums[i].save();
            }
            res.send('The purchase has been completed successfully.')
        }
    })
});

// Checks if the username and password given exists in the DB.
app.post('/login', function (req, res) {
    if (!req.body.Username) {
        res.send(401, 'Username is required');
        return;
    }
    if (!req.body.Password) {
        res.send(401, 'Password is required');
        return;
    }

    Users.findOne({'Username': req.body.Username}, function (err, user) {
        if (err || !user) {
            res.send('Incorrect username entered');
        } else if (user.Password != req.body.Password) {
            res.send('Incorrect password entered');
        } else {
            var token = jwt.sign({Username: req.body.Username, Password: req.body.Password}, secret, {expiresIn: '7d'});
            res.send(200, 'Logged In' + "\r\n" + 'This is your token: ' + JSON.stringify({'Token': token}));
        }
    });
});