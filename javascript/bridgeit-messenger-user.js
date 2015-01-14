window.quickUser = 'http://dev.bridgeit.io/authadmin/bridget_u/realms/bridgeit.u/quickuser';
window.userMessageResponseFlow = window.codeService + 'richresponse?accept=';

window.homeModel = {

	userRecord: {},

	cloudPushRegisteredCallback: function(){
		console.log('cloud push successfully registered');
	},

	newMessagePushCallback: function(){
        console.log('BridgeIt Cloud Messenger New Message Push Callback');
        $.getJSON(window.documentService + window.bridgeitMessengerMessageDoc + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .done(
        	function(json){
        		//show popup if message is less than a minute old
        		if( new Date().getTime() - json.updated < (60*1000)){
        			$('#messageSubject').html(json.subject);
	        		$('#messageBody').html(json.body);
	        		var updated = new Date();
	        		updated.setTime(parseInt(json.updated));
	        		$('#messageUpdated').html(updated.toLocaleTimeString());
	        		$('#messageModal').modal();
        		}
        		
        	}
        )
        .fail(
        	function(error){
        		console.log('failed fetching new message content: ' + error);
        	}
        );
    },

    respondToMessage: function(response){

    	$.ajax({
            url : window.userMessageResponseFlow + response + '?access_token=' + localStorage.bridgeitUToken,
            type: 'POST',
            contentType: 'application/json; charset=utf-8'
        }).then(function(){
        	console.log('successfully updated counts');
        }).fail(function(error){
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

		if(localStorage.bridgeitUToken === undefined){
            view.showLoginNavbar();
            homeView.hidePanels();
            $('#loginModal').modal();
        // Valid Student token - logged in
        } else if(util.tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
			homeController.userLoggedIn();
			homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
			controller.enablePush(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
		}else{
			homeController.userLogout('expired');
		}
		homeModel.newMessagePushCallback();
	},

	userLoginDone: function(data, textStatus, jqxhr){
		if( jqxhr.status === 200){
			// Login is required to retrieve a token so purchases can be made and notifications received
			localStorage.bridgeitUToken = data.access_token;
			localStorage.bridgeitUTokenExpires = data.expires_in;
			localStorage.bridgeitUUsername = $('#userName').val();
			homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
			location.reload();
		}else{
			view.serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
		}
	},

	userLoggedIn: function(){
		view.loggedIn(localStorage.bridgeitUUsername);
	},

	userLogout: function(expired){
		var token = localStorage.getItem('bridgeitUToken');
		localStorage.removeItem('bridgeitUToken');
		localStorage.removeItem('bridgeitUTokenExpires');
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
			var postData = {
							user: {username: form.regUserName.value,
								   password: form.regPassWord.value,
								   password_confirm: form.confirmPassWord.value}};
			$.ajax({
				url : window.quickUser,
				type: 'POST',
				dataType : 'json',
				contentType: 'application/json; charset=utf-8',
				data : JSON.stringify(postData)
			})
			.fail(homeView.registerFail)
			.done(homeController.registerDone);
		}
	},

	registerDone: function(data, textStatus, jqxhr){
		if( jqxhr.status === 201){
			// Login is required to retrieve a token 
			localStorage.bridgeitUToken = data.token.access_token;
			localStorage.bridgeitUTokenExpires = data.token.expires_in;
			localStorage.bridgeitUUsername = $('#regUserName').val();
			homeController.registerNewMessagePushGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
			homeView.toggleLoginRegister();
			homeController.userLoggedIn();
		}else{
			view.serviceRequestUnexpectedStatusAlert('Register', jqxhr.status);
		}
	},

	registerNewMessagePushGroup: function(username, token){
		bridgeit.usePushService(window.pushUri, null, 
			{
				auth:{
					access_token: token
				},
				account: 'bridget_u', 
				realm: 'bridgeit.u'
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