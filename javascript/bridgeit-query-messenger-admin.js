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
                }).then(doPush(results[i].OwnerId)).catch(adminView.sendMessageFail);
            }
        });
        function doPush(ownerId){
            bridgeit.push( ownerId,
                {
                    'subject': form.messageSubject.value,
                    'detail': form.messageBody.value
                });
            adminView.pushMessageDone();
        }
    }
    else{
        adminController.adminLogout('expired');
    }
}