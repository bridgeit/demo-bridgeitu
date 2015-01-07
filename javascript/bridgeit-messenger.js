window.documentService = 'http://dev.bridgeit.io/docs/bridget_u/realms/bridgeit.u/documents/';
window.authService = 'http://dev.bridgeit.io/auth/bridget_u/realms/bridgeit.u/token';
window.pushUri = 'http://dev.bridgeit.io/push';
window.codeService = 'http://dev.bridgeit.io/coden/bridget_u/realms/bridgeit.u/nodes/';
window.pushGroupNewMessage = 'bridgeitCloudMessenger_newMessage';
window.pushGroupCountsUpdated = 'bridgeitCloudMessenger_countsUpdated';
window.bridgeitMessengerCountDoc = 'bridgeitMessengerCountDoc';
window.bridgeitMessengerMessageDoc = 'bridgeitMessengerMessage';


window.model = {

   fetchMessageCounts: function(success, fail){
   		var token = sessionStorage.bridgeitUToken;
   		if( !token ){
   			token = localStorage.bridgeitUToken;
   		}
		$.getJSON( window.documentService + window.bridgeitMessengerCountDoc + '?access_token=' + token + '&results=one')
	        .fail(fail)
	        .done(success);
	}

};

window.view = {

	loggedIn: function(username){
		$('#welcome').html('Welcome: ' + username);
		view.showLogoutNavbar();
		view.resetLoginBody();
		$('#loginModal').modal('hide');
	},

	loginFail: function(jqxhr, textStatus, errorThrown){
		if(jqxhr.status === 401){
			// 401 unauthorized
			view.loginErrorAlert('Invalid Credentials');
		}else{
			view.requestFail(jqxhr, textStatus, errorThrown);
		}
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
				$.ajax({
					url : window.authService,
					type: 'POST',
					dataType : 'json',
					contentType: 'application/json; charset=utf-8',
					data : JSON.stringify(postData)
				})
				.fail(view.loginFail)
				.done(isAdmin ? adminController.adminLoginDone : homeController.userLoginDone);
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
				homeController.userLogout();
			}
		};
	},

	enablePush: function(username, token){
		bridgeit.usePushService(window.pushUri, null, 
			{
				auth:{
					access_token: token
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
	},

	tokenValid: function (token, expires, type){
		return (token !== undefined) && (parseInt(expires) > new Date().getTime());
	}

};