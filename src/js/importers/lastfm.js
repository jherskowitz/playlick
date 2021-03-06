/**
 * Last.fm
 * Methods and Exceptions for importing playlists from the Last.fm API
 * http://www.last.fm/api
**/
var LastFm = {
    API_KEY: "b25b959554ed76058ac220b7b2e0a026",
    WS_ROOT: "http://ws.audioscrobbler.com"
};
/**
 * class LastFm.Exception < Exception
 * 
 * new LastFm.Exception(signature[, message][, diagnostics]) -> Function(message[, diagnostics])
 * - signature (String): Last.fm API method signature that lead to the exception
 * - message (String): Error message that describes the exception
 * - diagnostics (Object): Any object that might aid in diagnosing the exception
 * 
 * Base class for Last.fm import exceptions.
 * The constructor takes a Last.fm method signature and uses the partialException pattern
**/
LastFm.Exception = function (signature, message, diagnostics) {
    this.signature = signature;
    this.message = message;
    this.diagnostics = diagnostics;
    return partialException(this);
};
LastFm.Exception.prototype = new Exception;
LastFm.Exception.prototype.name = 'LastFmException';
LastFm.Exception.prototype.toString = function () {
    return this.name + ': ' + this.message + ' (' + this.signature + ')';
};
/**
 * LastFm.getJson(method, params, callback, exception[, exceptionHandler])
 * - method (String): Last.fm API method
 * - params (Object): Parameters needed for this method call
 * - callback(JSON) (Function): Function to be called if the request successfully completes.
 *      Takes a JSON object as its only argument
 * - exception (Exception): Partially initialised exception object to be thrown on error
 * - exceptionHandler(exception) (Function): Function to be called on error
 *      Takes an exception object as its only argument
 * 
 * Wraps getJson with Last.fm specifics
**/
LastFm.getJson = function (method, params, callback, exception, exceptionHandler) {
    params = params || {};
    params.method = method;
    IMPORTERS.getJson(LastFm.WS_ROOT + "/2.0/?callback=?", $.extend(params, {
        api_key: LastFm.API_KEY,
        format: 'json'
    }), callback, exception, exceptionHandler);
};
/**
 * LastFm.generateSignature(method[, params]) -> String
 * - method (String): Last.fm API method
 * - params (Object): Parameters needed for this method call
 * 
 * Generates a method signature for a Last.fm API call
 * 
 * e.g.
 * LastFm.generateSignature('track.getInfo', { artist: 'James Wheare', track: 'Take Control' });
 * -> 'user.getInfo --artist=James%20Wheare --track=Take%20Control'
**/
LastFm.generateSignature = function (method, params) {
    var signature = method;
    params = params || {};
    for (k in params) {
        signature += " --" + k + "=" + encodeURIComponent(params[k]);
    }
    return signature;
};
/**
 * LastFm.getPlaylist(url[, callback][, exceptionHandler])
 * 
 * Imports a playlist URL from Last.fm
 * http://www.last.fm/api/playlists
 * http://www.last.fm/api/show?service=271
**/
LastFm.getPlaylist = function (url, metadata, callback, exceptionHandler) {
    var method = "playlist.fetch";
    var params = {
        playlistURL: url
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        var playlist = IMPORTERS.createPlaylistFromJspf(this.url, json.playlist, metadata, callback, exception);
    }, exception, exceptionHandler);
};
/**
 * LastFm.getUserPlaylist(data[, callback][, exceptionHandler])
 * 
 * Imports a Last.fm User playlist with a data object fetched from LastFm.userPlaylists
**/
LastFm.getUserPlaylist = function (data, callback, exceptionHandler) {
    var url = "lastfm://playlist/" + data.id;
    // Extract other metadata from playlist info
    var metadata = {
        type: 'subscription',
        url: data.url,
        subscription: {
            namespace: 'LastFm',
            method: 'getUserPlaylist',
            arguments: [data],
            synced: true
        }
    };
    var image = $.grep(data.image, function (value, i) {
        return value.size == 'medium';
    });
    if (image[0]) {
        metadata.image = image[0]['#text'];
    }
    // Fetch the tracklist
    LastFm.getPlaylist(url, metadata, callback, exceptionHandler);
};
/**
 * LastFm.userPlaylists(user[, callback][, noPlaylistHandler][, exceptionHandler])
 * - user (String): Last.fm username to fetch playlists for
 * - callback(playlist) (Function): Function to be called for after fetching playlists
 *      Takes an array of playlist objects as the only argument
 * - noPlaylistHandler() (Function): Function to be called when the user has no playlists
 * - exceptionHandler(exception) (Function): Function to be called in case of an exception
 *      Takes the exception object as the only argument
 * 
 * Fetch user playlist data from Last.fm
 * http://www.last.fm/api/show?service=313
**/
LastFm.userPlaylists = function (user, callback, noPlaylistHandler, exceptionHandler) {
    var method = "user.getplaylists";
    var params = {
        user: user
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        if (!json.playlists) {
            throw exception('No playlists in response', json);
        }
        if (!json.playlists.playlist) {
            return noPlaylistHandler();
        }
        
        // Last.fm APIs return single item lists as single items
        var playlists = $.makeArray(json.playlists.playlist);
        callback(playlists);
    }, exception, exceptionHandler);
};
/**
 * LastFm.lovedTracks(user[, callback][, exceptionHandler])
 * - user (String): User to get loved tracks for
 * - callback(playlist) (Function): Function to be called once the loved tracks playlist has been created
 *      Takes the playlist object as the only argument
 * - exceptionHandler(exception) (Function): Function to be called in case of an import exception
 *      Takes the exception object as the only argument
 * 
 * Import a user's loved tracks from Last.fm
 * http://www.last.fm/api/show?service=329
**/
LastFm.lovedTracks = function (user, callback, exceptionHandler) {
    var method = "user.getLovedTracks";
    var params = {
        user: user
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        if (!json.lovedtracks || !json.lovedtracks.track) {
            throw exception('No loved tracks in response', json);
        }
        // XML to JSON converters often return single item lists as single items
        var trackList = $.makeArray(json.lovedtracks.track);
        if (!trackList.length) {
            throw exception('No loved tracks', jspf.trackList);
        }
        // Create the playlist
        var playlist = new MODELS.Playlist({
            type: 'subscription',
            title: 'Loved tracks for ' + json.lovedtracks['@attr'].user,
            subscription: {
                namespace: 'LastFm',
                method: 'lovedTracks',
                arguments: [user],
                synced: true
            }
        });
        // Load tracks
        $.each(trackList, function (i, data) {
            var trackDoc = {
                name: data.name,
                artist: data.artist.name
            };
            playlist.add_track(new MODELS.Track(trackDoc));
        });
        // Call the LastFm.lovedtracks callback
        if (callback) {
            callback(playlist);
        }
    }, exception, exceptionHandler);
};
/**
 * LastFm.album(artist, album[, callback][, exceptionHandler])
 * - artist (String): Artist who authored the album
 * - album (String): Album name
 * - callback(playlist) (Function): Function to be called once the album playlist has been created
 *      Takes the playlist object as the only argument
 * - exceptionHandler(exception) (Function): Function to be called in case of an import exception
 *      Takes the exception object as the only argument
 * 
 * Import an Album playlist from Last.fm
 * http://www.last.fm/api/show?service=290
**/
LastFm.album = function (artist, album, callback, exceptionHandler) {
    var method = "album.getInfo";
    var params = {
        artist: artist,
        album: album
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        if (!json.album) {
            throw exception('No album data', json);
        }
        var albumUrl = "lastfm://playlist/album/" + json.album.id;
        // Extract other metadata from album info
        var description = '';
        if (json.album.wiki) {
            description = $('<div/>').html(json.album.wiki.summary).text() + '';
        }
        var metadata = {
            type: 'album',
            artist: json.album.artist,
            album: json.album.name,
            description: description,
            url: json.album.url
        };
        var image = $.grep(json.album.image, function (value, i) {
            return value.size == 'medium';
        });
        if (image[0]) {
            metadata.image = image[0]['#text'];
        }
        // Fetch the album tracklist
        LastFm.getPlaylist(albumUrl, metadata, callback, exceptionHandler);
    }, exception, exceptionHandler);
};

