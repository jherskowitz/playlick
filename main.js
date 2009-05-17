// Custom Track and Playlist renderers
MODELS.Track.prototype.toHTML = function () {
    return '<a href="#" class="remove" title="Remove from playlist">╳</a>'
        + '<a href="#" class="show_sources" title="Show track sources">sources</a>'
        + '<a href="#" class="item">'
            + '<span class="elapsed">' + this.get_duration_string() + '</span>'
            + '<span class="status">'
                + '&nbsp;'
                + '<span class="play">▸</span>'
                + '<span class="scanning">'
                    + '<img src="/track_scanning.gif" width="16" height="16" alt="Scanning for sources">'
                + '</span>'
                + '&nbsp;'
            + '</span>'
            + '<span class="haudio">'
                + '<span class="fn">' + this.name + '</span>'
                + ' - '
                + '<span class="contributor">' + this.artist + '</span>'
            + '</span>'
        + '</a>'
        + '<div class="sources"></div>';
};
MODELS.Playlist.prototype.toHTML = function () {
    return '<a href="#" class="delete_playlist" title="Delete playlist">╳</a>'
        + '<a href="#" class="edit_playlist">' + PLAYLICK.edit_playlist_text + '</a>'
        + '<a href="#" class="playlist">' + this.name + '</a>'
        + '<form style="display: none;" class="edit_playlist_form">'
            + '<input type="text" name="name" value="' + this.name + '" class="playlist_name">'
            + '<input type="submit" value="save">'
        + '</form>';
};

