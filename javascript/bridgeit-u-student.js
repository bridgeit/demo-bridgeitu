
// gmap
window.map = null;
window.studentMapStyles = [
    {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
    }
];
window.mapOptions = {
    zoom: 15,
    maxZoom: 16,
    center: new google.maps.LatLng(30.2852191,-97.7324101),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: window.studentMapStyles
};

function isAnonymous(){
    return getUsername() === 'anonymous';
}

function getUsername(){
    return localStorage.getItem('bridgeitUUsername');
}

window.homeModel = {

    userRecord: {},

    retrieveEvents: function(){
<<<<<<< HEAD
        bridgeit.services.documents.findDocuments({
            query: {
                details:{$exists: true}
            }
        }).
        then(homeModel.retrieveEventsDone)
        ['catch'](view.retrieveEventsFail);
    },

    retrieveEventsDone: function(data){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html('');
        $.each(data, function(i, obj) {
            // Using Document Service to store users and notifications, this will skip them
            if(obj.details !== undefined){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                model.events[obj._id] = obj.name;
                evntLstDiv.append('<a href="#" class="list-group-item" onclick="homeController.purchaseTicket(\'' + obj._id + '\');">' + obj.name + '</a>');
            }
        });
=======
        $.getJSON(window.documentService  + '?access_token=' + 
            (localStorage.bridgeitUToken ? localStorage.bridgeitUToken : localStorage.bridgeitUAnonymousToken)+
            "&query=%7B%22details%22%3A%7B%22%24exists%22%3Atrue%7D%7D")
        .fail(view.retrieveEventsFail)
        .done(homeModel.retrieveEventsDone);
    },

    retrieveEventsDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            var evntLstDiv = $('#evntLst');
            evntLstDiv.html('');
            $.each(data, function(i, obj) {
                // Using Document Service to store users and notifications, this will skip them
                if(obj.details !== undefined){
                    // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                    model.events[obj._id] = obj.name;
                    evntLstDiv.append('<a href="#" class="list-group-item" onclick="homeController.purchaseTicket(\'' + obj._id + '\');">' + obj.name + '</a>');
                }
            });
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
        }
>>>>>>> FETCH_HEAD
    },

    initializeStudent: function(){
        console.log('initializeStudent()');
        bridgeit.services.documents.getDocument({
            id: getUsername()
        }).then(homeModel.initializeStudentDone)['catch'](homeModel.initializeStudentFail);
    },

    initializeStudentDone: function(data){
        homeModel.userRecord = data;
        homeView.displayTickets();
        homeView.setCurrentLocationText(data);
        homeModel.retrieveLocation();
    },

    initializeStudentFail: function(){
        // User Record doesn't exist.
        homeModel.userRecord = {};
        homeModel.userRecord['tickets'] = [];
        $('#evntTcktLst').html('');
        $('#crrntLctn').html('');
        homeController.locationMapInit();
    },

    updateStudent: function(){
        console.log('updateStudent()');
        bridgeit.services.documents.getDocument({
            id: getUsername()
        }).then(homeModel.updateStudentDone)['catch'](homeModel.initializeStudentFail);
    },

    updateStudentDone: function(data){
        homeModel.userRecord = data;
        homeView.displayTickets();
        homeView.setCurrentLocationText(data);
    },

    retrieveLocation: function(){
        bridgeit.services.location.getLastUserLocation({
            username: getUsername()
        }).then(homeModel.retrieveLocationDone)['catch'](homeModel.retrieveLocationFail);
    },

    retrieveLocationDone: function (data){
        homeController.locationMapInit(data['location']['geometry'].coordinates[1],data['location']['geometry'].coordinates[0]);
    },

    retrieveLocationFail: function(){
        view.requestFail(error);
        homeController.locationMapInit();
    },

    postUserDone: function(event){
        return function(data){
            homeModel.saveLocation(event);
        }
    },

    saveLocation: function(event){
        bridgeit.services.location.updateLocationCoordinates({
            lon: event.latLng.lng(),
            lat: event.latLng.lat(),
            label: 'BridgeIt U Student Location'
        }).then(homeView.locationSaveDone('Lat: ' + event.latLng.lat() + ' Long: ' + event.latLng.lng()))
        ['catch'](view.requestServiceFail('location service'));
    },

    purchaseTicketDone: function(ticketArray, quantity, eventname){
        return function(data){
            view.successAlert('<strong>' + quantity + ' ' + eventname + '</strong> ticket(s) purchased.');
            homeModel.userRecord['tickets'] = homeModel.userRecord['tickets'].concat(ticketArray);
            homeView.displayTickets();
            $('#purchaseTcktFrm')[0].reset();
            $('#purchasePanel').removeClass('panel-primary');
            $('#purchaseBttn').prop('disabled', true);
        }
    },

    ticketCancelDone: function(eventname){
        return function(data){
            view.successAlert('<strong>' + eventname + '</strong> ticket purchase cancelled.');
            for(var i=0; i<homeModel.userRecord['tickets'].length; i++){
                if(homeModel.userRecord['tickets'][i].name === eventname){
                    homeModel.userRecord['tickets'].splice(i,1);
                    break;
                }
            }
            homeView.displayTickets();
        }
    },

    handleAnonPush: function(){
        console.log('BridgeIt U Anonymous Push Callback');
        homeModel.retrieveEvents();
        /*
        model.getNotifications("anonymous", function (data) {
            data.forEach(model.displayNotification);
        });
        */
    }

};

