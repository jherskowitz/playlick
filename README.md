[Playlick](http://www.playlick.com) lets you create and share playlists with your friends.

There's a UI for creating, importing, and editing playlists and an accompanying JS library for modelling playlists.

Hooks into [Playdar](http://www.playdar.org) for content resolution.

Persists in a CouchDB database.

URL Import
----------

You can import playlists into Playlick by using URL hash parameters that map to the import forms:

* XSPF: [#xspf=http://ws.audioscrobbler.com/2.0/artist/Hiromi/toptracks.xspf](http://www.playlick.com#xspf=http://ws.audioscrobbler.com/2.0/artist/Hiromi/toptracks.xspf)
* Podcast: [#podcast=http%3A%2F%2Fmokele.co.uk%2Fmusic.xml](http://www.playlick.com#podcast=http%3A%2F%2Fmokele.co.uk%2Fmusic.xml)
* Album: [#artist=Miles%20Davis;album=Kind%20of%20Blue](http://www.playlick.com#artist=Miles%20Davis;album=Kind%20of%20Blue)
* Last.fm user playlists: [#lastfm_playlists=jwheare](http://www.playlick.com#lastfm_playlists=jwheare)
* Last.fm loved tracks: [#lastfm_loved=jwheare](http://www.playlick.com#lastfm_loved=jwheare)
* Generated playlist from 2 Last.fm users: [#lastfm_you=jwheare;lastfm_they=rj](http://www.playlick.com#lastfm_you=jwheare;lastfm_they=rj)
* New playlist from a track: [#artist=Billy%20Joel;track=Piano%20Man](http://www.playlick.com#artist=Billy%20Joel;track=Piano%20Man)
* Album from Spotify URL: [#spotify_album=spotify:album:6G9fHYDCoyEErUkHrFYfs4](http://www.playlick.com#spotify_album=spotify:album:6G9fHYDCoyEErUkHrFYfs4)
* Track from Spotify URL: [#spotify_track=spotify:track:6NmXV4o6bmp704aPGyTVVG](http://www.playlick.com#spotify_track=spotify:track:6NmXV4o6bmp704aPGyTVVG)

TODO
----

* Seeded result objects from non stream sources http://pastie.org/pastes/704659/
* Setup CouchDB/persistance/sessions/URLs on playlick.com
* Tag playlist/personal tags/loved tracks import from Last.fm
* Error handling for streaming
* XSPF export
* iTunes import

DESIGN NOTES
------------

* First visit gives you an anon session that you can later activate with an email address and name
* Anon session lets you stream other's playlists and create/import and manage playlists in browser. "Activate to save and share these playlists"