var PLAYLICK = {
    lastfm_api_key: "b25b959554ed76058ac220b7b2e0a026",
    current_playlist: null,
    start_button_text: $('#add_track_button').val(),
    add_button_text: 'Add',
    edit_playlist_text: 'edit',
    cancel_edit_playlist_text: 'cancel',
    track_width: 556,
    update_playdar_status: function (message) {
        $('#playdar').html(
            '<img src="/playdar_logo_16x16.png" width="16" height="16"> '
            + message
        );
    },
    playdar_listeners: {
        onStat: function (detected) {
            if (detected) {
                if (!detected.authenticated) {
                    var connect_link = Playdar.client.get_auth_link_html('Connect to Playdar');
                    PLAYLICK.update_playdar_status(connect_link);
                }
            } else {
                PLAYLICK.update_playdar_status('Playdar unavailable');
            }
        },
        onAuth: function () {
            var disconnect_link = Playdar.client.get_disconnect_link_html('Disconnect from Playdar');
            PLAYLICK.update_playdar_status(disconnect_link);
            PLAYLICK.resolve_current_playlist();
        },
        onAuthClear: function () {
            var connect_link = Playdar.client.get_auth_link_html('Connect to Playdar');
            PLAYLICK.update_playdar_status(connect_link);
            PLAYLICK.cancel_resolve();
        }
    },
    // Create a new empty playlist
    new_playlist: function  () {
        PLAYLICK.current_playlist = new MODELS.Playlist('playlist', {
            onSave: function () {
                if (this == PLAYLICK.current_playlist) {
                    PLAYLICK.update_playlist_title(this.toString());
                }
            },
            onCreate: function () {
                if (!this.is_in_dom()) {
                    this.element.appendTo($('#playlist_stash'));
                    this.element.addClass('current');
                    DATA.playlists[this.id] = {
                        name: this.name,
                        tracks: this.tracks
                    };
                }
            }
        });
        $('#add_track_button').val(PLAYLICK.start_button_text);
        $('#add_track_input').select();
    },
    create_playlist_title: $('#playlistTitle').html(),
    update_playlist_title: function (title) {
        $('#playlistTitle').html(title);
    },
    cancel_resolve: function () {
        if (Playdar.client) {
            Playdar.client.cancel_resolve();
        }
        $('#playlist').find('li').removeClass('scanning');
    },
    stash_current: function () {
        PLAYLICK.cancel_resolve();
        // Stash the current data
        if (PLAYLICK.current_playlist.tracks.length) {
            DATA.playlists[PLAYLICK.current_playlist.id] = {
                name: PLAYLICK.current_playlist.name,
                tracks: $.map(PLAYLICK.current_playlist.tracks, function (item, index) {
                    return item.track;
                })
            };
        }
    },
    delete_playlist: function (playlist) {
        if (confirm('Are you sure you want to delete this playlist:\n\n' + playlist.name)) {
            if (PLAYLICK.current_playlist == playlist) {
                PLAYLICK.update_playlist_title(PLAYLICK.create_playlist_title);
                playlist.initialise();
            }
            if (playlist.is_in_dom()) {
                playlist.element.remove();
            }
            delete DATA.playlists[playlist.id];
            playlist.remove();
        }
    },
    resolve_track: function (playlist_track, force) {
        if (Playdar.client && Playdar.client.is_authed()) {
            var track = playlist_track.track;
            if (!force && track.playdar_response) {
                PLAYLICK.load_track_results(playlist_track, track.playdar_response, true);
            } else {
                if (track.playdar_qid) {
                    Playdar.client.recheck_results(track.playdar_qid);
                } else {
                    var qid = PLAYLICK.playdar_track_handler(playlist_track);
                    Playdar.client.resolve(track.artist, '', track.name, qid);
                }
            }
        }
    },
    resolve_current_playlist: function () {
        if (Playdar.client && Playdar.client.is_authed()) {
            $.each(PLAYLICK.current_playlist.tracks, function (index, playlist_track) {
                PLAYLICK.resolve_track(playlist_track);
            });
        }
    },
    onResultPlay: function () {
        PLAYLICK.onResultResume.call(this);
    },
    onResultPause: function () {
        var track_item = $('#sid' + this.sID).data('track_item');
        if (track_item) {
            track_item.removeClass('playing');
            track_item.addClass('paused');
        }
    },
    onResultResume: function () {
        var track_item = $('#sid' + this.sID).data('track_item');
        if (track_item) {
            track_item.removeClass('paused');
            track_item.addClass('playing');
        }
    },
    onResultStop: function () {
        var track_item = $('#sid' + this.sID).data('track_item');
        if (track_item) {
            var playlist_track = track_item.data('playlist_track');
            track_item.removeClass('playing');
            track_item.removeClass('paused');
            track_item.css('background-position', '0 0');
            var progress = track_item.find('span.elapsed');
            progress.html(playlist_track.track.get_duration_string());
        }
        
        Playdar.player.stop_all();
    },
    onResultFinish: function () {
        PLAYLICK.onResultStop.call(this);
        // Chain playback to the next perfect match
        var next_track = $('#sid' + this.sID).data('track_item').nextAll('li.perfectMatch');
        if (next_track) {
            var playlist_track = next_track.data('playlist_track');
            PLAYLICK.play_track(playlist_track);
        }
    },
    updatePlaybackProgress: function () {
        var track_item = $('#sid' + this.sID).data('track_item');
        if (track_item) {
            track_item.addClass('playing');
            var playlist_track = track_item.data('playlist_track');
            // Update the track progress
            var progress = track_item.find('span.elapsed');
            progress.html('<strong>' + UTIL.mmss(Math.round(this.position/1000)) + '</strong> / ' + playlist_track.track.get_duration_string());
            // Update the playback progress bar
            var duration;
            if (this.readyState == 3) { // loaded/success
                duration = this.duration;
            } else {
                duration = this.durationEstimate;
            }
            var portion_played = this.position / duration;
            track_item.css('background-position', Math.round(portion_played * PLAYLICK.track_width) + 'px 0');
        }
    },
    
    update_track: function (playlist_track, result, copy_details) {
        var track  = playlist_track.track;
        if (copy_details) {
            if ((track.name.toUpperCase()   != result.track.toUpperCase())
             || (track.artist.toUpperCase() != result.artist.toUpperCase())) {
                track.name = result.track;
                track.artist = result.artist;
                // Update DOM
                playlist_track.element.find('span.fn').html(track.name);
                playlist_track.element.find('span.contributor').html(track.artist);
            }
        }
        track.duration = result.duration;
        playlist_track.element.find('span.elapsed').html(track.get_duration_string());
        // If the sid has changed, stop the stream if it's playing
        if (playlist_track.track.playdar_sid && playlist_track.track.playdar_sid != result.sid) {
            Playdar.player.stop_stream(playlist_track.track.playdar_sid);
        }
        playlist_track.track.playdar_sid = result.sid;
        playlist_track.track.playdar_url = result.url;
        playlist_track.playlist.save();
    },
    
    play_track: function (playlist_track) {
        if (playlist_track && playlist_track.track.playdar_sid) {
            Playdar.player.play_stream(playlist_track.track.playdar_sid);
        }
    },
    
    load_track_results: function (playlist_track, response, final_answer) {
        var list_item = playlist_track.element;
        list_item.removeClass('scanning noMatch match perfectMatch');
        // playlist_track.track.playdar_qid = response.qid;
        if (final_answer) {
            if (response && response.results.length) {
                playlist_track.track.playdar_response = response;
                list_item.addClass('match');
                var result = response.results[0];
                var results_table = PLAYLICK.build_results_table(response, list_item);
                if (result.score == 1) {
                    PLAYLICK.update_track(playlist_track, result, true);
                }
                var sources = list_item.children('.sources');
                sources.html(results_table);
                if (playlist_track.track.playdar_sid) {
                    list_item.addClass('perfectMatch');
                }
            } else {
                list_item.addClass('noMatch');
            }
        } else {
            list_item.addClass('scanning');
        }
    },
    
    playdar_track_handler: function (playlist_track) {
        // Generate a query ID and a results handler
        var uuid = Playdar.Util.generate_uuid();
        Playdar.client.register_results_handler(function (response, final_answer) {
            PLAYLICK.load_track_results(playlist_track, response, final_answer);
        }, uuid);
        return uuid;
    },
    build_results_table: function (response, list_item) {
        var score_cell, result;
        var results = $('<table cellspacing="0"></table>');
        var perfect = false;
        for (var i = 0; i < response.results.length; i++) {
            result = response.results[i];
            var sound = Playdar.player.register_stream(result, {
                onplay: PLAYLICK.onResultPlay,
                onpause: PLAYLICK.onResultPause,
                onresume: PLAYLICK.onResultResume,
                onstop: PLAYLICK.onResultStop,
                onfinish: PLAYLICK.onResultFinish,
                whileplaying: PLAYLICK.updatePlaybackProgress
            });
            
            var checked = '';
            if (result.score < 0) {
                score_cell = '<td class="score">&nbsp;</td>';
            } else if (result.score == 1) {
                score_cell = '<td class="score perfect">★</td>';
                if (!perfect) {
                    checked = ' checked="checked"';
                }
                perfect = true;
            } else {
                score_cell = '<td class="score">' + result.score.toFixed(3) + '</td>';
            }
            var album_art = "http://james.ws.dev.last.fm:8090/2.0/?" + $.param({
                artist: result.artist,
                album: result.album,
                method: "album.coverredirect",
                size: "small",
                api_key: PLAYLICK.lastfm_api_key
            });
            var tbody_html = '<tbody class="result" id="sid' + result.sid + '">'
                + '<tr class="track">'
                    + '<td class="choice">'
                        + '<input type="radio" name="choice" value="' + result.sid + '"' + checked + '>'
                    + '</td>'
                    + '<td class="name" colspan="4">'
                        + '<img width="34" height="34" src="'
                            + album_art
                        + '">'
                        + result.track
                        + '<br>' + result.artist + ' - ' + result.album
                    + '</td>'
                + '</tr>'
                + '<tr class="info">'
                    + score_cell
                    + '<td class="source">' + result.source + '</td>'
                    + '<td class="time">' + UTIL.mmss(result.duration) + '</td>'
                    + '<td class="size">' + (result.size/1000000).toFixed(1) + 'MB</td>'
                    + '<td class="bitrate">' + result.bitrate + ' kbps</td>'
                + '</tr>'
            + '</tbody>';
            var result_tbody = $(tbody_html).data('result', result);
            if (checked) {
                result_tbody.addClass('choice');
            }
            result_tbody.data('track_item', list_item);
            results.append(result_tbody);
        }
        results = results.wrap('<form></form>').parent();
        return results;
    },
    toggle_playlist_edit: function (playlist_item) {
        playlist_item.find('a.playlist').toggle();
        playlist_item.find('form.edit_playlist_form').toggle();
        var button = playlist_item.find('a.edit_playlist');
        if (button.html() == PLAYLICK.cancel_edit_playlist_text) {
            button.html(PLAYLICK.edit_playlist_text);
        } else {
            button.html(PLAYLICK.cancel_edit_playlist_text);
        }
        setTimeout(function () {
            playlist_item.find('input.playlist_name').select();
        }, 1);
    },
    add_from_jspf: function (key, xspf) {
        var title = xspf.title;
        var track_list = xspf.trackList.track;
        // Store the tracks in our DATA object
        DATA.playlists[key] = {
            name: title,
            tracks: $.map(track_list, function (track, index) {
                return new MODELS.Track(track.title, track.creator);
            })
        };
        // Create the playlists
        var playlist = new MODELS.Playlist('playlist', {
            id: key,
            name: title,
            onSave: function () {
                if (this == PLAYLICK.current_playlist) {
                    PLAYLICK.update_playlist_title(this.toString());
                }
            }
        });
        // Add to the stash list
        if (!$('#p_' + key).size()) {
            playlist.element.appendTo($('#playlist_stash'));
        }
    }
};

