bridgeit.goBridgeItURL = "cloud-query-messenger.html";

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
    var username = localStorage.getItem('bridgeitUUsername');
    if (username) {
        //TODO - Currently there's no way to return only the students vehicle in their mailbox, so for now we'll fetch the vehicle manually. See NTFY-238.
        bridgeit.io.documents.findDocuments({
            host: window.bridgeitHost,
            collection: "vehicles",
            query: {"$and":[{"OwnerId":username}]},
            fields:{"Name":1,"_id":0}
        }).then(function(json){
            bridgeit.io.context.getUnreadUpdates({username:username}).then(function (updates) {
                if (!updates || updates.length === 0) {
                    console.debug('no updates');
                    return;
                }

                $('#alertDiv').prepend(
                    $('<div class="alert alert-info fade in">' +
                        '<button type="button" class="close" data-dismiss="alert" onclick="view.removeNoticesInfoClass();" aria-hidden="true">&times;</button>' +
                        '<small>' +
                            '<strong>Subject: </strong>'+updates[0].data[0][0].subject +
                            '<br><strong>Message: </strong>'+updates[0].data[0][0].details +
                            '<br><strong>Vehicle: </strong>'+json[0].Name +
                            //'<br><strong>Vehicle: </strong>'+updates[0].data[0][0].vehicle +
                            '<br><strong>Received: </strong>'+new Date(updates[0].timeAdded).toLocaleTimeString() +
                        '</small>' +
                        '</div>').hide().fadeIn('slow')
                );
            }).catch(function (err) {
                console.error('problem getting unread updates', err);
            });
        }).catch(function(error){
            console.log('failed fetching students: ' + error);
        });
    }
}