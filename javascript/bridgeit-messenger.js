window.pushUri = 'http://dev.bridgeit.io/push';
window.codeService = 'http://dev.bridgeit.io/coden/bridget_u/realms/bridgeit.u/nodes/';
window.pushGroupNewMessage = 'bridgeitCloudMessenger_newMessage';
window.pushGroupCountsUpdated = 'bridgeitCloudMessenger_countsUpdated';
window.bridgeitMessengerCountDoc = 'bridgeitMessengerCountDoc';
window.bridgeitMessengerMessageDoc = 'bridgeitMessengerMessage';
window.bridgeitAccountName = 'bridget_u';
window.bridgeitRealmName = 'bridgeit.u';
window.bridgeitHost = 'dev.bridgeit.io';

bridgeit.goBridgeItURL = "cloud-messenger.html";


window.model = {

   fetchMessageCounts: function(success, fail){
   		bridgeit.io.documents.getDocument({
   			id: window.bridgeitMessengerCountDoc
   		}).then(success).catch(fail);
	}

};

window.view = {

	loggedIn: function(username){
		$('#welcome').html('Welcome: ' + username);
		view.showLogoutNavbar();
		view.resetLoginBody();
		$('#loginModal').modal('hide');
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

	requestServiceFail: function(service){
		return function(jqxhr, textStatus, errorThrown){
			view.errorAlert('<strong>Error connecting to ' + service + '</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.');
		}
	},

	requestFail: function(jqxhr, textStatus, errorThrown){
		view.errorAlert('<strong>Error connecting to the service</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.');
	},

	serviceRequestUnexpectedStatusAlert: function(source, status){
		view.warningAlert('<strong>' + source + ' Warning</strong>: Unexpected status <strong>' + status + '</strong> returned.');
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
	},

	infoAlert: function(message){
        $('#alertDiv').prepend(
            $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
        );
        view.addNoticesInfoClass();
        // Popup for user page so user doesn't have to scroll to notices panel
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

    addNoticesInfoClass: function(){
        $('#noticesPanel').addClass('panel-info');
    },

};

window.controller = {

	loginSubmit: function(isAdmin){
		return function(event){
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

				bridgeit.io.auth.connect({
					username: form.userName.value,
					password: form.passWord.value,
					account: window.bridgeitAccountName,
					realm: window.bridgeitRealmName,
					host: window.bridgeitHost,
                    onSessionExpiry: window.controller.sessionExpiryHandler
				})
                .then(function () {bridgeit.io.context.setUserState({username: form.userName.value, state: {"status":"active"}});})
				.then(isAdmin ? adminController.adminLoginDone : homeController.userLoginDone)
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
            bridgeit.io.context.setUserState({username: localStorage.bridgeitUUsername, state: {"status":"inactive"}});
			if(isAdmin){
				adminController.adminLogout();
			}else{
				homeController.userLogout();
			}
		};
	},

    sessionExpiryHandler: function() {
        bridgeit.io.context.setUserState({username: localStorage.bridgeitUUsername, state: {"status":"inactive"}});
        bridgeit.io.auth.disconnect();
        localStorage.removeItem('bridgeitUUsername');
    },

	enablePush: function(username){
		bridgeit.usePushService(window.pushUri, null, 
			{
				auth:{
					access_token: bridgeit.io.auth.getLastAccessToken()
				},
				account: 'bridget_u', 
				realm: 'bridgeit.u'
			}
		);
	},

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
	}

};