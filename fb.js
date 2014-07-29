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
            checkPermissionsById(response.id, facebookOk);
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

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
    $("#fbstatus").html('Logging into Facebook...');
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
}

window.fbAsyncInit = function() {
    FB.init({
        appId      : '1456420244613043',
        cookie     : true,  // enable cookies to allow the server to access 
        // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.0' // use version 2.0
    });

    checkLoginState();
};

// Load the SDK asynchronously
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function checkPermissionsById(user_id, success) {
    $("#fbstatus").html("Checking Facebook permissions...");
    FB.api('/' + user_id + '/permissions', function (response) {

        var groups_granted = false;
        $.each(response.data, function (i, val) {
            if (val.permission === 'user_groups' &&
                    val.status === 'granted')
                groups_granted = true;
        });
        if (groups_granted)
            success();
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
}

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
        FB.api('/me/groups', function (response) {
            groups = response.data;
            filterGroups(response.data, group_name);
        });
}

function filterGroups(group_list, group_name) {
    var found = false;
    var group_results = $("#groupresults");
    var group_status = $("#groupstatus");
    $.each(group_list, function (i,val) {
        if (val.name.indexOf(group_name) >= 0) {
            var link = $("<a/>", { text: val.name, 
                href: "javascript:processGroupFeed(" + val.id + ")"
            });
            link.appendTo(group_results).wrap("<li>");
            found = true;
        }
    });
    if (!found)
        group_status.html("No result for \"" + group_name + "\"");
}


function processGroupFeed(group_id) {
    console.log("Processing group " + group_id);
}
