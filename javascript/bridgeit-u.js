window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
window.purchaseFlow = 'http://dev.bridgeit.io/code/bridgeit.u/purchase';
window.eventCRUDNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/eventCRUDnotification';
window.eventCustomNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/eventCustomNotification';
// Used to store event id/name to easily reference the name String to avoid encoding/decoding the Sting in javascript
window.events = {};
window.userRecord = {};

function anonymousLogin(){
    // Automatic auth service login with anonymous user that only has bridgeit.doc.getDocument permission
    var postData = {'username' : 'anonymous',
                    'password' : 'anonymous'};
    $.ajax({
        url : window.authService,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(postData)
    })
    .fail(requestFail)
    .done(anonymousLoginDone);
}

function loginSubmit(isAdmin){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form element used to generically validate form elements (could also serialize the form if necessary)
        *  Also using form to create post data from form's elements
        */
        var form = this;
        if(validate(form)){
            // Avoid getting a token from anonymous credentials
            if(!isAdmin && (form[0].value == 'anonymous' && form[1].value == 'anonymous')){
                $('#alertLoginDiv').html(
                    $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Invalid Credentials</div>').hide().fadeIn('fast')
                );
                return;
            }
            var postData = {'username' : form[0].value,
                            'password' : form[1].value};
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

function anonymousLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        localStorage.bridgeitUAnonymousToken = data.access_token;
        localStorage.bridgeitUAnonymousTokenExpires = data.expires_in;
        retrieveEvents();
        registerPushUsernameGroup('anonymous');
    }else{
        serviceRequestUnexpectedStatusAlert('Anonymous Login', jqxhr.status);
    }

}

function studentLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made
        localStorage.bridgeitUToken = data.access_token;
        localStorage.bridgeitUTokenExpires = data.expires_in;
        localStorage.bridgeitUUsername = $('#userName').val();
        registerPushUsernameGroup(localStorage.bridgeitUUsername);
        studentLoggedIn();
    }else{
        serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
    }
}

function studentLoggedIn(){
    getUserRecord();
    uiLoggedIn(localStorage.bridgeitUUsername);
    $('#ticketsEvntFrm')[0].reset();
    $('#ticketsPanel').show('slow');
    $('#locationPanel').show('slow');
}

function studentLogout(){
    localStorage.removeItem('bridgeitUToken');
    localStorage.removeItem('bridgeitUTokenExpires');
    localStorage.removeItem('bridgeitUUsername');
    $('#ticketsPanel').hide();
    $('#locationPanel').hide();
    $('#loginIcon').html('Login');
    $('#loginModal').modal('show');
    $('#alertLoginDiv').html(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Session Expired</div>').hide().fadeIn('fast')
    );
}

function adminLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        // Check that user has admin permissions
        var postData = {};
        postData['access_token'] = data.access_token;
        postData['permissions'] = 'u.admin';
        $.ajax({
            url : window.authServicePermissions,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(adminPermissionFail)
        .done(adminPermissionDone(data.access_token, data.expires_in));
    }else{
        serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
    }
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

var adminPermissionDone = function(token, expires_in){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 200){
            sessionStorage.bridgeitUToken = token;
            sessionStorage.bridgeitUTokenExpires = expires_in;
            sessionStorage.bridgeitUUsername = $('#userName').val();
            registerPushUsernameGroup(sessionStorage.bridgeitUUsername);
            adminLoggedIn();
        }else{
            serviceRequestUnexpectedStatusAlert('Permission Check', jqxhr.status);
        }
    }
};

function adminLoggedIn(){
    uiLoggedIn(sessionStorage.bridgeitUUsername);
    // Admin screen has login cancel buttons hidden to force login.  After logging in as admin show cancel buttons.
    $('#loginCloseBttn').show();
    $('#loginCancelBttn').show();
    retrieveEventsAdmin();
    $('#crtEvntFrm')[0].reset();
}

function adminLogout(){
    sessionStorage.removeItem('bridgeitUToken');
    sessionStorage.removeItem('bridgeitUTokenExpires');
    sessionStorage.removeItem('bridgeitUUsername');
    toggleCreateNotifyEvent();
    $('#loginIcon').html('Login');
    // Force login by showing modal login and initially hide close and cancel buttons
    $('#loginModal').modal('show');
    $('#loginCloseBttn').hide();
    $('#loginCancelBttn').hide();
    $('#alertLoginDiv').html(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Session Expired</div>').hide().fadeIn('fast')
    );
}

function registerPushUsernameGroup(username){
    bridgeit.login(username, username);
    bridgeit.usePushService();
    bridgeit.addPushListener(username, 'handlePush');
}

function handlePush(){
    retrieveEvents();
}

function adminPermissionFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        $('#alertLoginDiv').html(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Invalid Login - you are not an administrator</div>').hide().fadeIn('fast')
        );
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function retrieveEvents(){
    $.getJSON(window.documentService  + '?access_token=' + localStorage.bridgeitUAnonymousToken)
    .fail(retrieveEventsFail)
    .done(retrieveEventsDone);
}

