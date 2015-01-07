window.adminSendMessageFlow = window.codeService + 'adminSendMessage';
window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridget_u/realms/bridgeit.u/permission';

window.adminModel = {

	messageCountsUpdatedPushCallback: function(){
		model.fetchMessageCounts(adminView.displayMessageCounts, adminView.displayMessageCountsFailed);
	}

};

window.adminView = {

	
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

	sendMessageFail: function(jqxhr, textStatus, errorThrown){
		if(jqxhr.status === 401){
			// 401 unauthorized
			view.errorAlert('<strong>Unauthorized</strong> to send event notifications: status <strong>' + jqxhr.status + '</strong>');
		}else{
			view.requestFail(jqxhr, textStatus, errorThrown);
		}
	},

	sendMessageDone: function(data, textStatus, jqxhr){
		if(jqxhr.status === 200){
			if(data.pushSubject){
				view.infoAlert('<strong>' + data.pushSubject + '</strong> push group notified.');
			}else{
				view.infoAlert('Message sent.');
			}
			view.resetForm('sendMessageFrm');
		}else{
			view.serviceRequestUnexpectedStatusAlert('Notify', jqxhr.status);
		}
	},

	pushMessageDone: function(){
		view.infoAlert('Message sent.');
		view.resetForm('sendMessageFrm');
	},	

	displayMessageCounts: function(json){
		$('#acceptedCount').html(json.accepted);
		$('#rejectedCount').html(json.rejected);
	},

	displayMessageCountsFailed: function(){
		$('#acceptedCount').html('?');
		$('#rejectedCount').html('?');
	},



};

window.adminController = {


	initMessengerAdminPage: function() {
		bridgeit.useServices({
				realm:"bridgeit.u",
				serviceBase:"http://dev.bridgeit.io"});

		$('#sendMessageFrm').submit(adminController.sendMessageSubmit);
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
			controller.enablePush(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
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
				controller.enablePush(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
				adminController.adminLoggedIn();
			}else{
				view.serviceRequestUnexpectedStatusAlert('Permission Check', jqxhr.status);
			}
		}
	},

	adminLoggedIn: function(){
		view.loggedIn(sessionStorage.bridgeitUUsername);
		bridgeit.addPushListener(window.pushGroupCountsUpdated, 'adminModel.messageCountsUpdatedPushCallback'); //callback must be passed by string name
		model.fetchMessageCounts(adminView.displayMessageCounts, adminView.displayMessageCountsFailed);
		adminView.loggedIn();
	},

	sendMessageSubmit: function(event){
		event.preventDefault();
		if(util.tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
			var form = this;
			var postData = {};
                postData['access_token'] = sessionStorage.bridgeitUToken;
                postData['pushSubject'] = this.messageSubject.value;
                postData['pushBody'] = this.messageBody.value;
                postData['expiry'] = (new Date()).getTime() + (5 * 1000);

            $.ajax({
				url : window.documentService + window.bridgeitMessengerMessageDoc+ '?access_token=' + sessionStorage.bridgeitUToken,
				type: 'POST',
				dataType : 'json',
				contentType: 'application/json; charset=utf-8',
				data : JSON.stringify({
					updated: new Date().getTime(),
					subject: this.messageSubject.value,
					body: this.messageBody.value
				})
			})
			.done(function(){
				bridgeit.push( window.pushGroupNewMessage, 
				{
					'subject': form.messageSubject.value, 
					'message': form.messageBody.value
				});
				adminView.pushMessageDone();
			})
			.fail(adminView.sendMessageFail);
		}else{
			adminController.adminLogout('expired');
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