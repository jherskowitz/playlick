/* Model customisation */
(function () {
    function trackToHtml () {
        var loading = $('<div class="loading">');
        var remove_link = $('<a href="#" class="remove" title="Remove from playlist">').text('╳');
        var source_link = $('<a href="#" class="show_sources" title="Show track sources">').text('sources');
        var item_name = $('<span class="haudio">')
            .append($('<span class="contributor">').text(UTIL.truncateString(this.artist)).attr('title', this.artist))
            .append($('<strong class="fn">').text(UTIL.truncateString(this.name, (this.artist ? 30 : 50))).attr('title', this.name));
        var elapsed = $('<span class="elapsed">').text(this.get_duration_string());
        var status = $('<span class="status">');
        var item_link = $('<a href="#" class="item">')
            .append(elapsed)
            .append(status)
            .append(item_name);
        var videoShim = $('<div class="videoShim">').hide();
        var sources = $('<div class="sources">');
        // Wrap in a div so we can return its innerHTML as a string
        var wrapper = $('<div>')
            .append(loading)
            .append(remove_link);
        if (this.spotifyUrl) {
            var spotifyLink = $('<a class="spotifyLink">')
                .attr('target', PLAYLICK.appLauncherId)
                .attr('href', this.spotifyUrl)
                .append('<img src="/spotify_icon.gif" width="16" height="16">');
            wrapper.append(spotifyLink);
        }
        wrapper.append(source_link)
               .append(item_link)
               .append(videoShim)
               .append(sources);
        return wrapper.html();
    };
    function playlistToHtml () {
        var play_indicator = $('<a href="#" class="playlist_playing" title="Playing">');
        var delete_link = $('<a href="#" class="delete_playlist" title="Delete playlist">').text('╳');
        var edit_link   = $('<a href="#" class="edit_playlist">').text(STRINGS.edit_playlist_text);
        var name        = $('<a href="#" class="playlist">')
            .attr('title', this.toString())
            .append($('<span>').text(UTIL.truncateString(this.toString())));
        if (this.isAlbum()) {
            var albumArt = IMPORTERS.LastFm.getAlbumArt(this.artist, this.album);
            name.prepend($('<img width="24" height="24" class="art">').attr('src', albumArt));
        }
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
    
    /* Apply to Models */
    MODELS.Track.prototype.toHTML = trackToHtml;
    MODELS.Playlist.prototype.toHTML = playlistToHtml;
})();
