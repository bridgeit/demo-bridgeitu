window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
// Token obtained automatically to view events in the index.html screen without a login
window.ANONYMOUS_ACCESS_TOKEN;
// Token obtained from a login
window.ACCESS_TOKEN;

function retrieveEvents(){
    $.getJSON(window.documentService + window.ANONYMOUS_ACCESS_TOKEN , function(data){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html("");
        $.each(data, function(i, obj) {
            evntLstDiv.append('<a href="#" class="list-group-item">' + obj.name + '</a>');
        });
    })
    .fail(bridgeitUFailRetrieve404)
    .done(retrieveDone);
}

function retrieveEventsAdmin(){
    $.getJSON(window.documentService + window.ACCESS_TOKEN , function(data){
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
            url : window.documentService + '/' + documentId + window.ACCESS_TOKEN,
            type: 'DELETE',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        })
        .fail(bridgeitUFail)
        .done(deleteDone);
    }
}

function launchEditEvent(documentId){
    $.getJSON( window.documentService + '/' + documentId + window.ACCESS_TOKEN + '&results=one', function(data){
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
                    url : window.documentService + '/' + documentId + window.ACCESS_TOKEN,
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
    if( form[0].value == ''){
        alert("Don't forget to add an event name...");
        return false;
    }
    if( form[1].value == ''){
        alert("Don't forget to add event details...");
        return false;
    }
    return true;
}