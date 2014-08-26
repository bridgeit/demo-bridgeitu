window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
window.anonymousNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/anonymousNotification';
window.studentNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/studentNotification';
window.noTicketOnCampusNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/noTicketOnCampusNotification';
window.ticketHolderNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/ticketHolderNotification';
window.locationNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/locationNotification';
window.andNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/notifAnd';
window.orNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/notifOr';

window.adminModel = {

    retrieveEventsAdmin: function(){
        if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            $.getJSON(window.documentService + '?access_token=' + sessionStorage.bridgeitUToken)
            .fail(view.retrieveEventsFail)
            .done(adminModel.adminRetrieveEventsDone);
        }else{
            adminController.adminLogout('expired');
        }
    },

    adminRetrieveEventsDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            var $evntLstDiv = $('#evntLst');
            $evntLstDiv.html('');
            var $targetEvent = $('#targetEvent');
            $targetEvent.find('option:gt(0)').remove();
            $.each(data, function(i, obj) {
                // Using Document Service to store users and notifications this will skip them
                if(obj.details !== undefined){
                    // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                    model.events[obj._id] = obj.name;
                    $evntLstDiv.append('<div class="list-group-item"><a title="Send Event Notification" data-toggle="modal" href="#evntNtfctnModal" onclick="adminController.notifyEvent(\'' + obj._id + '\');"><span style="margin-right: 10px;" class="glyphicon glyphicon-bullhorn"></span></a>' + obj.name + '<a title="Delete Event" onclick="adminController.deleteEvent(\'' + obj._id + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="adminController.editEvent(\'' + obj._id + '\');" class="pull-right"><span class="glyphicon glyphicon-edit"></span></a></div>');
                    $('<option>').val(obj.name).text(obj.name).appendTo($targetEvent);
                    $('<option>').val('!' + obj.name).text('Not - ' + obj.name).appendTo($targetEvent);
                }
            });
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
        }
    },

    createEvent: function(postData, name){
        $.ajax({
            url : window.documentService + '?access_token=' + sessionStorage.bridgeitUToken,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(view.requestServiceFail('document service'))
        .done(adminModel.createEventDone(name));
    },

    createEventDone: function(name){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 201){
                view.successAlert('<strong>' + name + '</strong> Event Created');
                adminView.resetCreateEventForm();
                adminModel.retrieveEventsAdmin();
                adminController.notifyCRUDEvent();
            }else{
                view.serviceRequestUnexpectedStatusAlert('Create Event', jqxhr.status);
            }
        };
    },

    deleteEvent: function(documentId){
        $.ajax({
            url : window.documentService + '/' + documentId +  '?access_token=' + sessionStorage.bridgeitUToken,
            type: 'DELETE',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        })
        .fail(view.requestServiceFail('document service'))
        .done(adminModel.deleteDone(documentId));
    },

    deleteDone: function(documentId){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 204){
                view.successAlert('<strong>' + model.events[documentId] + '</strong> Event Deleted');
                adminModel.retrieveEventsAdmin();
                adminController.notifyCRUDEvent();
            }else{
                view.serviceRequestUnexpectedStatusAlert('Delete Event', jqxhr.status);
            }
        };
    },

    editEvent: function(putData, documentId){
        $.ajax({
            url : window.documentService + '/' + documentId + '?access_token=' + sessionStorage.bridgeitUToken,
            type: 'PUT',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(putData)
        })
        .fail(view.requestServiceFail('document service'))
        .done(adminModel.editEventDone(documentId));
    },

    editEventDone: function(documentId){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 201){
                view.successAlert('<strong>' + model.events[documentId] + '</strong> Event Edited');
                adminView.hideEditModal();
                adminModel.retrieveEventsAdmin();
                adminController.notifyCRUDEvent();
            }else{
                view.serviceRequestUnexpectedStatusAlert('Edit Event', jqxhr.status);
            }
        };
    }
};