$("#add_track_input").autocomplete("http://ws.audioscrobbler.com/2.0/?callback=?", {
    multiple: false,
    delay: 200,
    dataType: "jsonp",
    extraParams: {
        api_key: PLAYLICK.lastfm_api_key,
        format: "json",
        method: "track.search",
        track: function () {
            return $("#add_track_input").val();
        }
    },
    cacheLength: 1,
    // mustMatch: true,
    parse: function (json) {
        var parsed = [];
        if (json && json.results.trackmatches.track) {
            var tracks = json.results.trackmatches.track;
            if (!$.isArray(tracks)) {
                tracks = [tracks];
            }
            $.each(tracks, function (index, track) {
                parsed.push({
                    data: track,
                    value: track.name,
                    result: track.artist + " - " + track.name
                });
            });
        }
        return parsed;
    },
    formatItem: function (track, position, length, value) {
        return track.artist + " - " + track.name;
    }
});
$("#add_track_input").result(function (e, track, formatted) {
    $("#add_track_name").val(track.name);
    $("#add_track_artist").val(track.artist);
    $('#add_to_playlist').submit();
});
$("#add_track_input").focus();

// Setup playlist reordering behaviour
$('#playlist').sortable({
    axis: 'y',
    cursor: 'move',
    opacity: 0.5,
    placeholder: 'placeholder',
    update: function (e, ui) {
        var ids = $('#playlist').sortable('toArray');
        var tracks = [];
        $.each(ids, function (index, id) {
            tracks.push($('#' + id).data('playlist_track'));
        });
        PLAYLICK.current_playlist.reset_tracks(tracks);
    }
});

