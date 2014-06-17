window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
// Used to store event id/name to easily reference the name String to avoid encoding/decoding the String in javascript
window.events = {};

function loginSubmit(isAdmin){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form element used to generically validate form elements (could also serialize the form if necessary)
        *  Also using form to create post data from form's elements
        */
        var form = this;
        if(validate(form)){
            // Avoid getting a token from anonymous credentials
            if(!isAdmin && (form.userName.value == 'anonymous' && form.passWord.value == 'anonymous')){
                $('#alertLoginDiv').html(
                    $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Invalid Credentials</div>').hide().fadeIn('fast')
                );
                return;
            }
            var postData = {'username' : form.userName.value,
                            'password' : form.passWord.value};
            $.ajax({
                url : window.authService,
                type: 'POST',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(loginFail)
            .done(isAdmin ? adminLoginDone : studentLoginDone);
        }else{
            //Form fields are invalid, remove any alerts related to authentication
            $('#alertLoginDiv').html('');
        }
    });
}

function logoutClick(isAdmin){
    $('#logoutNavbar').click(function( event ) {
        event.preventDefault();
        if(isAdmin){
            adminLogout();
        }else{
            studentLogout();
        }
    });
}

function loginFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        $('#alertLoginDiv').html(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Invalid Credentials</div>').hide().fadeIn('fast')
        );
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function registerPushUsernameGroup(username){
    bridgeit.login(username, username);
    bridgeit.usePushService();
    bridgeit.addPushListener(username, 'handlePush');
}

function handlePush(){
    retrieveEvents();
    getNotifications(function (data) {
        data.forEach(displayNotification);
    });
}

function getNotifications(callback)  {
    var now = new Date();
    var query = {
        type: "notification",
        expiry: { $gt: now.getTime() }
    };
    $.getJSON(window.documentService +
            '?query=' + JSON.stringify(query) +
            '&access_token=' + localStorage.bridgeitUToken)
    .done(callback);
}

var notifications = {};

function displayNotification(item)  {
    //could also clean up based on expiry
    if (notifications[item.timestamp])  {
        return;
    }
    notifications[item.timestamp] = item;
    $('#alertDiv').prepend(
        $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + item.eventName + '</strong> '+ item.pushSubject +'</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function retrieveEventsFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        // 404 means the list is empty
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html('');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function requestFail(jqxhr, textStatus, errorThrown){
    $('#alertDiv').prepend(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>Error connecting to the service</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function serviceRequestUnexpectedStatusAlert(source, status){
    $('#alertDiv').prepend(
        $('<div class="alert alert-warning fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + source + ' Warning</strong>: Unexpected status <strong>' + status + '</strong> returned.</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function validate(form){
    /* Create and Edit forms have name and details fields.  Instead of
     * referencing by id, validate form children to avoid duplicate id's.
     */
    var formValid = true;
    for(var i=0; i<form.length; i++){
        if( (form[i].tagName == 'INPUT' || form[i].tagName == 'TEXTAREA')
                && form[i].value == ''){
            $(form[i]).parent('div').addClass('has-error');
            formValid = false;
        }else{
            $(form[i]).parent('div').removeClass('has-error');
        }
    }
    return formValid;
}

function uiLoggedIn(username){
    $('#welcome').html('Welcome: ' + username);
    showLogoutNavbar();
    resetLoginForm();
    $('#loginModal').modal('hide');
    // clear previous user notices
    removeNoticesInfoClass();
    $('#alertDiv').html('');
}

function resetLoginForm(){
    var loginForm = document.getElementById('loginModalForm');
    loginForm.reset();
    $('#alertLoginDiv').html('');
    resetFormCSS(loginForm);
}

function resetFormCSS(form){
    for(var i=0; i<form.length; i++){
        if(form[i].tagName == 'INPUT' || form[i].tagName == 'TEXTAREA'){
            $(form[i]).parent('div').removeClass('has-error');
        }
    }
}

function showLoginNavbar(){
    $('#loginNavbar').show();
    $('#logoutNavbar').hide();
}

function showLogoutNavbar(){
    $('#loginNavbar').hide();
    $('#logoutNavbar').show();
}

function addNoticesInfoClass(){
    $('#noticesPanel').addClass('panel-info');
}

function removeNoticesInfoClass(){
    $('#noticesPanel').removeClass('panel-info');
}

function tokenValid(token, expires, type){
    return token && (parseInt(expires) > new Date().getTime());
}