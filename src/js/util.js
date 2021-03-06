/* Util */
var UTIL = {
    shuffle: function (array) {
        var copy = $.makeArray(array);
        copy.sort(function () {
            return 0.5 - Math.random();
        });
        return copy;
    },
    truncateString: function (name, length, truncation) {
        length = length || 30;
        if (truncation === undefined) {
            truncation = '…';
        }
        if (name.length > length) {
            return name.slice(0, length - truncation.length) + truncation;
        }
        return String(name);
    },
    serializeForm: function (form) {
        var params = {};
        $.each($(form).serializeArray(), function (i, item) {
            params[item.name] = item.value;
        });
        return params;
    },
    compareString: function (a, b) {
        a = a || '';
        b = b || '';
        return a.toUpperCase() == b.toUpperCase();
    },
    getHashParts: function () {
        var hash_sections = window.location.hash.replace(/^#(.*)/, '$1').split(';');
        var hash_parts = {};
        $.each(hash_sections, function (i, section) {
            var kv = section.split('=');
            if (kv[0] && kv[1]) {
                hash_parts[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
            }
        });
        return hash_parts;
    },
    
    // Based on http://daringfireball.net/2009/11/liberal_regex_for_matching_urls
    autolink_regexp: /\b([\w-]+:\/+|www[.])[^\s()<>]+(?:\([\w\d]+\)|(?:[^.,;'">\:\s\<\>\)\]\!]|\/))/g,
    autoLink: function (word) {
        word = word || '';
        return word.replace(UTIL.autolink_regexp, function (match, protocol, index, full) {
            var url = match;
            if (protocol == 'www.') {
                url = 'http://' + url;
            }
            var text = match.replace(/^http:\/\//, '').replace(/\/$/, '');
            return '<a href="' + url + '">' + text + '</a>';
        });
    },
    
    sortBy: function (list, property, callable, descending) {
        list.sort(function (a, b) {
            var aSort = callable ? a[property]() : a[property];
            var bSort = callable ? b[property]() : b[property];
            if (aSort > bSort) {
                return descending ? -1 : 1;
            }
            if (aSort < bSort) {
                return descending ? 1 : -1;
            }
            return 0;
        });
    },
    sortByProperty: function (list, property, descending) {
        UTIL.sortBy(list, property, false, descending);
    },
    sortByMethod: function (list, method, descending) {
        UTIL.sortBy(list, method, true, descending);
    }
};