window.adminView = {

    changeAndOrLabels: function(select){
        if(select.value === 'andFilter'){
            $('#holdsLabel').html('And');
            $('#locationLabel').html('And');
        }else{
            $('#holdsLabel').html('Or');
            $('#locationLabel').html('Or');
        }
    },

    forceLogin: function(){
        // Force login by showing modal login and initially hide close and cancel buttons
        $('#loginModal').modal('show');
        $('#loginCloseBttn').hide();
        $('#loginCancelBttn').hide();
    },

    loggedIn: function(){
        // Admin screen has login cancel buttons hidden to force login.  After logging in as admin show cancel buttons.
        $('#loginCloseBttn').show();
        $('#loginCancelBttn').show();
        adminView.resetCreateEventForm();
    },

    adminPermissionFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 403){
            // 403 permissionNotGranted
            view.loginErrorAlert('Invalid Login - you are not an administrator');
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
    },

    hideEditModal: function(){
        $('#editModal').modal('hide');
    },

    hideEventNotificationModal: function(){
        $('#evntNtfctnModal').modal('hide');
    },

    populateEditFields: function(data){
        document.getElementById('edtName').value = data.name;
        document.getElementById('edtDetails').value = data.details;
    },

    resetCreateEventForm: function(){
        $('#crtEvntFrm')[0].reset();
    },

    notifyFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 401){
            // 401 unauthorized
            view.errorAlert('<strong>Unauthorized</strong> to send event notifications: status <strong>' + jqxhr.status + '</strong>');
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
    },

    notifyDone: function(data, textStatus, jqxhr){
        if(jqxhr.status === 200){
            if(data.pushSubject){
                view.infoAlert('<strong>' + data.pushSubject + '</strong> push group notified.');
            }else{
                view.infoAlert('<strong>Custom</strong> notification sent.');
            }
            view.resetForm('oldEvntNtfctnFrm');
            adminView.hideEventNotificationModal();
        }else{
            view.serviceRequestUnexpectedStatusAlert('Notify', jqxhr.status);
        }
    }

};