// Load playlist stash
$('#loading_playlists').hide();
$.each(DATA.playlists, function (key, value) {
    var playlist = new MODELS.Playlist('playlist', {
        id: key,
        name: value.name,
        onSave: function () {
            if (this == PLAYLICK.current_playlist) {
                PLAYLICK.update_playlist_title(this.toString());
            }
        }
    });
    playlist.element.appendTo($('#playlist_stash'));
});

// Create a new playlist
PLAYLICK.new_playlist();

// Setup event handlers
$('#create_playlist').click(function (e) {
    e.preventDefault();
    var target = $(e.target);
    PLAYLICK.cancel_resolve();
    PLAYLICK.stash_current();
    PLAYLICK.update_playlist_title(PLAYLICK.create_playlist_title);
    
    $('#playlist_stash').find('li').removeClass('current');
    target.closest('li').addClass('current');
    PLAYLICK.new_playlist();
    
    $('#import').hide();
    $('#xspf').hide();
    $('#manage').show();
    
    setTimeout(function () {
        $('#add_track_input').select();
    }, 1);
});
// Add to loaded playlist
$('#add_to_playlist').submit(function (e) {
    e.preventDefault();
    // Parse the form and add tracks
    var params = {};
    $.each($(this).serializeArray(), function (index, item) {
        params[item.name] = item.value;
    });
    if (params.track_name && params.artist_name) {
        $('#add_track_input').val('');
        $('#add_track_artist').val('');
        $('#add_track_track').val('');
        $('#add_track_input').select();
        var track = new MODELS.Track(params.track_name, params.artist_name);
        var playlist_track = PLAYLICK.current_playlist.add_track(track);
        if (playlist_track.position == 1) {
            $('#add_track_button').val(PLAYLICK.add_button_text);
        }
        PLAYLICK.resolve_track(playlist_track);
    }
});

