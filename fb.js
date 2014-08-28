/* -------------- */
/*  Youtube init  */
/* -------------- */

var YOUTUBE_API_KEY = "AIzaSyD1XMItkVAhnWjukgcJszeOjgYfHBDhchk";

var YOUTUBE_LOADED = false;

function handleYoutubeLoad() {
    gapi.client.setApiKey(YOUTUBE_API_KEY);
    gapi.client.load("youtube", "v3", function(){
        YOUTUBE_LOADED = true;
    });
}

/* --------------- */
/*  Facebook init  */
/* --------------- */

// Load the Facebook SDK asynchronously
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Called once the Facebook SDK has loaded
window.fbAsyncInit = function() {
    FB.init({
        appId      : '1456420244613043',
        cookie     : true,  // enable cookies to allow the server to access 
        // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.0' // use version 2.0
    });

    $("#loading").hide();
    $("#fblogin").show();
    $("#fbbutton").click(checkLoginState);
    checkLoginState();
};

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
    $("#fbstatus").html('Logging into Facebook...');
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
}

// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
        // Logged into your app and Facebook.
        $("#fbbutton").hide();
        FB.api('/me', function (response) {
            checkPermissionsById(response.id);
        });
    } else if (response.status === 'not_authorized') {
        // The person is logged into Facebook, but not your app.
        $("#fbbutton").show();
        $('#fbstatus').html('Please log into this app:');
    } else {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
        $("#fbbutton").show();
        $('#fbstatus').html('Please log into Facebook:');
    }
}

function checkPermissionsById(user_id) {
    $("#fbstatus").html("Checking Facebook permissions...");
    FB.api('/' + user_id + '/permissions', function (response) {

        var groups_granted = false;
        $.each(response.data, function (i, val) {
            if (val.permission === 'user_groups' &&
                    val.status === 'granted')
                groups_granted = true;
        });
        if (groups_granted)
            facebookOk();
        else
        {
            $('#fbstatus').html('You have not granted SpaceRadio the ' +
                    'permission to see your groups. Please log out of ' +
                    'Facebook and try again.');
            $("#fbbutton").show();
        }
    });
}

function facebookOk() {
    $("#fblogin").hide();
    $("#choosegroup").show();
    $("#groupname").on("input", findGroup);
    findGroup();
}


/* ------------------------------------------ */
/*  Process facebook group and extract links  */
/* ------------------------------------------ */

var groups = [];

function findGroup() {
    var group_name = $("#groupname").val();
    var group_status = $("#groupstatus");
    var group_results = $("#groupresults");
    group_status.html("Searching for \"" + group_name + "\"");
    group_results.html("");
    if (groups.length != 0)
        filterGroups(groups, group_name);
    else
        FB.api("/me/groups", function (response) {
            groups = response.data;
            filterGroups(response.data, group_name);
        });
}

function filterGroups(group_list, group_name) {
    var found = false;
    var group_results = $("#groupresults");
    var group_status = $("#groupstatus");
    $.each(group_list, function(i,val) {
        if (val.name.indexOf(group_name) >= 0) {
            var link = $("<a/>", {
                text: val.name,
                click: function () { processGroupFeed(val.name, val.id); },
                href: "#"
            });
            link.appendTo(group_results).wrap("<li>");
            found = true;
        }
    });
    if (!found)
        group_status.html("No result for \"" + group_name + "\"");
}

function processGroupFeed(group_name, group_id) {
    $("#choosegroup").hide();
    $("#feedvideos").show();
    $("#feedstatus").text("Processing group \"" + group_name + "\"");
    $("#feedstatuspage").text("Fetching page 1");
    $("#feedstatus").show();
    FB.api(group_id + "/feed", function (response) {
        extractYoutube(response, [], 2);
    });
    return false;
}

ytregex = {
    expr: new RegExp("(youtube[.]com/watch[?]v=|youtu[.]be/)([a-zA-Z0-9_-]+)", "g"),
    group: 2
};

function addUnique(string, array) {
    for (var i = 0; i < array.length; i++) {
        if (string === array[i])
            return;
    }
    array.push(string);
}

function matchRegex(string, regex, array) {
    var match = regex.expr.exec(string);
    while (match != null) {
        if (match.length > regex.group)
            addUnique(match[regex.group], array);
        match = regex.expr.exec(string);
    }
}

function extractYoutube(response, links, pageNum) {
    for (var i = 0; i < response.data.length; i++) {
        var post = response.data[i];
        matchRegex(post.message, ytregex, links);
        matchRegex(post.source, ytregex, links);
        if (post.comments && post.comments.data)
        {
            $.each(post.comments.data, function (i, val) {
                matchRegex(val.message, ytregex, links);
            });
        }
    }
    if (response.paging && response.paging.next) {
        $("#feedstatuspage").text("Fetching page " + pageNum);
        $.getJSON(response.paging.next, function (response) {
            extractYoutube(response, links, pageNum+1);
        });
    } else {
        $("#feedstatus").text("Found " + links.length +
                " links to youtube videos:");
        processLinks(links);
    }
}


/* ---------------------------------------- */
/*  Retrieve video information and display  */
/* ---------------------------------------- */

function processLinks(links) {
    if (YOUTUBE_LOADED) {
        getYoutubeInfo(links, 0, 25, []);
    } else {
        showLinks(links);
    }
}

function showLinks(links) {
    $("#feedstatuspage").text("Could not retrieve video information from youtube");
    videolist = $("#videolist");
    videolist.detach();
    for (var i = 0; i < links.length; i++) {
        var link = "http://youtu.be/" + links[i];
        videolist.append("<li><a href=\"" + link + "\">" + link + "</a></li>");
    }
    videolist.appendTo("#feedvideos");
}

function getYoutubeInfo(links, i, step, items) {
    var end = Math.min(i + step, links.length);
    $("#feedstatuspage").text("Getting video information for videos " + i + 
            " to " + end + "...");
    var request = gapi.client.youtube.videos.list({
        "part": "id,snippet",
        "id": links.slice(i, end).join()
    });
    
    request.execute(function(response) {
        if (response.hasOwnProperty("items")) {
            for (var j = 0; j < response.items.length; j++) {
                items.push(response.items[j]);
            }
        }
        if (end < links.length) {
            getYoutubeInfo(links, end, step, items);
        } else {
            showYoutubeLinks(items, links.length);
        }
    });
}

function showYoutubeLinks(items, total) {
    $("#feedstatuspage").hide();
    $("#feedstatus").text("Found " + items.length + "/" + total + " videos on youtube:");
    videolist = $("#videolist");
    videolist.detach();
    for (var i = 0; i < items.length; i++) {
        var link = "http://youtu.be/" + items[i].id;
        videolist.append("<li><a href=\"" + link + "\">" + items[i].snippet.title + "</a></li>");
    }
    videolist.appendTo("#feedvideos");
}