function retrieveEventsAdmin(){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        $.getJSON(window.documentService + '?access_token=' + sessionStorage.bridgeitUToken)
        .fail(retrieveEventsFail)
        .done(adminRetrieveEventsDone);
    }else{
        adminLogout();
    }
}

function retrieveEventsFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        // 404 means the list is empty
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function retrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            // Using Document Service to store users, this will skip the user documents
            if(!obj.location){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<a href="#" class="list-group-item" onclick="purchaseEvent(\'' + obj._id + '\');">' + obj.name + '</a>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function adminRetrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            // Using Document Service to store users, this will skip the user documents
            if(!obj.location){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<div class="list-group-item"><a title="Send Event Notification" data-toggle="modal" href="#evntNtfctnModal" onclick="notifyEvent(\'' + obj._id + '\');"><span style="margin-right: 10px;" class="glyphicon glyphicon-bullhorn"></span></a>' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="editEvent(\'' + obj._id + '\');" class="pull-right"><span class="glyphicon glyphicon-edit"></span></a></div>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function purchaseEvent(documentId){
    // No token, prompt student to login
    if(!localStorage.bridgeitUToken){
        $('#loginModal').modal('show');
        return;
    }
    if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .fail(requestFail)
        .done(purchaseGetEventDone);
    }else{
        studentLogout();
    }
}

function purchaseGetEventDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        $('#ticketsPanel').addClass('panel-primary');
        $('#purchaseBttn').attr('disabled', false);
        document.getElementById('ticketsQuantity').value = null;
        document.getElementById('ticketsName').value = data.name;
        document.getElementById('ticketsDetails').value = data.details;
        $('#ticketsEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['access_token'] = localStorage.bridgeitUToken;
                postData['name'] = form[0].value;
                postData['quantity'] = form[1].value;
                $.ajax({
                    url : window.purchaseFlow,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(purchaseFail)
                .done(purchaseEventDone);
            }
        }));
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
    }
}

function purchaseFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        $('#alertDiv').prepend(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>Unauthorized</strong> to make a purchase: status <strong>' + jqxhr.status + '</strong></small></div>').hide().fadeIn('slow')
        );
        $('#noticesPanel').addClass('panel-info');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function purchaseEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        $('#alertDiv').prepend(
            $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + data.quantity + ' ' + data.name + '</strong> ticket(s) purchased.</small></div>').hide().fadeIn('slow')
        );
        $('#noticesPanel').addClass('panel-info');
        $('#ticketsEvntFrm')[0].reset();
        $('#ticketsPanel').removeClass('panel-primary');
        $('#purchaseBttn').attr('disabled', true);
    }else{
        serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
    }
}

function deleteEvent(documentId){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        if (confirm("Delete Event?")){
            $.ajax({
                url : window.documentService + '/' + documentId +  '?access_token=' + sessionStorage.bridgeitUToken,
                type: 'DELETE',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            })
            .fail(requestFail)
            .done(deleteDone(documentId));
        }
    }else{
        adminLogout();
    }
}

var deleteDone = function(documentId){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 204){
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + window.events[documentId] + '</strong> Event Deleted</small></div>').hide().fadeIn('slow')
            );
            $('#noticesPanel').addClass('panel-info');
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Delete Event', jqxhr.status);
        }
    };
};

function editEvent(documentId){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + sessionStorage.bridgeitUToken + '&results=one')
        .fail(requestFail)
        .done(editGetEventDone);
    }else{
        adminLogout();
    }
}

function editGetEventDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        document.getElementById('edtName').value = data.name;
        document.getElementById('edtDetails').value = data.details;
        $('#edtEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Put data from form's elements
            */
            var form = this;
            if(validate(form)){
                var putData = {};
                putData['name'] = form[0].value;
                putData['details'] = form[1].value;
                $.ajax({
                    url : window.documentService + '/' + data._id + '?access_token=' + sessionStorage.bridgeitUToken,
                    type: 'PUT',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(putData)
                })
                .fail(requestFail)
                .done(editEventDone(data._id));
            }
        }));
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
    }
}

var editEventDone = function(documentId){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + window.events[documentId] + '</strong> Event Edited</small></div>').hide().fadeIn('slow')
            );
            $('#noticesPanel').addClass('panel-info');
            $('#editModal').modal('hide');
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Edit Event', jqxhr.status);
        }
    };
};