$('#import_playlist').click(function (e) {
    e.preventDefault();
    var target = $(e.target);
    
    $('#playlist_stash').find('li').removeClass('current');
    target.closest('li').addClass('current');
    
    $('#manage').hide();
    $('#xspf').hide();
    $('#import p.messages').hide();
    $('#import').show();
    
    setTimeout(function () {
        $('#import_playlist_input').select();
    }, 1);
});
// Import Last.fm playlist
$('#import_playlist_form').submit(function (e) {
    e.preventDefault();
    // Show a loading icon
    $('#import p.messages').hide();
    $('#import_loading').show();
    // Parse the form
    var params = {};
    $.each($(this).serializeArray(), function (index, item) {
        params[item.name] = item.value;
    });
    $('#import_playlist_input').val('');
    $('#import_playlist_input').select();
    // Get this user's playlists
    var username = params.username;
    $.getJSON("http://ws.audioscrobbler.com/2.0/?callback=?", {
        method: "user.getplaylists",
        user: username,
        api_key: PLAYLICK.lastfm_api_key,
        format: 'json'
    }, function (json) {
        // console.dir(json);
        if (json.error) {
            $('#import p.messages').hide();
            var escaped_name = $('<b />').text('Username: ' + username);
            var escaped_request = $('<small />').text(this.url);
            var error_message = $('<p />').text('Error ' + json.error + ': ' + json.message);
            error_message.append('<br>')
                         .append(escaped_name)
                         .append('<br>')
                         .append(escaped_request);
            $('#import_error').html(error_message);
            $('#import_error').show();
        } else {
            $('#import_error').html('');
            var playlists = json.playlists.playlist;
            if (playlists) {
                if (!$.isArray(playlists)) {
                    playlists = [playlists];
                }
                var playlist_done = {};
                $.each(playlists, function (index, playlist) {
                    var playlist_url = "lastfm://playlist/" + playlist.id;
                    playlist_done[playlist_url] = false;
                    // Get the tracklist for each playlist
                    $.getJSON("http://ws.audioscrobbler.com/2.0/?callback=?", {
                        method: "playlist.fetch",
                        playlistURL: playlist_url,
                        api_key: PLAYLICK.lastfm_api_key,
                        format: 'json'
                    }, function (playlist_json) {
                        // console.dir(playlist_json);
                        if (playlist_json.error) {
                            $('#import p.messages').hide();
                            var escaped_playlist = $('<b />').text('Playlist: ' + playlist_url);
                            var escaped_request = $('<small />').text(this.url);
                            var error_message = $('<p />').text('Error ' + playlist_json.error + ': ' + playlist_json.message);
                            error_message.append('<br>')
                                         .append(escaped_name)
                                         .append('<br>')
                                         .append(escaped_request);
                            $('#import_error').html(error_message);
                            $('#import_error').show();
                        } else if (playlist_json.playlist.trackList.track) {
                            PLAYLICK.add_from_jspf('lastfm_' + playlist_url, playlist_json.playlist);
                            playlist_done[playlist_url] = true;
                            var done_loading = true;
                            for (k in playlist_done) {
                                if (playlist_done[k] === false) {
                                    done_loading = false;
                                    break;
                                }
                            };
                            if (done_loading) {
                                $('#import p.messages').hide();
                                $('#import_count').text(playlists.length);
                                $('#import_done').show();
                            }
                        } else {
                            $('#import p.messages').hide();
                            var escaped_playlist = $('<b />').text('Playlist: ' + playlist_url);
                            var escaped_request = $('<small />').text(this.url);
                            var error_message = $('<p />').text('No tracks');
                            error_message.append('<br>')
                                         .append(escaped_name)
                                         .append('<br>')
                                         .append(escaped_request);
                            $('#import_error').html(error_message);
                            $('#import_error').show();
                        }
                    });
                });
            } else {
                // No playlists
                $('#import p.messages').hide();
                $('#import_error_no_playlists').show();
            }
        }
    });

});

