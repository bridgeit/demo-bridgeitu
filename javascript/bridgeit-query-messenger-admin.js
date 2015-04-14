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

window.adminController.sendMessageSubmit = function(event){
    event.preventDefault();
    if(bridgeit.io.auth.isLoggedIn()){
        var form = this;
        var c=0;
        bridgeit.io.documents.findDocuments({
            collection:'vehicles',
            queryId:this.messageQuery.options[messageQuery.selectedIndex].value
        }).then(function(results) {
            for (var i=0; i<results.length; i++) {
                bridgeit.io.documents.createDocument({
                    id: results[i].OwnerId+'_message',
                    document: {
                        updated: new Date().getTime(),
                        subject: this.messageSubject.value,
                        body: this.messageBody.value,
                        vehicle: results[i].Name
                    },
                    host: window.bridgeitHost
                }).then(doPush(results[i].OwnerId,results.length-1==i)).catch(adminView.sendMessageFail);
            }
        });
        function doPush(ownerId,isLastPush){
            c++;
            bridgeit.push( ownerId,
            {
                'subject': form.messageSubject.value,
                'detail': form.messageBody.value
            });
            if (isLastPush) {
                adminView.pushMessageDone(c);
            }
        }
    }
    else{
        adminController.adminLogout('expired');
    }
}

window.adminView.pushMessageDone = function(num) {
    var messageTxt = num > 1 || num === 0 ? ' Messages' : ' Message';
    view.infoAlert(num+messageTxt+' sent.');
}