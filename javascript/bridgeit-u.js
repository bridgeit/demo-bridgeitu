window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local?';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
// Token obtained automatically to view events in the index.html screen without a login
window.tokenAnonymousAccess;
// Token obtained from a login
window.tokenLoggedIn;

// Common login logic for both index.html and admin.html
function initLoginSubmit(admin){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, generically creating url from a form's input fields
        */
        var form = this;
        if(validate(form)){
            $.getJSON(window.authService + 'username=' + form[0].value + '&password=' + form[1].value, function(data){
                window.tokenLoggedIn = data.access_token;
                if(admin){
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
                    // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
                    // Login is required to retrieve a token so purchases can be made
                    uiLoggedIn();
                }
            })
            .fail(bridgeitULoginFail)
            .done(retrieveDone);
        }
    });
}

function uiLoggedIn(){
    $('#loginIcon').html('Welcome: ' + $('#userName').val());
    resetLoginForm();
    $('#loginModal').modal('hide');
}

function retrieveEvents(){
    $.getJSON(window.documentService + '?access_token=' + window.tokenAnonymousAccess , function(data){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            evntLstDiv.append('<a href="#" class="list-group-item" onclick="purchase(\'' + obj._id + '\');">' + obj.name + '</a>');
        });
    })
    .fail(bridgeitUFailRetrieve404)
    .done(retrieveDone);
}

function purchase(documentId){
    if(window.tokenLoggedIn){
        alert('Purchase Flow to Take Place Soon!');
    }else{
        $('#loginModal').modal('show');
    }
}

function retrieveEventsAdmin(){
    $.getJSON(window.documentService + '?access_token=' + window.tokenLoggedIn , function(data){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            evntLstDiv.append('<div class="list-group-item">' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" style="float: right;"><span style="padding: 0 10px;"  class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="launchEditEvent(\'' + obj._id + '\');" style="float: right;"><span class="glyphicon glyphicon-edit"></span></a></div>');
        });
    })
    .fail(bridgeitUFailRetrieve404)
    .done(retrieveDone);
}

function deleteEvent(documentId){
    if (confirm("Delete Event?")){
        $.ajax({
            url : window.documentService + '/' + documentId +  '?access_token=' + window.tokenLoggedIn,
            type: 'DELETE',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        })
        .fail(bridgeitUFail)
        .done(deleteDone);
    }
}

function launchEditEvent(documentId){
    $.getJSON( window.documentService + '/' + documentId + '?access_token=' + window.tokenLoggedIn + '&results=one', function(data){
        document.getElementById('edtName').value = data.name;
        document.getElementById('edtDetails').value = data.details;
        $('#edtEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();

            var putData = {};
            /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
            *  In this case, trying to generically create json objects from a form's input fields
            */
            var form = this;

            if(validate(form)){
                putData['name'] = form[0].value;
                putData['details'] = form[1].value;
                $.ajax({
                    url : window.documentService + '/' + documentId + '?access_token=' + window.tokenLoggedIn,
                    type: 'PUT',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(putData)
                })
                .fail(bridgeitUFail)
                .done(editDone);
            }
        }));
    })
    .fail(bridgeitUFail)
    .done(retrieveDone);
}

function bridgeitUFail(jqxhr, textStatus, errorThrown){
    alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
}

function bridgeitULoginFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        alert("Invalid Credentials");
    }else{
        alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
    }
}

function bridgeitUFailRetrieve404(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        // 404 means the list is empty
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
    }else{
        alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
    }
}

function retrieveDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){

    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
    }
}

function createDone(data, textStatus, jqxhr){
    if(jqxhr.status == 201){
        $('#crtEvntFrm')[0].reset();
        retrieveEventsAdmin();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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

function editDone(data, textStatus, jqxhr){
    if(jqxhr.status == 204){
        $('#editModal').modal('hide');
        retrieveEventsAdmin();
    }
    else{
        alert("Unexpected status " + jqxhr.status + " returned from BridgeIt service.");
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

function resetFormCSS(form){
    $(form[0]).parent('div').removeClass('has-error');
    $(form[1]).parent('div').removeClass('has-error');
}

function resetLoginForm(){
    var loginForm = document.getElementById('loginModalForm');
    loginForm.reset();
    resetFormCSS(loginForm);
}