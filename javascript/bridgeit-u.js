window.bridgeitAccountName = 'bridget_u';
window.bridgeitRealmName = 'bridgeit.u';
window.bridgeitHost = 'dev.bridgeit.io';

bridgeit.goBridgeItURL = "index.html";

window.model = {

    // Used to store event id/name to easily reference the name String to avoid encoding/decoding the String in javascript
    events: {},

    notifications: {},

    handlePush: function(){
        console.log('BridgeIt U Push Callback');
        homeModel.retrieveEvents();
        // Push called when student Changes Location, retrieve updated user record
        homeModel.updateStudent();
        model.getNotifications(localStorage.getItem('bridgeitUUsername'), function (data) {
            data.forEach(model.displayNotification);
        });
    },

    getNotifications: function(username, callback)  {
        var now = new Date();
        bridgeit.services.documents.findDocuments({
            query: {
                type: "notification",
                expiry: { $gt: now.getTime() - (60 * 1000) }
            }
        }).then(callback)['catch'](function(){
            console.log('no notifications found');
        });
    },

    displayNotification: function(item, index, array)  {
        //could also clean up based on expiry
        if (model.notifications[item.timestamp])  {
            return;
        }
        for (var key in model.notifications) {
            if (model.notifications.hasOwnProperty(key) ){
                // Avoid duplicate messages
                if(model.notifications[key].pushSubject === item.pushSubject){
                    return;
                }
            }
        }
        model.notifications[item.timestamp] = item;
        view.infoAlert('<strong>' + item.pushSubject + '</strong>');
    }

};

window.view = {

    loggedIn: function(username){
        $('#welcome').html('Welcome: ' + username);
        view.showLogoutNavbar();
        view.resetLoginBody();
        $('#loginModal').modal('hide');
        // clear previous user notices
        view.removeNoticesInfoClass();
        $('#alertDiv').html('');
    },

    loginFail: function(){
       view.loginErrorAlert('Invalid Credentials');
    },

    showLoginNavbar: function(){
        $('#loginNavbar').show();
        $('#logoutNavbar').hide();
    },

    showLogoutNavbar: function(){
        $('#loginNavbar').hide();
        $('#logoutNavbar').show();
    },

    resetLoginBody: function(){
        view.resetForm('loginModalForm');
        view.clearAlertLoginDiv();
    },

    clearWelcomeSpan: function(){
        $('#welcome').html('');
    },

    clearAlertLoginDiv: function(){
        $('#alertLoginDiv').html('');
    },

    clearEventList: function(){
        $('#evntLst').html('');
    },

    resetForm: function(formId){
        var formToReset = document.getElementById(formId);
        formToReset.reset();
        view.resetFormCSS(formToReset);
    },

    resetFormCSS: function(form){
        for(var i=0; i<form.length; i++){
            if(form[i].tagName === 'INPUT' || form[i].tagName === 'TEXTAREA'){
                $(form[i]).parent('div').removeClass('has-error');
            }
        }
    },

    addNoticesInfoClass: function(){
        $('#noticesPanel').addClass('panel-info');
    },

    removeNoticesInfoClass: function(){
        $('#noticesPanel').removeClass('panel-info');
    },

    retrieveEventsFail: function(){
        view.clearEventList();
    },

    requestServiceFail: function(service){
        return function(error){
            view.errorAlert('<strong>Error connecting to ' + service + '</strong>: error <strong>' + error.message + '</strong> - please try again later.');
        }
    },

    requestFail: function(error){
        view.errorAlert('<strong>Error connecting to the service</strong>: Error: <strong>' + error.message + '</strong> - please try again later.');
    },

    serviceRequestUnexpectedStatusAlert: function(source, error){
        view.warningAlert('<strong>' + source + ' Warning</strong>: Unexpected error <strong>' + error + '</strong> returned.');
    },

    infoAlert: function(message){
        $('#alertDiv').prepend(
            $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
        );
        view.addNoticesInfoClass();
        // Popup for student page so student doesn't have to scroll to notices panel
        $('#noticeDiv').html('<div class="alert alert-info"><small>' + message + '</small></div>');
        $('#noticeModal').modal('show');
    },

    warningAlert: function(message){
        $('#alertDiv').prepend(
            $('<div class="alert alert-warning fade in"><button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
        );
        view.addNoticesInfoClass();
    },

    successAlert: function(message){
        $('#alertDiv').prepend(
            $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
        );
        view.addNoticesInfoClass();
    },

    errorAlert: function(message){
        $('#alertDiv').prepend(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
        );
        view.addNoticesInfoClass();
    },

    loginErrorAlert: function(message){
        $('#alertLoginDiv').html(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + message + '</div>').hide().fadeIn('fast')
        );
    },

    registerErrorAlert: function (message){
        $('#alertRegisterDiv').html(
            $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + message + '</div>').hide().fadeIn('fast')
        );
    }

};

window.controller = {

    loginSubmit: function(isAdmin){
        return function(event){
            bridgeit.services.startTransaction();
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create post data from form's elements
            */
            var form = this;
            if(util.validate(form)){
                // Avoid getting a token from anonymous credentials
                if((isAdmin === undefined) && (form.userName.value === 'anonymous' && form.passWord.value === 'anonymous')){
                    view.loginErrorAlert('Invalid Credentials');
                    return;
                }
                var postData = {'username' : form.userName.value,
                                'password' : form.passWord.value};

                bridgeit.services.auth.connect({
                    username: form.userName.value,
                    password: form.passWord.value,
                    account: window.bridgeitAccountName,
                    realm: window.bridgeitRealmName,
                    host: window.bridgeitHost,
                    usePushService: true
                })
                .then(isAdmin ? adminController.adminLoginDone : homeController.studentLoginDone)
                .catch(view.loginFail);
            }else{
                //Form fields are invalid, remove any alerts related to authentication
                view.clearAlertLoginDiv();
            }
        };
    },

    logoutClick: function(isAdmin){
        return function(event){
            event.preventDefault();
            if(isAdmin){
                adminController.adminLogout();
            }else{
                homeController.studentLogout();
            }
            bridgeit.services.endTransaction();
        };
    },

    registerPushUsernameGroup: function(){
        //bridgeit.usePushService(window.pushUri, null, {auth:{access_token: bridgeit.services.auth.getLastAccessToken()},account: 'bridget_u', realm: 'bridgeit.u'});
        if (isAnonymous()) {
            bridgeit.services.push.addPushListener({
                group: 'anonymous',
                callback: 'homeModel.handleAnonPush'
            });
        } else {
             bridgeit.services.push.addPushListener({
                group: localStorage.getItem('bridgeitUUsername'),
                callback: 'model.handlePush'
            });
        }
    }

};

window.util = {

    validate: function(form){
        /* Create and Edit forms have name and details fields.  Instead of
         * referencing by id, validate form children to avoid duplicate id's.
         */
        var formValid = true;
        for(var i=0; i<form.length; i++){
            if( (form[i].tagName === 'INPUT' || form[i].tagName === 'TEXTAREA')
                    && form[i].value === ''){
                $(form[i]).parent('div').addClass('has-error');
                formValid = false;
            }else{
                $(form[i]).parent('div').removeClass('has-error');
            }
        }
        return formValid;
    },

    confirmPassword: function(password, confirm){
        if(password === confirm){
            return true;
        }else{
            view.registerErrorAlert('Passwords do not match.');
            return false;
        }
    },

    tokenValid: function (token, expires, type){
        return (token !== undefined) && (parseInt(expires) > new Date().getTime());
    }

};