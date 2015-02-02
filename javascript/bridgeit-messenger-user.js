window.userMessageResponseFlow = 'richresponse';

window.homeModel = {

	userRecord: {},

	cloudPushRegisteredCallback: function(){
		console.log('cloud push successfully registered');
	},

	newMessagePushCallback: function(){
        console.log('BridgeIt Cloud Messenger New Message Push Callback');
        bridgeit.services.documents.getDocument({
        	id: window.bridgeitMessengerMessageDoc
        }).then(function(json){
    		//show popup if message is less than a minute old
    		if( new Date().getTime() - json.updated < (60*1000)){
    			$('#messageSubject').html(json.subject);
        		$('#messageBody').html(json.body);
        		var updated = new Date();
        		updated.setTime(parseInt(json.updated));
        		$('#messageUpdated').html(updated.toLocaleTimeString());
        		$('#messageModal').modal();
    		}		
        }).catch(function(error){
    		console.log('failed fetching new message content: ' + error);
    	});
    },

    respondToMessage: function(response){

    	bridgeit.services.code.executeFlow({
    		flow: window.userMessageResponseFlow,
    		data: {
    			accept: response
    		}
    	}).then(function(){
        	console.log('successfully updated counts');
        }).catch(function(error){
        	console.log('updating counts failed: ' + error);
        });
        
	}

	
};

window.homeView = {


	hidePanels: function(){
		$('#purchasePanel').hide();
		$('#ticketsPanel').hide();
		$('#locationPanel').hide();
	},

	toggleLoginRegister: function(event){
		$('#loginModalContent').toggle();
		$('#registerModalContent').toggle();
	},

	closeRegisterModal: function(){
		homeView.resetRegisterBody();
		homeView.toggleLoginRegister();
		view.resetLoginBody();
	},

	resetRegisterBody: function(){
		view.resetForm('registerModalForm');
		$('#alertRegisterDiv').html('');
	},

	registerFail: function(jqxhr, textStatus, errorThrown){
		view.registerErrorAlert(textStatus);
	},

	
	

};

window.homeController = {

	initHomePage: function() {
		bridgeit.useServices({
				realm:"bridgeit.u",
				serviceBase:"http://dev.bridgeit.io"});

		$('#loginModalForm').submit(controller.loginSubmit());
		$('#logoutNavbar').click(controller.logoutClick());
		$('#registerModalContent').hide();
		$('#register').click(homeView.toggleLoginRegister);
		$('#registerModalForm').submit(homeController.registerSubmit);

		if(!bridgeit.services.auth.isLoggedIn()){
            view.showLoginNavbar();
            homeView.hidePanels();
            $('#loginModal').modal();
        } 
        else{
			homeController.userLoggedIn();
			homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
			controller.enablePush(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
			homeModel.newMessagePushCallback();
		}

	},

	userLoginDone: function(data){
		// Login is required to retrieve a token so purchases can be made and notifications received
		localStorage.bridgeitUUsername = $('#userName').val();
		homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername, 
			bridgeit.services.auth.getLastAccessToken());
		location.reload();
	},

	userLoggedIn: function(){
		view.loggedIn(localStorage.bridgeitUUsername);
	},

	userLogout: function(expired){
		var token = bridgeit.services.auth.getLastAccessToken();
		bridgeit.services.auth.disconnect();
		localStorage.removeItem('bridgeitUUsername');
		if( token ){
			location.reload();
		}
	},

	registerSubmit: function(event){
		event.preventDefault();
		/* form element used to generically validate form elements (could also serialize the form if necessary)
		*  Also using form to create post data from form's elements
		*/
		var form = this;
		if(util.validate(form) && util.confirmPassword(form.regPassWord.value, form.confirmPassWord.value)){
			bridgeit.services.auth.registerAsNewUser({
				username: form.regUserName.value,
				password: form.regPassWord.value,
				account: window.bridgeitAccountName,
				realm: window.bridgeitRealmName,
				host: window.bridgeitHost
			}).then(homeController.registerDone).catch(homeView.registerFail);
		}
	},

	registerDone: function(data){
		localStorage.bridgeitUUsername = $('#regUserName').val();
		homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername);
		homeView.toggleLoginRegister();
		homeController.userLoggedIn();
	},

	registerNewMessagePushGroup: function(username){
		bridgeit.usePushService(window.pushUri, null, 
			{
				auth:{
					access_token: bridgeit.services.auth.getLastAccessToken()
				},
				account: window.bridgeitAccountName, 
				realm: window.bridgeitRealmName
			}
		);
		bridgeit.addPushListener(window.pushGroupNewMessage, 'homeModel.newMessagePushCallback');
	},

	acceptMessage: function(){
		homeModel.respondToMessage(true);
		$('#messageModal').modal('hide');

	},

	rejectMessage: function(){
		homeModel.respondToMessage(false);
		$('#messageModal').modal('hide');
	}

	
};