window.homeView = {

    markers: [],

    setMapPosition: function(lat,lon){
        window.map.setCenter(new google.maps.LatLng(lat,lon) );
        homeView.placeMapMarker();
        google.maps.event.trigger(window.map, 'resize');
    },

    placeMapMarker: function(){
        homeView.clearOverlays();
        homeView.markers.push(new google.maps.Marker({
          position: window.map.getCenter(),
          map: window.map,
          title: 'You are here.'
          })
        );
    },

    clearOverlays: function() {
        for (var i = 0; i < homeView.markers.length; i++ ) {
            homeView.markers[i].setMap(null);
        }
        homeView.markers.length = 0;
    },

    retrieveRegionsDone: function(data){
        $.each(data, function(i, obj) {
            window.map.data.addGeoJson(obj.location);
        });
        window.map.data.forEach(function(feature){
            window.map.data.setStyle(function(feature) {
                var color = 'gray';
                if (feature.getProperty('color')) {
                  color = feature.getProperty('color');
                }
                return ({
                    clickable: false,
                    fillOpacity: 0.4,
                    fillColor: color,
                    strokeOpacity: 0.4,
                    strokeWeight: 1
                });
            });
        });
    },

    retrieveRegionsFail: function(error){
        view.requestFail(error);
    },

    locationSaveDone: function(location){
        return function(data){
            view.successAlert('<strong>' + location + '</strong> Location Saved');
        };
    },

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

    setCurrentLocationText: function(data){
        console.log('setCurrentLocationText()');
        var lctnLabel = $('#crrntLctn');
        lctnLabel.html('');
        if(data.location){
            lctnLabel.html(data.location);
        }
        else{
            console.log('no location provided');
        }
    },

    ticketFail: function(error){
        view.requestFail(error);
    },

    displayTickets: function(){
        var $evntTcktLst = $('#evntTcktLst');
        $evntTcktLst.html('');
        for (var key in model.events) {
           if (model.events.hasOwnProperty(key) ){
               for (var i=0; i<homeModel.userRecord.tickets.length; i++){
                   if(homeModel.userRecord.tickets[i].name === model.events[key]){
                       $evntTcktLst.append('<div class="list-group-item">' + homeModel.userRecord.tickets[i].name + '<a title="Cancel Ticket Purchase" onclick="homeController.cancelTicketPurchase(\'' + homeModel.userRecord.tickets[i].name + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a></div>');
                   }
               }

           }
        }
    },

    purchaseGetEventDone: function(data){
        $('#purchasePanel').addClass('panel-primary');
        $('#purchaseBttn').prop('disabled', false);
        document.getElementById('ticketQuantity').value = null;
        document.getElementById('ticketName').value = data.name;
        document.getElementById('ticketDetails').value = data.details;
    }

};

window.homeController = {

    initHomePage: function() {
        /*
        bridgeit.useServices({
                realm: window.bridgeitRealmName,
                serviceBase:window.bridgeitHost});
        */

        $('#purchaseBttn').prop('disabled', true);
        $('#purchaseTcktFrm').submit(homeController.purchaseTicketSubmit);
        $('#loginModalForm').submit(controller.loginSubmit());
        $('#logoutNavbar').click(controller.logoutClick());
        $('#registerModalContent').hide();
        $('#register').click(homeView.toggleLoginRegister);
        $('#registerModalForm').submit(homeController.registerSubmit);

        var username = getUsername();

        if(bridgeit.services.auth.isLoggedIn()){

            if( isAnonymous()){
                view.showLoginNavbar();
                homeView.hidePanels();
            }
            else{
                homeController.studentLoggedIn();
                controller.registerPushUsernameGroup();
            }
        }
        else{
            view.showLoginNavbar();
            homeView.hidePanels();
            if( !username || isAnonymous()){
                homeController.anonymousLogin();
            }
            else{
                homeController.studentLogout('expired');
            }
            
        }

        // Get student push notifications
        isAnonymous() ? homeModel.handleAnonPush() : model.handlePush();
    },

    anonymousLogin: function(){
        bridgeit.services.startTransaction();
        // Automatic auth service login with anonymous user that only has bridgeit.doc.getDocument permission
<<<<<<< HEAD
        var username = 'anonymous';
        localStorage.setItem('bridgeitUUsername', username);
        bridgeit.services.auth.login({
            username: username,
            password: username,
            account: window.bridgeitAccountName,
            realm: window.bridgeitRealmName
        }).then(homeController.anonymousLoginDone)['catch'](view.requestServiceFail('auth service'));
    },

    anonymousLoginDone: function(data){
        homeModel.retrieveEvents();
        controller.registerPushUsernameGroup();
    },

    studentLoginDone: function(data){
        // Logout as anonymous
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made and notifications received
        localStorage.setItem('bridgeitUUsername', $('#userName').val());
        controller.registerPushUsernameGroup();
        // TODO: reload() is called because we don't have the ability to unregister
        // a push group listener yet (required when switching between anonymous
        // and student users).  Revisit once this feature is added to bridgeit
        location.reload();
        // TODO: Uncomment when reload() is removed and add in unregister
        // of anonymous push group.  Make call to homeController.anonymousLogin();
        //homeController.studentLoggedIn();
=======
        var postData = {'username' : 'anonymous',
                        'password' : 'anonymous'};
        $.ajax({
            url : window.authService,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(view.requestServiceFail('auth service'))
        .done(homeController.anonymousLoginDone);
    },

    anonymousLoginDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            localStorage.bridgeitUAnonymousToken = data.access_token;
            localStorage.bridgeitUAnonymousTokenExpires = new Date().getTime() + parseInt(data.expires_in) - 500;
            homeModel.retrieveEvents();
            controller.registerPushUsernameGroup('anonymous',localStorage.bridgeitUAnonymousToken);
        }else{
            view.serviceRequestUnexpectedStatusAlert('Anonymous Login', jqxhr.status);
        }
    },

    studentLoginDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            // Logout as anonymous
            localStorage.removeItem('bridgeitUAnonymousToken');
            localStorage.removeItem('bridgeitUAnonymousTokenExpires');
            // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
            // Login is required to retrieve a token so purchases can be made and notifications received
            localStorage.bridgeitUToken = data.access_token;
            localStorage.bridgeitUTokenExpires = new Date().getTime() + parseInt(data.expires_in) - 500;
            localStorage.bridgeitUUsername = $('#userName').val();
            controller.registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
            // TODO: reload() is called because we don't have the ability to unregister
            // a push group listener yet (required when switching between anonymous
            // and student users).  Revisit once this feature is added to bridgeit
            location.reload();
            // TODO: Uncomment when reload() is removed and add in unregister
            // of anonymous push group.  Make call to homeController.anonymousLogin();
            //homeController.studentLoggedIn();
        }else{
            view.serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
        }
>>>>>>> FETCH_HEAD
    },

    studentLoggedIn: function(){
        $('#purchaseTcktFrm')[0].reset();
        $('#purchasePanel').show('slow');
        $('#ticketsPanel').show('slow');
        $('#locationPanel').show();
        view.loggedIn(getUsername());
        homeModel.initializeStudent();
    },

    studentLogout: function(expired){
        bridgeit.services.auth.disconnect();
        localStorage.removeItem('bridgeitUUsername');
        sessionStorage.removeItem('bridgeitUUsername');
        bridgeit.services.endTransaction();
        // TODO: reload() is called because we don't have the ability to unregister
        // a push group listener yet (required when switching between anonymous
        // and student users).  Revisit once this feature is added to bridgeit
        location.reload();
        // TODO: Uncomment when reload() is removed and add in unregister
        // of student push group.  Make call to homeController.anonymousLogin();
        /*
        homeView.hidePanels();
        view.showLoginNavbar();
        view.clearWelcomeSpan();
        // clear previous user notices
        view.removeNoticesInfoClass();
        $('#alertDiv').html('');
        if(expired){
            $('#loginModal').modal('show');
            view.loginErrorAlert('Session Expired');
        }
        */
    },

    registerSubmit: function(event){
        bridgeit.services.startTransaction();
        event.preventDefault();
        /* form element used to generically validate form elements (could also serialize the form if necessary)
        *  Also using form to create post data from form's elements
        */
        var form = this;
        if(util.validate(form) && util.confirmPassword(form.regPassWord.value, form.confirmPassWord.value)){
            bridgeit.services.admin.registerNewUser({
                username: form.regUserName.value,
                password: form.regPassWord.value
            }).then(homeController.registerDone)['catch'](homeView.registerFail);
        }
    },

