window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
window.purchaseFlow = 'http://dev.bridgeit.io/code/bridgeit.u/purchase';
window.purchaseCancelFlow = 'http://dev.bridgeit.io/code/bridgeit.u/purchaseCancel';
window.eventCRUDNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/eventCRUDnotification';
window.eventCustomNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/eventCustomNotification';
// Used to store event id/name to easily reference the name String to avoid encoding/decoding the String in javascript
window.events = {};
window.userRecord = {};
// gmap location
window.map = null;
window.markers = [];
window.center = null;
window.mapOptions = {
    zoom: 15,
    maxZoom: 16,
    draggable: false,
    center: new google.maps.LatLng(51.07816,-114.135801),
    mapTypeId: google.maps.MapTypeId.ROADMAP
};
window.counter = 0;
window.locations = ['Residence','Computer Science Building','Off Campus'];
window.randomLocation = (Math.floor(Math.random() * locations.length)) + 1;
window.currentLocation = 'You are here.';

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
    $('#purchaseEvntFrm')[0].reset();
    $('#purchasePanel').show('slow');
    $('#ticketsPanel').show('slow');
    $('#locationPanel').show();
    uiLoggedIn(localStorage.bridgeitUUsername);
    initializeStudent();
}

function studentLogout(){
    localStorage.removeItem('bridgeitUToken');
    localStorage.removeItem('bridgeitUTokenExpires');
    localStorage.removeItem('bridgeitUUsername');
    $('#purchasePanel').hide();
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
    getNotifications(function (data) {
        data.forEach(displayNotification);
    });
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
            if(!obj.type){
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
            if(!obj.type){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<div class="list-group-item"><a title="Send Event Notification" data-toggle="modal" href="#evntNtfctnModal" onclick="notifyEvent(\'' + obj._id + '\');"><span style="margin-right: 10px;" class="glyphicon glyphicon-bullhorn"></span></a>' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="editEvent(\'' + obj._id + '\');" class="pull-right"><span class="glyphicon glyphicon-edit"></span></a></div>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function displayTickets(){
    var evntTcktLst = $('#evntTcktLst');
    evntTcktLst.html('');
    for (var key in window.events) {
       if (window.events.hasOwnProperty(key) ){
           for (var i=0; i<window.userRecord.tickets.length; i++){
               if(window.userRecord.tickets[i].name == window.events[key]){
                   evntTcktLst.append('<div class="list-group-item">' + window.userRecord.tickets[i].name + '<a title="Cancel Ticket Purchase" onclick="cancelTicketPurchase(\'' + window.userRecord.tickets[i].name + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a></div>');
               }
           }

       }
    }
}

function cancelTicketPurchase(eventName){
    var postData = {};
    postData['access_token'] = localStorage.bridgeitUToken;
    postData['eventname'] = eventName;
    // Also submit user record to be updated in purchaseCancelFlow
    var submittedUserRecord = {};
    submittedUserRecord['_id'] = window.userRecord['_id'];
    submittedUserRecord['type'] = window.userRecord['type'];
    submittedUserRecord['location'] = window.userRecord['location'];
    submittedUserRecord['tickets'] = window.userRecord['tickets'].slice(0);
    for(var i=0; i<submittedUserRecord['tickets'].length; i++){
        if(submittedUserRecord['tickets'][i].name == eventName){
            submittedUserRecord['tickets'].splice(i,1);
            break;
        }
    }
    postData['user_record'] = submittedUserRecord;
    $.ajax({
        url : window.purchaseCancelFlow,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(postData)
    })
    .fail(purchaseFail)
    .done(purchaseCancelDone);
}

function purchaseCancelDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        for(var i=0; i<window.userRecord['tickets'].length; i++){
            if(window.userRecord['tickets'][i].name == data.eventname){
                window.userRecord['tickets'].splice(i,1);
                break;
            }
        }
        $('#alertDiv').prepend(
            $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + data.eventname + '</strong> ticket purchase cancelled.</small></div>').hide().fadeIn('slow')
        );
        addNoticesInfoClass();
        displayTickets();
    }else{
        serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
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
        $('#purchasePanel').addClass('panel-primary');
        $('#purchaseBttn').prop('disabled', false);
        document.getElementById('purchaseQuantity').value = null;
        document.getElementById('purchaseName').value = data.name;
        document.getElementById('purchaseDetails').value = data.details;
        $('#purchaseEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['access_token'] = localStorage.bridgeitUToken;
                postData['eventname'] = form[0].value;
                postData['quantity'] = form[1].value;
                // Also submit user record to be updated in purchaseFlow
                var submittedUserRecord = {};
                submittedUserRecord['_id'] = (window.userRecord['_id'] ? window.userRecord['_id'] : localStorage.bridgeitUUsername);
                submittedUserRecord['type'] = (window.userRecord['type'] ? window.userRecord['type'] : 'u.student');
                submittedUserRecord['location'] = (window.userRecord['location'] ? window.userRecord['location'] : '');
                submittedUserRecord['tickets'] = (window.userRecord['tickets'] ? window.userRecord['tickets'] : []);
                var ticketArray = [];
                for(var i=0; i<form[1].value; i++){
                    ticketArray.push({name:form[0].value});
                }
                submittedUserRecord['tickets'] = submittedUserRecord['tickets'].concat(ticketArray);
                postData['user_record'] = submittedUserRecord;
                $.ajax({
                    url : window.purchaseFlow,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(purchaseFail)
                .done(purchaseEventDone(ticketArray));
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
        addNoticesInfoClass();
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

var purchaseEventDone = function(ticketArray){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 200){
            window.userRecord['tickets'] = window.userRecord['tickets'].concat(ticketArray);
            displayTickets();
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + data.quantity + ' ' + data.eventname + '</strong> ticket(s) purchased.</small></div>').hide().fadeIn('slow')
            );
            addNoticesInfoClass();
            $('#purchaseEvntFrm')[0].reset();
            $('#purchasePanel').removeClass('panel-primary');
            $('#purchaseBttn').prop('disabled', true);
        }else{
            serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
        }
    }
};

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
            addNoticesInfoClass();
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
            addNoticesInfoClass();
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
            var eventName = window.events[documentId];
            var pushSubject = form[0].value;
            storeNotification(eventName, pushSubject, 20);
            var postURL = window.eventCRUDNotificationFlow; 
            if (form["ntfctnCstm"].checked)  {
                postURL = window.eventCustomNotificationFlow; 
            }
            if(validate(form)){
                var postData = {};
                postData['access_token'] = sessionStorage.bridgeitUToken;
                postData['eventName'] = eventName;
                postData['pushSubject'] = pushSubject;
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

function storeNotification(eventName, pushSubject, lifeseconds)  {
    var notification = {};
    var now = new Date();
    notification.type = "notification";
    notification.timestamp = now.getTime();
    notification.expiry = now.getTime() + (lifeseconds * 1000);
    notification.eventName = eventName;
    notification.pushSubject = pushSubject;
    $.ajax({
        url : window.documentService + '/' + '?access_token=' + 
                sessionStorage.bridgeitUToken,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(notification)
    })
    .fail(requestFail);
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
        addNoticesInfoClass();
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function notifyCRUDEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        $('#alertDiv').prepend(
            $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + data.pushSubject + '</strong> push group notified.</small></div>').hide().fadeIn('slow')
        );
        addNoticesInfoClass();
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
            addNoticesInfoClass();
            $('#crtEvntFrm')[0].reset();
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Create Event', jqxhr.status);
        }
    };
};