$('#import_xspf').click(function (e) {
    e.preventDefault();
    var target = $(e.target);
    
    $('#playlist_stash').find('li').removeClass('current');
    target.closest('li').addClass('current');
    
    $('#manage').hide();
    $('#import').hide();
    $('#xspf p.messages').hide();
    $('#xspf').show();
    
    setTimeout(function () {
        $('#xspf_input').select();
    }, 1);
});
$('#xspf_form').submit(function (e) {
    e.preventDefault();
    // Show a loading icon
    $('#xspf p.messages').hide();
    $('#xspf_loading').show();
    // Parse the form
    var params = {};
    $.each($(this).serializeArray(), function (index, item) {
        params[item.name] = item.value;
    });
    $('#xspf_input').val('');
    $('#xspf_input').select();
    
    // Load the XSPF
    var xspf_url = params.xspf;
    $.getJSON("http://query.yahooapis.com/v1/public/yql?callback=?", {
        q: 'select * from xml where url="' + xspf_url + '"',
        format: 'json'
    }, function (json) {
        // console.dir(json);
        var error_text = 'Invalid URL';
        if (json && json.query.results) {
            var xspf = json.query.results.lfm ? json.query.results.lfm.playlist : json.query.results.playlist;
            error_text = 'Invalid XSPF';
            if (xspf) {
                error_text = 'No tracks';
                if (xspf.trackList.track) {
                    PLAYLICK.add_from_jspf("xspf_" + xspf_url, xspf);
                    // Update messages
                    $('#xspf p.messages').hide();
                    $('#xspf_title').text(xspf.title);
                    $('#xspf_count').text(xspf.trackList.track.length);
                    $('#xspf_done').show();
                    return true;
                }
            }
        }
        $('#xspf p.messages').hide();
        var escaped_url = $('<b />').text('URL: ' + xspf_url);
        var escaped_request = $('<small />').text(this.url);
        var error_message = $('<p />').text(error_text);
        error_message.append('<br>')
                     .append(escaped_url)
                     .append('<br>')
                     .append(escaped_request);
        $('#xspf_error').html(error_message);
        $('#xspf_error').show();
    });
});