<<<<<<< HEAD
    registerDone: function(data){
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made and notifications received
        localStorage.setItem('bridgeitUUsername', $('#regUserName').val());
        controller.registerPushUsernameGroup();
        homeView.toggleLoginRegister();
        homeController.studentLoggedIn();
=======
    registerDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 201){
            // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
            // Login is required to retrieve a token so purchases can be made and notifications received
            localStorage.bridgeitUToken = data.token.access_token;
            localStorage.bridgeitUTokenExpires = new Date().getTime() + parseInt(data.expires_in) - 500;
            localStorage.bridgeitUUsername = $('#regUserName').val();
            controller.registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
            homeView.toggleLoginRegister();
            homeController.studentLoggedIn();
        }else{
            view.serviceRequestUnexpectedStatusAlert('Register', jqxhr.status);
        }
>>>>>>> FETCH_HEAD
    },

    locationMapInit: function(lat, lon){
        window.map = new google.maps.Map(document.getElementById('map-canvas'), window.mapOptions);
        if(lat !== undefined && lon !== undefined){
            homeView.setMapPosition(lat, lon);
        }

        bridgeit.services.location.getAllRegions().then(homeView.retrieveRegionsDone)
        ['catch'](homeView.retrieveRegionsFail);
        
        google.maps.event.addListener(window.map, 'click', function(event) {
            window.map.setCenter(event.latLng);
            homeView.placeMapMarker();

            
            if( bridgeit.services.auth.isLoggedIn() && !isAnonymous() ){
                // Check if user record exists in document service
                if(!homeModel.userRecord['_id']){
                    bridgeit.services.documents.createDocument({
                        id: getUsername(),
                        document: {
                            '_id': getUsername(),
                            type: 'u.student',
                            location: '',
                            tickets: []
                        }
                    }).then(homeModel.postUserDone(event))['catch'](view.requestFail);
                }else{
                    homeModel.saveLocation(event);
                }
            }else{
                homeController.studentLogout('expired');
            }
        });
    },

    purchaseTicket: function(documentId){
        // No token, prompt student to login
        if(localStorage.getItem('bridgeitUToken') === undefined){
            $('#loginModal').modal('show');
            return;
        }
        if( bridgeit.services.auth.isLoggedIn() && !isAnonymous()){
            bridgeit.services.documents.getDocument({
                id: documentId,
            }).then(homeView.purchaseGetEventDone)['catch'](view.requestServiceFail('document service'));
        }else{
            homeController.studentLogout('expired');
        }
    },

    purchaseTicketSubmit: function(event){
        event.preventDefault();
        /* form element used to generically validate form elements (could also serialize the form if necessary)
        *  Also using form to create json post data from form's elements
        */
        var form = this;
        if(util.validate(form)){
            var id = (homeModel.userRecord['_id'] ? homeModel.userRecord['_id'] : getUsername());
            
            var doc = {
                '_id': id,
                type: (homeModel.userRecord['type'] ? homeModel.userRecord['type'] : 'u.student'),
                location: (homeModel.userRecord['location'] ? homeModel.userRecord['location'] : ''),
                tickets: (homeModel.userRecord['tickets'] ? homeModel.userRecord['tickets'] : [])
            };
            for(var i=0; i<form.ticketQuantity.value; i++){
                doc.tickets.push({name:form.ticketName.value});
            }

            bridgeit.services.documents.updateDocument({
                id: id,
                document: doc
            }).then(homeModel.purchaseTicketDone(ticketArray, form.ticketName.value, form.ticketQuantity.value))['catch'](homeView.ticketFail);
        }
    },

    cancelTicketPurchase: function(eventName){
        var doc = {
            '_id': homeModel.userRecord['_id'],
            type: homeModel.userRecord['type'],
            location: homeModel.userRecord['location'],
            tickets: homeModel.userRecord['tickets'].slice(0)
        };
        for(var i = 0; i < doc.tickets.length; i++){
            if( doc.tickets[i].name === eventName){
                doc.tickets.splice(i,1);
                break;
            }
        }

        bridgeit.services.documents.updateDocument({
            id: homeModel.userRecord['_id'],
            document: doc
        }).then(homeModel.ticketCancelDone(eventName))['catch'](homeView.ticketFail);
    }

};