function notifyEvent(documentId){
    $('#ntfctnTextLabel').html(window.events[documentId]);
    notifyEventShow();
    $('#evntNtfctnFrm').off('submit').on('submit',(function( event ) {
        event.preventDefault();
        if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            var postURL = window.eventCRUDNotificationFlow; 
            if (form["ntfctnCstm"].checked)  {
                postURL = window.eventCustomNotificationFlow; 
            }
            if(validate(form)){
                var postData = {};
                postData['access_token'] = sessionStorage.bridgeitUToken;
                postData['eventName'] = window.events[documentId];
                postData['pushSubject'] = form[0].value;
                // TODO: Flow for location context
                $.ajax({
                    url : postURL,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(notifyCRUDEventFail)
                .done(notifyCRUDEventDone);
            }
        }else{
            adminLogout();
        }
    }));
}

function notifyCRUDEvent(){
    var postData = {};
    postData['access_token'] = sessionStorage.bridgeitUToken;
    postData['pushSubject'] = 'Event List Modified';
    $.ajax({
        url : window.eventCRUDNotificationFlow,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(postData)
    })
    .fail(notifyCRUDEventFail)
    .done(notifyCRUDEventDone);
}

function notifyCRUDEventFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        $('#alertDiv').prepend(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>Unauthorized</strong> to send event CRUD notifications: status <strong>' + jqxhr.status + '</strong></small></div>').hide().fadeIn('slow')
        );
        $('#noticesPanel').addClass('panel-info');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function notifyCRUDEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        $('#alertDiv').prepend(
            $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + data.pushSubject + '</strong> push group notified.</small></div>').hide().fadeIn('slow')
        );
        $('#noticesPanel').addClass('panel-info');
        toggleCreateNotifyEvent();
    }else{
        serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
    }
}

function createEventSubmit(){
    $('#crtEvntFrm').submit(function( event ) {
        event.preventDefault();
        if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Post data from form's elements
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['name'] = form[0].value;
                postData['details'] = form[1].value;
                $.ajax({
                    url : window.documentService + '?access_token=' + sessionStorage.bridgeitUToken,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(requestFail)
                .done(createEventDone(form[0].value));
            }
        }else{
            adminLogout();
        }
    });
}

var createEventDone = function(name){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + name + '</strong> Event Created</small></div>').hide().fadeIn('slow')
            );
            $('#noticesPanel').addClass('panel-info');
            $('#crtEvntFrm')[0].reset();
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Create Event', jqxhr.status);
        }
    };
};

function locationSaveSubmit(){
    $('#lctnFrm').submit(function( event ) {
        event.preventDefault();
        if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Post data from form's elements
            */
            var form = this;
            if(validateCurrentLocation(form)){
                var location = $('input[name="crrntLctn"]:checked').val();
                var postData = {};
                postData['_id'] = (window.userRecord['_id'] ? window.userRecord['_id'] : localStorage.bridgeitUUsername);
                postData['type'] = (window.userRecord['type'] ? window.userRecord['type'] : 'u.student');
                postData['location'] = location;
                postData['tickets'] = (window.userRecord['_id'] ? window.userRecord['tickets'] : []);
                $.ajax({
                    url : window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(requestFail)
                .done(locationSaveDone(location));
            }
        }else{
            studentLogout();
        }
    });
}

var locationSaveDone = function(location){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + location + '</strong> Location Saved</small></div>').hide().fadeIn('slow')
            );
            $('#noticesPanel').addClass('panel-info');
            $('#crrntLctn').html(location);
        }else{
            serviceRequestUnexpectedStatusAlert('Save Location', jqxhr.status);
        }
    };
};

function requestFail(jqxhr, textStatus, errorThrown){
    $('#alertDiv').prepend(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>Error connecting to the service</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.</small></div>').hide().fadeIn('slow')
    );
    $('#noticesPanel').addClass('panel-info');
}

function serviceRequestUnexpectedStatusAlert(source, status){
    $('#alertDiv').prepend(
        $('<div class="alert alert-warning fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + source + ' Warning</strong>: Unexpected status <strong>' + status + '</strong> returned.</small></div>').hide().fadeIn('slow')
    );
    $('#noticesPanel').addClass('panel-info');
}

function getUserRecord(){
    $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
    .fail(getUserRecordFail)
    .done(getUserRecordDone);
}

function getUserRecordDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        window.userRecord = data;
        if(data.location){
            $('#crrntLctn').html(data.location);
            $('input[value="' + data.location + '"]').prop('checked', true)
        }else{
            resetLocationPanel();
        }
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
    }
}

function getUserRecordFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        // User Record doesn't exist.
        window.userRecord = {};
        resetLocationPanel();
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
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

function validateCurrentLocation(form){
    var formValid = $('input[name="crrntLctn"]:checked').val();
    if(formValid){
        $('#lctnPnlbdy').removeClass('has-error');
    }else{
        $('#lctnPnlbdy').addClass('has-error');
    }
    return formValid;
}

function uiLoggedIn(username){
    $('#loginIcon').html('Welcome: ' + username);
    resetLoginForm();
    $('#loginModal').modal('hide');
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

function removeNoticesInfoClass(){
    $('#noticesPanel').removeClass('panel-info');
}

function notifyEventShow(){
    var notificationForm = document.getElementById('evntNtfctnFrm');
    notificationForm.reset();
    $('#crtEvntDiv').hide();
    $('#evntNtfctnDiv').show('slow');
}

function toggleCreateNotifyEvent(){
    $('#evntNtfctnDiv').hide();
    $('#crtEvntDiv').show('slow');
}

function tokenValid(token, expires, type){
    return token && (parseInt(expires) > new Date().getTime());
}

function resetLocationPanel(){
    $('#crrntLctn').html('');
    $('input[name="crrntLctn"]').prop('checked', false);
}