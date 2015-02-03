window.noTicketOnCampusNotificationFlow = 'noTicketOnCampusNotification';
window.ticketHolderNotificationFlow = 'ticketHolderNotification';
window.locationNotificationFlow = 'locationNotification';
window.andNotificationFlow = 'notifAnd';
window.orNotificationFlow = 'notifOr';
window.studentNotificationFlow = 'studentNotification';
window.anonAndStudentNotificationFlow = 'anonAndStudentNotification';
window.customNotificationFlow = 'customNotification';

bridgeit.goBridgeItURL = "admin.html";

window.adminModel = {

    retrieveEventsAdmin: function(){
        if(bridgeit.io.auth.isLoggedIn()){
            bridgeit.io.documents.findDocuments({
                query: {
                    details:{$exists: true}
                }
            })
            .then(adminModel.adminRetrieveEventsDone)['catch'](view.retrieveEventsFail);
        }else{
            adminController.adminLogout('expired');
        }
    },

    adminRetrieveEventsDone: function(data){
        var $evntLstDiv = $('#evntLst');
        $evntLstDiv.html('');
        var $targetEvent = $('#targetEvent');
        $targetEvent.find('option:gt(0)').remove();
        $.each(data, function(i, obj) {
            // Using Document Service to store users and notifications this will skip them
            if(obj.details !== undefined){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                model.events[obj._id] = obj.name;
                $evntLstDiv.append(
                '<div class="list-group-item">'+
                    '<a title="Send Event Notification" data-toggle="modal" ' +
                        'href="#evntNtfctnModal" ' +
                        'onclick="adminController.notifyEvent(\'' + obj._id + '\');">' + 
                        '<span style="margin-right: 10px;" class="glyphicon glyphicon-bullhorn"></span>' +
                    '</a>' + obj.name + 
                    '<a title="Delete Event" ' +
                        'onclick="adminController.deleteEvent(\'' + obj._id + '\');" ' +
                        'class="pull-right"><span style="margin-left: 10px;" ' +
                        'class="glyphicon glyphicon-remove-circle"></span>' + 
                    '</a>' +
                    '<a title="Edit Event" data-toggle="modal" href="#editModal" ' +
                        'onclick="adminController.editEvent(\'' + obj._id + '\');" ' +
                        'class="pull-right"><span class="glyphicon glyphicon-edit"></span>' +
                    '</a></div>');
                $('<option>').val(obj.name).text(obj.name).appendTo($targetEvent);
                $('<option>').val('!' + obj.name).text('Not - ' + obj.name).appendTo($targetEvent);
            }
        });
    },

    createEvent: function(postData, name){
        bridgeit.io.documents.createDocument({
            document: postData
        }).then(adminModel.createEventDone(name))['catch'](view.requestServiceFail('document service'));
    },

    createEventDone: function(name){
        return function(data){
            view.successAlert('<strong>' + name + '</strong> Event Created');
            adminView.resetCreateEventForm();
            adminModel.retrieveEventsAdmin();
            adminController.notifyCRUDEvent();
        };
    },

    deleteEvent: function(documentId){
        bridgeit.io.documents.deleteDocument({
            id: documentId
        }).then(adminModel.deleteDone(documentId))['catch'](view.requestServiceFail('document service'));
    },

    deleteDone: function(documentId){
        return function(data){
            view.successAlert('<strong>' + model.events[documentId] + '</strong> Event Deleted');
            adminModel.retrieveEventsAdmin();
            adminController.notifyCRUDEvent();
        };
    },

    editEvent: function(putData, documentId){
        bridgeit.io.documents.updateDocument({
            id: documentId,
            document: putData
        }).then(adminModel.editEventDone(documentId))['catch'](view.requestServiceFail('document service'));
    },

    editEventDone: function(documentId){
        return function(data){
            view.successAlert('<strong>' + model.events[documentId] + '</strong> Event Edited');
            adminView.hideEditModal();
            adminModel.retrieveEventsAdmin();
            adminController.notifyCRUDEvent();
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

    adminPermissionFail: function(error){
        view.loginErrorAlert('Invalid Login - you are not an administrator');
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

    notifyFail: function(error){
        view.errorAlert('<strong>Error: </strong> to send event notifications: status <strong>' + error + '</strong>');
    },

    notifyDone: function(data){
        if(data && data.pushSubject){
            view.infoAlert('<strong>' + data.pushSubject + '</strong> push group notified.');
        }else{
            view.infoAlert('<strong>Custom</strong> notification sent.');
        }
        view.resetForm('oldEvntNtfctnFrm');
        adminView.hideEventNotificationModal();
    }

};

window.adminController = {

    flowLookupObject: {1 : window.anonAndStudentNotificationFlow,
                       2 : window.studentNotificationFlow,
                       3 : window.noTicketOnCampusNotificationFlow,
                       4 : window.ticketHolderNotificationFlow,
                       5 : 'locationResidence',
                       6 : 'locationPerformingArtsCenter',
                       7 : 'locationStadium',
                       8 : 'locationOnCampus',
                       9 : 'locationOffCampus'},

    enablePush: function(){
        bridgeit.usePushService('http://' + bridgeit.io.pushURL, null, {
            auth:{
                access_token: bridgeit.io.auth.getLastAccessToken()
            },
            account: 'bridget_u', 
            realm: 'bridgeit.u'
        });
    },

    initAdminPage: function() {
        /*
        bridgeit.useServices({
                realm:"bridgeit.u",
                serviceBase:"http://dev.bridgeit.io"});
        */
        $('#crtEvntFrm').submit(adminController.createEventSubmit);
        $('#evntNtfctnFrm').submit(adminController.notifySubmit);
        $('#cstmNtfctnFrm').submit(adminController.customNotifySubmit);
        $('#loginModalForm').submit(controller.loginSubmit('admin'));
        $('#logoutNavbar').click(controller.logoutClick('admin'));
        // No Admin token

        var token = bridgeit.io.auth.getLastAccessToken();
        if(!token ){
            view.showLoginNavbar();
            adminView.forceLogin();
        // Valid Admin token - logged in
        } else if(bridgeit.io.auth.isLoggedIn()){
            adminController.adminLoggedIn();
            // TODO: If admin needs to receive push updates, uncomment line below and implement
            //controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
            bridgeit.io.configureHosts();
            adminController.enablePush();
        // Invalid Admin token - log out
        }else{
            adminController.adminLogout('expired');
        }
    },

    adminLoginDone: function(data){
        // Check that user has admin permissions
        bridgeit.io.auth.checkUserPermissions({
            permissions: 'u.admin'
        }).then(adminController.adminPermissionDone)['catch'](adminView.adminPermissionFail);
    },

    adminPermissionDone: function(){
        sessionStorage.setItem('bridgeitUUsername', $('#userName').val());
        // TODO: If admin needs to receive push updates, uncomment line below and implement
        //controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
        adminController.enablePush();
        adminController.adminLoggedIn();
    },

    adminLoggedIn: function(){
        view.loggedIn(sessionStorage.bridgeitUUsername);
        adminView.loggedIn();
        adminModel.retrieveEventsAdmin();
    },

    createEventSubmit: function(event){
        event.preventDefault();
        if( bridgeit.io.auth.isLoggedIn()){
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
        if( bridgeit.io.auth.isLoggedIn()){
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
                postData['pushSubject'] = pushSubject;
                postData['expiry'] = (new Date()).getTime() + (5 * 1000);
                postData['targetRole'] = form.targetRole.value;
                postData['targetEvent'] = targetEvent;
                postData['targetLctn'] = form.targetLctn.value;

                bridgeit.io.code.executeFlow({
                    flow: flow,
                    data: postData
                }).then(adminView.notifyDone)['catch'](adminView.notifyFail);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    customNotifySubmit: function(event){
        event.preventDefault();
        if(bridgeit.io.auth.isLoggedIn()){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            var pushSubject = form.cstmNtfctnText.value;

            if(util.validate(form)){
                var postData = {};
                postData['pushSubject'] = pushSubject;
                postData['expiry'] = (new Date()).getTime() + (5 * 1000);
                postData['targetEvent'] = 'Custom Notification';

                bridgeit.io.code.executeFlow({
                        flow: window.customNotificationFlow,
                        data: postData
                    }).then(adminView.notifyDone)['catch'](adminView.notifyFail);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    notifyEvent: function (documentId){
        $('#ntfctnTextLabel').html(model.events[documentId]);
        $('#oldEvntNtfctnFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            if(bridgeit.io.auth.isLoggedIn()){
                /* form element used to generically validate form elements (could also serialize the form if necessary)
                *  Also using form to create json post data from form's elements
                */
                var form = this;
                var eventName = model.events[documentId];
                var pushSubject = form.oldNtfctnText.value;

                if(util.validate(form)){
                    var flow = adminController.flowLookupObject[form.ntfctnSlct.value];
                    var postData = {};
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
                    bridgeit.io.code.executeFlow({
                        flow: flow,
                        data: postData
                    }).then(adminView.notifyDone)['catch'](adminView.notifyFail);
                }
            }else{
                adminController.adminLogout('expired');
            }
        }));
    },

    notifyCRUDEvent: function(){
        var postData = {};
        postData['pushSubject'] = 'Event List Modified';
        postData['expiry'] = (new Date()).getTime() + (5 * 1000);
        //bridgeit.pushQuery('{"$or":[{"_id":"anonymous"},{"type":"u.student"}]}','{"_id": true}');

        bridgeit.io.code.executeFlow({
            flow: window.anonAndStudentNotificationFlow,
            data: postData
        }).then(adminView.notifyDone)['catch'](adminView.notifyFail);
    },

    deleteEvent: function(documentId){
        if(bridgeit.io.auth.isLoggedIn()){
            if (confirm("Delete Event?")){
                adminModel.deleteEvent(documentId);
            }
        }else{
            adminController.adminLogout('expired');
        }
    },

    editEvent: function(documentId){
        if(bridgeit.io.auth.isLoggedIn()){
            bridgeit.io.documents.getDocument({
                id: documentId
            }).then(adminController.editGetEventDone)['catch'](view.requestServiceFail('document service'));
        }else{
            adminController.adminLogout('expired');
        }
    },

    editGetEventDone: function(data){
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
    },

    adminLogout: function(expired){
        bridgeit.io.auth.disconnect();
        sessionStorage.removeItem('bridgeitUUsername');
        localStorage.removeItem('bridgeitUUsername');
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
