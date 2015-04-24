bridgeit.goBridgeItURL = "cloud-query-messenger.html";

window.adminController.adminLoggedIn = function(){
    view.loggedIn(sessionStorage.bridgeitUUsername);
    bridgeit.io.query.findQueries({}).then(function(results) {
        for (var i=0; i<results.length; i++) {
            this.messageQuery.options[i+1]=new Option(results[i]._id,results[i]._id,false,false)
        }
    });
    adminView.loggedIn();
}

window.adminController.initMessengerAdminPage = function() {
    bridgeit.useServices({
        realm:"bridgeit.u",
        serviceBase:"http://dev.bridgeit.io"});

    $('#sendMessageFrm').submit(adminController.executeContext);
    $('#loginModalForm').submit(controller.loginSubmit('admin'));
    $('#logoutNavbar').click(controller.logoutClick('admin'));
    // No Admin token
    if(!bridgeit.io.auth.isLoggedIn()){
        view.showLoginNavbar();
        adminView.forceLogin();
        // Valid Admin token - logged in
    } else {
        adminController.adminLoggedIn();
        // TODO: If admin needs to receive push updates, uncomment line below and implement
        //controller.registerPushUsernameGroup(sessionStorage.bridgeitUUsername,sessionStorage.bridgeitUToken);
        controller.enablePush(sessionStorage.bridgeitUUsername,bridgeit.io.auth.getLastAccessToken());
        // Invalid Admin token - log out
    }
},

window.adminController.executeContext = function(event) {
    event.preventDefault();
    var queryId = document.getElementById('messageQuery').value;
    var subject = document.getElementById('messageSubject').value;
    var body = document.getElementById('messageBody').value;
    if (queryId && subject && body) {
        var contextExecData = {
            name: 'studentVehiclePush',
            data: {
                'queryId':queryId,
                "msgSubject": subject,
                "msgBody": body
            }
        };
        bridgeit.io.context.executeContext(contextExecData)
        .then(function() {
            adminView.contextDone();
        })
        .catch(function(err) {
            console.error('Executing context failed',err);
        })
    }
}

window.adminView.contextDone = function() {
    view.infoAlert('Action complete.');
}