var locationSaveDone = function(location){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            window.userRecord['location'] = location;
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + location + '</strong> Location Saved</small></div>').hide().fadeIn('slow')
            );
            addNoticesInfoClass();
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
    addNoticesInfoClass();
}

function serviceRequestUnexpectedStatusAlert(source, status){
    $('#alertDiv').prepend(
        $('<div class="alert alert-warning fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + source + ' Warning</strong>: Unexpected status <strong>' + status + '</strong> returned.</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function initializeStudent(){
    $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
    .fail(initializeStudentFail)
    .done(initializeStudentDone);
}

function initializeStudentDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        window.userRecord = data;
        displayTickets();
        var lctnLabel = $('#crrntLctn');
        lctnLabel.html('');
        if(data.location){
            lctnLabel.html(data.location);
            window.currentLocation = data.location;
        }
        locationMapInit();
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
    }
}

function initializeStudentFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        // User Record doesn't exist.
        window.userRecord = {};
        $('#crrntLctn').html('');
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

function uiLoggedIn(username){
    $('#loginIcon').html('Welcome: ' + username);
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

function addNoticesInfoClass(){
    $('#noticesPanel').addClass('panel-info');
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

function locationMapInit(){
    window.map = new google.maps.Map(document.getElementById('map-canvas'), window.mapOptions);
    navigator.geolocation.getCurrentPosition(geolocationSetPosition,geolocationError,{timeout:5000});

    google.maps.event.addListener(window.map, 'click', function(event) {
        var locationIndex = ((window.randomLocation + (window.counter++)) % 3) + 1;
        window.currentLocation = window.locations[locationIndex-1];
        window.map.setCenter(event.latLng);
        placeMapMarker();

        if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            var postData = {};
            postData['_id'] = (window.userRecord['_id'] ? window.userRecord['_id'] : localStorage.bridgeitUUsername);
            postData['type'] = (window.userRecord['type'] ? window.userRecord['type'] : 'u.student');
            postData['location'] = window.currentLocation;
            postData['tickets'] = (window.userRecord['tickets'] ? window.userRecord['tickets'] : []);
            $.ajax({
                url : window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken,
                type: 'POST',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(requestFail)
            .done(locationSaveDone(window.currentLocation));
        }else{
            studentLogout();
        }
    });
    // TODO:  This call appears to prevent future calls to navigator.geolocation.getCurrentPosition from working in Chrome
    //        Investigate when needed.
    //navigator.geolocation.watchPosition(geolocationSetPosition);
}

function geolocationSetPosition(pos){
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    window.map.setCenter(new google.maps.LatLng(lat,lon) );
    placeMapMarker();
    google.maps.event.trigger(window.map, 'resize');
}

function placeMapMarker(){
    clearOverlays();
    window.markers.push(new google.maps.Marker({
      position: window.map.getCenter(),
      map: window.map,
      title: window.currentLocation
      })
    );
}

function geolocationError(){
    $('#alertDiv').prepend(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>Geolocation</strong> problem setting map location.</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function clearOverlays() {
    for (var i = 0; i < window.markers.length; i++ ) {
        window.markers[i].setMap(null);
    }
    window.markers.length = 0;
}