LastFm.getTopTracks = function (artist, callback, exceptionHandler) {
    var method = "artist.getTopTracks";
    var params = {
        artist: artist
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        if (!json.toptracks || !json.toptracks.track) {
            throw exception('No top tracks for ' + artist, json);
        }
        callback(json.toptracks.track);
    }, exception, exceptionHandler);
};

LastFm.generateUsersPlaylist = function (userA, userB, callback, exceptionHandler) {
    var method = "tasteometer.compare";
    var params = {
        type1: 'user',
        value1: userA,
        type2: 'user',
        value2: userB,
        limit: 20
    };
    var exception = new LastFm.Exception(LastFm.generateSignature(method, params));
    LastFm.getJson(method, params, function (json, requestUrl, requestParams) {
        if (!json.comparison || !json.comparison.result || !json.comparison.result.artists || !json.comparison.result.artists.artist) {
            throw exception("No shared artists found", json);
        }
        var artists = UTIL.shuffle(json.comparison.result.artists.artist);
        // Create the playlist
        var playlist = new MODELS.Playlist({
            title: userA + ' and ' + userB,
            description: 'A playlist based on your shared artists'
        });
        var playlistTracks = {};
        // Callback to loop through playlistTracks to check if we're still waiting for results
        // called on LastFm.getTopTracks success and failure
        function randomTopTrackDone (processedArtist, tracks) {
            for (artist in playlistTracks) {
                if (playlistTracks[artist] === false) {
                    return;
                }
            }
            // Playlist is filled with tracks, check length
            if (!playlist.tracks.length) {
                return exceptionHandler(exception("No valid tracks found for artists", playlistTracks));
            }
            // Call the callback
            if (callback) {
                callback(playlist);
            }
        }
        // Get a random top track for each in the tasteometer shared artists response
        // Requires a separate call to LastFm.getTopTracks for each
        $.each(artists, function (i, artist) {
            var artist_name = artist.name;
            playlistTracks[artist_name] = false;
            LastFm.getTopTracks(
                artist_name,
                function callback (tracks) {
                    // Pick a random track
                    tracks = UTIL.shuffle(tracks);
                    var track = tracks[0];
                    var trackDoc = {
                        name: track.name,
                        artist: track.artist.name
                    };
                    // Add to the playlist and callback
                    playlist.add_track(new MODELS.Track(trackDoc));
                    playlistTracks[artist_name] = track;
                    randomTopTrackDone(artist_name, tracks);
                },
                function exceptionHandler (exception) {
                    playlistTracks[artist_name] = exception;
                    randomTopTrackDone(artist_name, exception);
                }
            );
        });
    }, exception, exceptionHandler);
};

LastFm.getAlbumArt = function (artist, album, size) {
    size = size || 'small';
    return LastFm.WS_ROOT + "/2.0/?" + $.param({
        artist: artist,
        album: album,
        method: "album.imageredirect",
        size: size,
        api_key: LastFm.API_KEY
    });
};