window.adminController = {

    flowLookupObject: {1 : window.anonymousNotificationFlow,
                       2 : window.studentNotificationFlow,
                       3 : window.noTicketOnCampusNotificationFlow,
                       4 : window.ticketHolderNotificationFlow,
                       5 : 'locationResidence',
                       6 : 'locationPerformingArtsCenter',
                       7 : 'locationStadium',
                       8 : 'locationOnCampus',
                       9 : 'locationOffCampus'},

    initAdminPage: function() {
        bridgeit.useServices({
                realm:"bridgeit.u",
                serviceBase:"http://dev.bridgeit.io"});

        $('#crtEvntFrm').submit(adminController.createEventSubmit);
        $('#evntNtfctnFrm').submit(adminController.notifySubmit);
        $('#loginModalForm').submit(controller.loginSubmit('admin'));
        $('#logoutNavbar').click(controller.logoutClick('admin'));
        // No Admin token
        if(sessionStorage.bridgeitUToken === undefined){
            view.showLoginNavbar();
            adminView.forceLogin();
        // Valid Admin token - logged in
        } else if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            adminController.adminLoggedIn();
            // TODO: If admin needs to receive push updates, uncomment line below and implement
            //controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
        // Invalid Admin token - log out
        }else{
            adminController.adminLogout('expired');
        }
    },

    adminLoginDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
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
            .fail(adminView.adminPermissionFail)
            .done(adminController.adminPermissionDone(data.access_token, data.expires_in));
        }else{
            view.serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
        }
    },

    adminPermissionDone: function(token, expires_in){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 200){
                sessionStorage.bridgeitUToken = token;
                sessionStorage.bridgeitUTokenExpires = expires_in;
                sessionStorage.bridgeitUUsername = $('#userName').val();
                // TODO: If admin needs to receive push updates, uncomment line below and implement
                //controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
                adminController.adminLoggedIn();
            }else{
                view.serviceRequestUnexpectedStatusAlert('Permission Check', jqxhr.status);
            }
        }
    },

    adminLoggedIn: function(){
        view.loggedIn(sessionStorage.bridgeitUUsername);
        adminView.loggedIn();
        adminModel.retrieveEventsAdmin();
    },

    createEventSubmit: function(event){
        event.preventDefault();
        if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Post data from form's elements
            */
            var form = this;
            if(util.validate(form)){
                var postData = {};
                postData['name'] = form.crtname.value;
                postData['details'] = form.crtdetails.value;
                adminModel.createEvent(postData, form.crtname.value);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    notifySubmit: function(event){
        event.preventDefault();
        if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            var pushSubject = form.ntfctnText.value;
            var targetEvent = form.targetEvent.value;

            if(util.validate(form)){
                var flow = null;
                if(form.andOr.value === 'andFilter'){
                    flow = window.andNotificationFlow;
                }else{
                    flow = window.orNotificationFlow;
                }
                var postData = {};
                postData['access_token'] = sessionStorage.bridgeitUToken;
                postData['pushSubject'] = pushSubject;
                postData['expiry'] = (new Date()).getTime() + (5 * 1000);
                postData['targetRole'] = form.targetRole.value;
                postData['targetEvent'] = targetEvent;
                postData['targetLctn'] = form.targetLctn.value;

                $.ajax({
                    url : flow,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(adminView.notifyFail)
                .done(adminView.notifyDone);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    notifyEvent: function (documentId){
        $('#ntfctnTextLabel').html(model.events[documentId]);
        $('#oldEvntNtfctnFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
                /* form element used to generically validate form elements (could also serialize the form if necessary)
                *  Also using form to create json post data from form's elements
                */
                var form = this;
                var eventName = model.events[documentId];
                var pushSubject = form.oldNtfctnText.value;

                if(util.validate(form)){
                    var flow = adminController.flowLookupObject[form.ntfctnSlct.value];
                    var postData = {};
                    postData['access_token'] = sessionStorage.bridgeitUToken;
                    postData['eventName'] = eventName;
                    postData['pushSubject'] = pushSubject;
                    postData['expiry'] = (new Date()).getTime() + (5 * 1000);
                    // Single flow used for locations - post location property as parameter for locationNotificationFlow
                    if(form.ntfctnSlct.value >= 5 && form.ntfctnSlct.value <=9){
                        flow = window.locationNotificationFlow;
                        if(form.ntfctnSlct.value == 5){
                            postData['location'] = 'Residence';
                        } else if(form.ntfctnSlct.value == 6){
                            postData['location'] = 'Performing Arts Center';
                        } else if(form.ntfctnSlct.value == 7){
                            postData['location'] = 'Stadium';
                        } else if(form.ntfctnSlct.value == 8){
                            postData['location'] = 'On Campus';
                        } else if(form.ntfctnSlct.value == 9){
                            postData['location'] = 'Off Campus';
                        }
                    }
                    $.ajax({
                        url : flow,
                        type: 'POST',
                        dataType : 'json',
                        contentType: 'application/json; charset=utf-8',
                        data : JSON.stringify(postData)
                    })
                    .fail(adminView.notifyFail)
                    .done(adminView.notifyDone);
                }
            }else{
                adminController.adminLogout('expired');
            }
        }));
    },

    notifyCRUDEvent: function(){
        var postData = {};
        postData['access_token'] = sessionStorage.bridgeitUToken;
        postData['pushSubject'] = 'Event List Modified';
        $.ajax({
            url : window.anonymousNotificationFlow,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(adminView.notifyFail)
        .done(adminView.notifyDone);
    },

    deleteEvent: function(documentId){
        if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            if (confirm("Delete Event?")){
                adminModel.deleteEvent(documentId);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    editEvent: function(documentId){
        if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            $.getJSON( window.documentService + '/' + documentId + '?access_token=' + sessionStorage.bridgeitUToken + '&results=one')
            .fail(view.requestServiceFail('document service'))
            .done(adminController.editGetEventDone);
        }else{
            adminController.adminLogout('expired');
        }
    },

    editGetEventDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            adminView.populateEditFields(data);
            $('#edtEvntFrm').off('submit').on('submit',(function( event ) {
                event.preventDefault();
                /* form element used to generically validate form elements (could also serialize the form if necessary)
                *  Also using form to create json Put data from form's elements
                */
                var form = this;
                if(util.validate(form)){
                    var putData = {};
                    putData['name'] = form.edtName.value;
                    putData['details'] = form.edtDetails.value;
                    adminModel.editEvent(putData,data._id);
                }
            }));
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
        }
    },

    adminLogout: function(expired){
        sessionStorage.removeItem('bridgeitUToken');
        sessionStorage.removeItem('bridgeitUTokenExpires');
        sessionStorage.removeItem('bridgeitUUsername');
        view.showLoginNavbar();
        view.clearWelcomeSpan();
        adminView.hideEditModal();
        adminView.hideEventNotificationModal();
        adminView.forceLogin();
        if(expired){
            view.loginErrorAlert('Session Expired');
        }
    }

};