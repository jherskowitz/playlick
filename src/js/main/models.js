/* Model customisation */
(function () {
    function trackToHtml () {
        var remove_link = $('<a href="#" class="remove" title="Remove from playlist">').text('╳');
        var source_link = $('<a href="#" class="show_sources" title="Show track sources">').text('sources');
        var item_name = $('<span class="haudio">')
            .append($('<span class="contributor">').text(UTIL.truncateString(this.artist)).attr('title', this.artist))
            // .append(' ')
            .append($('<strong class="fn">').text(UTIL.truncateString(this.name)).attr('title', this.name));
        var elapsed = $('<span class="elapsed">').text(this.get_duration_string());
        var status = $('<span class="status">');
        var item_link   = $('<a href="#" class="item">')
            .append(elapsed)
            .append(status)
            .append(item_name);
        var sources = $('<div class="sources">');
        // Wrap in a div so we can return its innerHTML as a string
        return $('<div>')
            .append(remove_link)
            .append(source_link)
            .append(item_link)
            .append(sources)
            .html();
    };
    function playlistToHtml () {
        var play_indicator = $('<a href="#" class="playlist_playing" title="Playing">');
        var delete_link = $('<a href="#" class="delete_playlist" title="Delete playlist">').text('╳');
        var edit_link   = $('<a href="#" class="edit_playlist">').text(STRINGS.edit_playlist_text);
        var name        = $('<a href="#" class="playlist">').text(UTIL.truncateString(this.name));
        var edit_form   = $('<form style="display: none;" class="edit_playlist_form">')
            .append('<input type="text" name="name" class="playlist_name">')
            .append('<input type="submit" value="save">');
        // Wrap in a div so we can return its innerHTML as a string
        return $('<div>')
            .append(play_indicator)
            .append(delete_link)
            .append(edit_link)
            .append(name)
            .append(edit_form)
            .html();
    };
    var autolink_regexp = /((https?\:\/\/)|spotify:)[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!]/g;
    function playlistTitleHtml () {
        var wrapper = $('<div>');
        // Add an image
        if (this.image) {
            wrapper.append($('<img>').attr('src', this.image));
        }
        wrapper.append(this.toString());
        // Autolink description
        if (this.description) {
            var description = $('<small>');
            $.each(this.description.split(/[ \n]/), function (i, word) {
                if (word.match(autolink_regexp)) {
                    description.append($('<a>').attr('href', word).text(word));
                } else {
                    description.append(' '+word+' ');
                }
            });
            wrapper.append('<br>')
                .append(description);
        }
        return wrapper.html();
    };
    function couchDownHandler (action, result) {
        if (PLAYLICK.debug) {
            var message = "couchdb unavailable";
            if (result.error && result.error != 'unknown') {
                message = result.error+': '+result.reason;
            }
            console.warn('['+action+'] '+message);
            console.warn(result);
        }
        MODELS.couch_up = false;
        
        $('#loading_playlists').addClass('unavailable');
        $('#loading_playlists').html(
            '<b>Database unavailable.</b>'
            + '<br>Your changes will not be saved. '
            + '<a href="#" onclick="PLAYLICK.retryCouch(); return false;">retry</a>'
        );
        $('#loading_playlists').show();
    };
    function couchUpHandler (action, response) {
        MODELS.couch_up = true;
        $('#loading_playlists').hide();
        $('#tracksError').hide();
    }
    
    /* Apply to Models */
    MODELS.Track.prototype.toHTML = trackToHtml;
    MODELS.Playlist.prototype.toHTML = playlistToHtml;
    MODELS.Playlist.prototype.titleHTML = playlistTitleHtml;
    MODELS.couch_down_handler = couchDownHandler;
    MODELS.couch_up_handler = couchUpHandler;
})();