$('#playlist').click(function (e) {
    var target = $(e.target);
    var track_item = target.closest('li.p_t');
    if (track_item.size()) {
        var playlist_track = track_item.data('playlist_track');
        
        // Clicks to playdar results
        var tbody = target.closest('tbody.result');
        if (tbody.size()) {
            // Check radio button
            var radio = tbody.find('input[name=choice]');
            radio.attr('checked', true);
            // Highlight result
            tbody.siblings().removeClass('choice');
            tbody.addClass('choice');
            // Update track with result data
            var result = tbody.data('result');
            PLAYLICK.update_track(playlist_track, result, true);
            if (!Playdar.player.is_now_playing()) {
                Playdar.player.play_stream(result.sid);
            }
            track_item.addClass('perfectMatch');
        }
        // Clicks to the remove button
        if (target.is('a.remove')) {
            playlist_track.remove();
            return false;
        }
        // Clicks to the remove button
        if (target.is('a.show_sources')) {
            track_item.toggleClass('open');
            return false;
        }
        // Clicks to the main track name
        var track_link = target.closest('li.p_t a.item');
        if (track_link.size()) {
            e.preventDefault();
            if (track_item.is('li.perfectMatch') && playlist_track.track.playdar_sid) {
                PLAYLICK.play_track(playlist_track);
            } else if (track_item.is('li.match')) {
                track_item.toggleClass('open');
            } else {
                PLAYLICK.resolve_track(playlist_track, true);
            }
        }
    }
});

$('#playlist_stash').keydown(function (e) {
    // console.dir(e);
    var target = $(e.target);
    // Capture ESC
    if (target.is('input.playlist_name') && e.keyCode == 27) {
        PLAYLICK.toggle_playlist_edit(target.parents('li.p'));
    }
});
$('#playlist_stash').click(function (e) {
    // Load the clicked playlist
    var target = $(e.target);
    var playlist_item = target.closest('li.p');
    if (target.is('li.p a.playlist')) {
        e.preventDefault();
        target.blur();
        PLAYLICK.stash_current();
        PLAYLICK.current_playlist = playlist_item.data('playlist');
        PLAYLICK.current_playlist.load_tracks(DATA.playlists[PLAYLICK.current_playlist.id].tracks);
        $('#add_track_button').val(PLAYLICK.add_button_text);
        $('#playlist_stash').find('li').removeClass('current');
        playlist_item.addClass('current');
        PLAYLICK.resolve_current_playlist();
        
        $('#import').hide();
        $('#xspf').hide();
        $('#manage').show();
    }
    // Edit the playlist name
    if (target.is('li.p a.edit_playlist')) {
        e.preventDefault();
        target.blur();
        PLAYLICK.toggle_playlist_edit(playlist_item);
    }
    if (target.is('li.p a.delete_playlist')) {
        e.preventDefault();
        PLAYLICK.delete_playlist(playlist_item.data('playlist'));
    }
    if (target.is('li.p form.edit_playlist_form input[type=submit]')) {
        e.preventDefault();
        var form = target.parents('form');
        form.hide();
        var playlist = playlist_item.data('playlist');
        var name = form.serializeArray()[0].value;
        playlist_item.find('a.playlist').html(name).show();
        playlist.set_name(name);
    }
});

$(document).keydown(function (e) {
    // console.dir(e);
    var target = $(e.target);
    // Don't capture on keyboardable inputs
    if (target.is('input[type=text], textarea, select')) {
        return true;
    }
    // Don't capture with any modifiers
    if (e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) {
        return true;
    }
    switch (e.keyCode) {
    case 219: // [
        // Back a track
        e.preventDefault();
        var current_track = $('#playlist li.playing, #playlist li.paused');
        var previous_track = current_track.prevAll('li.perfectMatch');
        PLAYLICK.play_track(previous_track.data('playlist_track'));
        break;
    case 221: // ]
        // Skip track
        e.preventDefault();
        var current_track = $('#playlist li.playing, #playlist li.paused');
        var next_track = current_track.nextAll('li.perfectMatch');
        PLAYLICK.play_track(next_track.data('playlist_track'));
        break;
    case 80: // p
        e.preventDefault();
        var current_track = $('#playlist li.playing, #playlist li.paused');
        if (!current_track.size()) {
            // Get the first perfect match
            current_track = $('#playlist li.perfectMatch');
        }
        PLAYLICK.play_track(current_track.data('playlist_track'));
        break;
    }
});