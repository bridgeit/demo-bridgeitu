window.adminSendMessageFlow = 'adminSendMessage';

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

	adminPermissionFail: function(){
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

	sendMessageFail: function(errorThrown){
		view.errorAlert('<strong>Unauthorized</strong> to send event notifications: status <strong>' + 
			errorThrown + '</strong>');
	},

	sendMessageDone: function(data){
		if(data.pushSubject){
			view.infoAlert('<strong>' + data.pushSubject + '</strong> push group notified.');
		}else{
			view.infoAlert('Message sent.');
		}
		view.resetForm('sendMessageFrm');
	},

	pushMessageDone: function(){
		view.infoAlert('Message sent.');
		//view.resetForm('sendMessageFrm');
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
		if(!bridgeit.services.auth.isLoggedIn()){
			view.showLoginNavbar();
			adminView.forceLogin();
		// Valid Admin token - logged in
		} else {
			adminController.adminLoggedIn();
			// TODO: If admin needs to receive push updates, uncomment line below and implement
			//controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
			controller.enablePush(sessionStorage.bridgeitUUsername,bridgeit.services.auth.getLastAccessToken());
		// Invalid Admin token - log out
		}
	},

	adminLoginDone: function(data){
		// Check that user has admin permissions
		bridgeit.services.auth.checkUserPermissions({
			permissions: 'u.admin'
		}).then(adminPermissionDone).catch(adminView.adminPermissionFail);
	},

	adminPermissionDone: function(){
		sessionStorage.bridgeitUUsername = $('#userName').val();
		controller.enablePush(sessionStorage.bridgeitUUsername);
		adminController.adminLoggedIn();
	},

	adminLoggedIn: function(){
		view.loggedIn(sessionStorage.bridgeitUUsername);
		bridgeit.addPushListener(window.pushGroupCountsUpdated, 'adminModel.messageCountsUpdatedPushCallback'); //callback must be passed by string name
		model.fetchMessageCounts(adminView.displayMessageCounts, adminView.displayMessageCountsFailed);
		adminView.loggedIn();
	},

	sendMessageSubmit: function(event){
		event.preventDefault();
		if(bridgeit.services.auth.isLoggedIn()){
			var form = this;
			bridgeit.services.documents.createDocument({
            	id: window.bridgeitMessengerMessageDoc,
            	document: {
					updated: new Date().getTime(),
					subject: this.messageSubject.value,
					body: this.messageBody.value
				}
            }).then(function(){
				bridgeit.push( window.pushGroupNewMessage, 
				{
					'subject': form.messageSubject.value, 
					'detail': form.messageBody.value
				});
				adminView.pushMessageDone();
			}).catch(adminView.sendMessageFail);
		}else{
			adminController.adminLogout('expired');
		}
	},

	
	adminLogout: function(expired){
		bridgeit.services.auth.disconnect();
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
