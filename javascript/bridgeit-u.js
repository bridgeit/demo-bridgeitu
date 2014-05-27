window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
// Token obtained automatically to view events in the index.html screen without a login
window.tokenAnonymousAccess;
// Token obtained from a login
window.tokenLoggedIn;

// TODO: Use closure to pass in admin boolean to avoid code duplication
function studentLoginSubmit(){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, generically creating url from a form's input fields
        */
        var form = this;
        if(validate(form)){
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
            .done(studentLoginDone);
        }
    });
}

function adminLoginSubmit(){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, generically creating url from a form's input fields
        */
        var form = this;
        if(validate(form)){
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
            .done(adminLoginDone);
        }
    });
}

function anonymousLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        window.tokenAnonymousAccess = data.access_token;
        retrieveEvents();
    }else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function loginFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        alert("Invalid Credentials");
    }else{
        alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
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
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function adminPermissionFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        window.tokenLoggedIn = null;
        alert('Invalid Login - you are not an administrator');
    }else{
        alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
    }
}

function retrieveEvents(){
    $.getJSON(window.documentService + '?access_token=' + window.tokenAnonymousAccess)
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
        alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
    }
}

function retrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            evntLstDiv.append('<a href="#" class="list-group-item" onclick="purchaseEvent(\'' + obj._id + '\');">' + obj.name + '</a>');
        });
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function adminRetrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            evntLstDiv.append('<div class="list-group-item">' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" style="float: right;"><span style="padding: 0 10px;"  class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="editEvent(\'' + obj._id + '\');" style="float: right;"><span class="glyphicon glyphicon-edit"></span></a></div>');
        });
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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
        $('#purchaseBttn').show();
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
                    url : window.documentService + '?access_token=' + window.tokenLoggedIn,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(requestFail)
                .done(purchaseEventDone);
            }
        }));
    }else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function purchaseEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 201){
        alert('Tickets Purchased.');
        $('#ticketsEvntFrm')[0].reset();
        $('#purchaseBttn').hide();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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
        .done(deleteDone);
    }
}

function deleteDone(data, textStatus, jqxhr){
    if(jqxhr.status == 204){
        retrieveEventsAdmin();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

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
                .done(editEventDone);
            }
        }));
    }else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function editEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 204){
        $('#editModal').modal('hide');
        retrieveEventsAdmin();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function createEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 201){
        $('#crtEvntFrm')[0].reset();
        retrieveEventsAdmin();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function requestFail(jqxhr, textStatus, errorThrown){
    alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
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
    resetFormCSS(loginForm);
}

function resetFormCSS(form){
    $(form[0]).parent('div').removeClass('has-error');
    $(form[1]).parent('div').removeClass('has-error');
}