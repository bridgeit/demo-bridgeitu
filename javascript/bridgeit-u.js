window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
window.purchaseFlow = 'http://dev.bridgeit.io/code/bridgeit.u/purchase';
// Token obtained automatically to view events in the index.html screen without a login
window.tokenAnonymousAccess = null;
// Token obtained from a login
window.tokenLoggedIn = null;
// Used to store event id/name to easily reference the name String to avoid encoding/decoding the Sting in javascript
window.events = {};

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
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, generically creating post data from a form's input fields
        */
        var form = this;
        if(validate(form)){
            // Avoid getting a tokenLoggedIn from anonymous credentials
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
        window.tokenAnonymousAccess = data.access_token;
        retrieveEvents();
    }else{
        serviceRequestUnexpectedStatusAlert('Anonymous Login', jqxhr.status);
    }

}

function studentLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        window.tokenLoggedIn = data.access_token;
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made
        uiLoggedIn();
        $('#ticketsPanel').show();
    }else{
        serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
    }
}

function adminLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        window.tokenLoggedIn = data.access_token;
        // Check that user has admin permissions
        var postData = {};
        postData['access_token'] = window.tokenLoggedIn;
        postData['permissions'] = 'u.admin';
        $.ajax({
            url : window.authServicePermissions,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(adminPermissionFail)
        .done(adminPermissionDone);
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

function adminPermissionDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        retrieveEventsAdmin();
        // Admin screen has login cancel buttons hidden to force login.  After logging in as admin show cancel buttons.
        $('#loginCloseBttn').show();
        $('#loginCancelBttn').show();
        uiLoggedIn();
    }else{
        serviceRequestUnexpectedStatusAlert('Permission Check', jqxhr.status);
    }
}

function adminPermissionFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        window.tokenLoggedIn = null;
        $('#alertLoginDiv').html(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Invalid Login - you are not an administrator</div>').hide().fadeIn('fast')
        );
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function retrieveEvents(){
    $.getJSON(window.documentService  + '?access_token=' + window.tokenAnonymousAccess)
    .fail(retrieveEventsFail)
    .done(retrieveEventsDone);
}

function retrieveEventsAdmin(){
    $.getJSON(window.documentService + '?access_token=' + window.tokenLoggedIn)
    .fail(retrieveEventsFail)
    .done(adminRetrieveEventsDone);
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
            // Using Document Service to store ticket purchases, this will skip the ticket purchase documents
            if(!obj.access_token){
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
            // Using Document Service to store ticket purchases, this will skip the ticket purchase documents
            if(!obj.access_token){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<div class="list-group-item">' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" class="pull-right"><span style="padding: 0 10px;"  class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="editEvent(\'' + obj._id + '\');" class="pull-right"><span class="glyphicon glyphicon-edit"></span></a></div>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function purchaseEvent(documentId){
    if(window.tokenLoggedIn){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + window.tokenLoggedIn + '&results=one')
        .fail(requestFail)
        .done(purchaseGetEventDone);
    }else{
        $('#loginModal').modal('show');
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
            /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
            *  In this case, trying to generically create json objects from a form's input fields
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['access_token'] = window.tokenLoggedIn;
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
    if (confirm("Delete Event?")){
        $.ajax({
            url : window.documentService + '/' + documentId +  '?access_token=' + window.tokenLoggedIn,
            type: 'DELETE',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        })
        .fail(requestFail)
        .done(deleteDone(documentId));
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
        }else{
            serviceRequestUnexpectedStatusAlert('Delete Event', jqxhr.status);
        }
    };
};

function editEvent(documentId){
    $.getJSON( window.documentService + '/' + documentId + '?access_token=' + window.tokenLoggedIn + '&results=one')
    .fail(requestFail)
    .done(editGetEventDone);
}

function editGetEventDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        document.getElementById('edtName').value = data.name;
        document.getElementById('edtDetails').value = data.details;
        $('#edtEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
            *  In this case, trying to generically create json objects from a form's input fields
            */
            var form = this;
            if(validate(form)){
                var putData = {};
                putData['name'] = form[0].value;
                putData['details'] = form[1].value;
                $.ajax({
                    url : window.documentService + '/' + data._id + '?access_token=' + window.tokenLoggedIn,
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
        if(jqxhr.status == 204){
            $('#alertDiv').prepend(
                $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small><strong>' + window.events[documentId] + '</strong> Event Edited</small></div>').hide().fadeIn('slow')
            );
            $('#noticesPanel').addClass('panel-info');
            $('#editModal').modal('hide');
            retrieveEventsAdmin();
        }else{
            serviceRequestUnexpectedStatusAlert('Edit Event', jqxhr.status);
        }
    };
};

function createEventSubmit(){
    $('#crtEvntFrm').submit(function( event ) {
        event.preventDefault();
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, trying to generically create json objects from a form's input fields
        */
        var form = this;
        if(validate(form)){
            var postData = {};
            postData['name'] = form[0].value;
            postData['details'] = form[1].value;
            $.ajax({
                url : window.documentService + '?access_token=' + window.tokenLoggedIn,
                type: 'POST',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(requestFail)
            .done(createEventDone(form[0].value));
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
        }else{
            serviceRequestUnexpectedStatusAlert('Create Event', jqxhr.status);
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

function validate(form){
    /* Create and Edit forms have name and details 1st and second respectively
       instead of referencing by name, use order in the form to avoid duplicate id's
     */
    // TODO: Find iterative way of doing this without forms with only two fields
    formValid = true;
    if( form[0].value == ''){
        $(form[0]).parent('div').addClass('has-error');
        formValid = false;
    }else{
        $(form[0]).parent('div').removeClass('has-error');
    }
    if( form[1].value == ''){
        $(form[1]).parent('div').addClass('has-error');
        formValid = false;
    }else{
        $(form[1]).parent('div').removeClass('has-error');
    }
    return formValid;
}

function uiLoggedIn(){
    $('#loginIcon').html('Welcome: ' + $('#userName').val());
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
    $(form[0]).parent('div').removeClass('has-error');
    $(form[1]).parent('div').removeClass('has-error');
}

function removeNoticesInfoClass(){
    $('#noticesPanel').removeClass('panel-info');
}