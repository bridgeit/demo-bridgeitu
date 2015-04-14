window.homeController.registerNewMessagePushGroup = function(username){
    bridgeit.usePushService(window.pushUri, null,
        {
            auth:{
                access_token: bridgeit.io.auth.getLastAccessToken()
            },
            account: window.bridgeitAccountName,
            realm: window.bridgeitRealmName
        }
    );
    bridgeit.addPushListener(username, 'homeModel.newMessagePushCallback');
}

window.homeModel.newMessagePushCallback = function(){
    console.log('BridgeIt Cloud Messenger New Message Push Callback');
    bridgeit.io.documents.getDocument({
        id: localStorage.getItem('bridgeitUUsername')+'_message',
        host: window.bridgeitHost
    }).then(function(json){
        //show if message is less than a minute old
        if( new Date().getTime() - json.updated < (60*1000)){
            var updated = new Date();
            updated.setTime(parseInt(json.updated));
            $('#alertDiv').prepend(
                $('<div class="alert alert-info fade in">' +
                    '<button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button>' +
                    '<small>' +
                    '<strong>Subject: </strong>'+json.subject+
                    '<br><strong>Message: </strong>'+json.body+
                    '<br><strong>Vehicle: </strong>'+json.vehicle+
                    '<br><strong>Received: </strong>'+updated.toLocaleTimeString() + '' +
                    '</small>' +
                    '</div>').hide().fadeIn('slow')
            );
        }
    }).catch(function(error){
        console.log('failed fetching new message content: ' + error);
    });
}