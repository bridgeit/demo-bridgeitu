window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local?';
window.loggedIn;
// Token obtained automatically to view events in the index.html screen without a login
window.tokenAnonymousAccess;
// Token obtained from a login
window.tokenLoggedIn;

// Common login logic for both index.html and admin.html
function initLoginModalSubmit(){
    $('#loginModalForm').submit(function( event ) {
        event.preventDefault();
        /* form tag only necessary to pass form into validate method (could also serialize the form if necessary)
        *  In this case, trying to generically create url from a form's input fields
        */
        var form = this;
        if( validate(form)){
            $.getJSON(window.authService + 'username=' + form[0].value + '&password=' + form[1].value, function(data){
                window.tokenLoggedIn = data.access_token;
                window.loggedIn = true;
            })
            .fail(bridgeitULoginFail)
            .done(retrieveDone);

            $('#loginModal').modal('hide');
            $('#loginIcon').html('Welcome: ' + form[0].value);
            resetLoginForm();
        }
    });
}

function retrieveEvents(){
    $.getJSON(window.documentService + window.tokenAnonymousAccess , function(data){
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
    if(window.loggedIn){
        alert('Purchase Flow to Take Place Soon!');
    }else{
        $('#loginModal').modal('show');
    }
}

function retrieveEventsAdmin(){
    $.getJSON(window.documentService + window.tokenLoggedIn , function(data){
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
            url : window.documentService + '/' + documentId + window.tokenLoggedIn,
            type: 'DELETE',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        })
        .fail(bridgeitUFail)
        .done(deleteDone);
    }
}

function launchEditEvent(documentId){
    $.getJSON( window.documentService + '/' + documentId + window.tokenLoggedIn + '&results=one', function(data){
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
                    url : window.documentService + '/' + documentId + window.tokenLoggedIn,
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
        alert("Invalid Credentials");
        return;
    }
    alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
}

function bridgeitUFailRetrieve404(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 404){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        return;
    }
    alert("There was an error connecting to the BridgeIt service: "+ jqxhr.status + " - please try again later.");
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