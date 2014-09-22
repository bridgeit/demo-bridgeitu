window.quickUser = 'http://dev.bridgeit.io/authadmin/bridgeit.u/quickuser';
window.locationsService = 'http://dev.bridgeit.io/locate/bridgeit.u/locations';
window.regionsService = 'http://dev.bridgeit.io/locate/bridgeit.u/regions';

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

window.homeModel = {

    userRecord: {},

    retrieveEvents: function(){
        $.getJSON(window.documentService  + '?access_token=' + (localStorage.bridgeitUToken ? localStorage.bridgeitUToken : localStorage.bridgeitUAnonymousToken))
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
    },

    initializeStudent: function(){
        $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .fail(homeModel.initializeStudentFail)
        .done(homeModel.initializeStudentDone);
    },

    initializeStudentDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            homeModel.userRecord = data;
            homeView.displayTickets();
            homeView.setCurrentLocationText(data);
            homeModel.retrieveLocation();
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
        }
    },

    initializeStudentFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 404){
            // User Record doesn't exist.
            homeModel.userRecord = {};
            homeModel.userRecord['tickets'] = [];
            $('#evntTcktLst').html('');
            $('#crrntLctn').html('');
            homeController.locationMapInit();
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
    },

    updateStudent: function(){
        $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .fail(homeModel.initializeStudentFail)
        .done(homeModel.updateStudentDone);
    },

    updateStudentDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            homeModel.userRecord = data;
            homeView.displayTickets();
            homeView.setCurrentLocationText(data);
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
        }
    },

    retrieveLocation: function(){
        $.getJSON(window.locationsService  + '?access_token=' + localStorage.bridgeitUToken + '&results=one&query={"username":"' + localStorage.bridgeitUUsername + '"}&options={"sort":[["lastUpdated","desc"]]}')
        .fail(homeModel.retrieveLocationFail)
        .done(homeModel.retrieveLocationDone);
    },

    retrieveLocationDone: function (data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            homeController.locationMapInit(data['location']['geometry'].coordinates[1],data['location']['geometry'].coordinates[0]);
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Location', jqxhr.status);
        }
    },

    retrieveLocationFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 404){
            // 404 means the list is empty
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
        homeController.locationMapInit();
    },

    postUserDone: function(event){
        return function(data, textStatus, jqxhr){
            if( jqxhr.status === 201){
                homeModel.saveLocation(event);
            }else{
                view.serviceRequestUnexpectedStatusAlert('Post User', jqxhr.status);
            }
        }
    },

    saveLocation: function(event){
        var postData = {};
        postData['label'] = 'BridgeIt U Student Location';
        postData['location'] = {'geometry' : {}, 'properties' : {}};
        postData['location']['geometry'].coordinates = [event.latLng.lng(),event.latLng.lat()];
        postData['location']['geometry'].type = 'Point';
        postData['location']['properties'].label = 'Lat: ' + event.latLng.lat() + ' Long: ' + event.latLng.lng();
        postData['location']['properties'].timestamp = new Date().toISOString();
        $.ajax({
            url : window.locationsService + '?access_token=' + localStorage.bridgeitUToken,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(view.requestServiceFail('location service'))
        .done(homeView.locationSaveDone(postData['location']['properties'].label));
    },

    purchaseTicketDone: function(ticketArray, quantity, eventname){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 201){
                view.successAlert('<strong>' + quantity + ' ' + eventname + '</strong> ticket(s) purchased.');
                homeModel.userRecord['tickets'] = homeModel.userRecord['tickets'].concat(ticketArray);
                homeView.displayTickets();
                $('#purchaseTcktFrm')[0].reset();
                $('#purchasePanel').removeClass('panel-primary');
                $('#purchaseBttn').prop('disabled', true);
            }else{
                view.serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
            }
        }
    },

    ticketCancelDone: function(eventname){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 201){
                view.successAlert('<strong>' + eventname + '</strong> ticket purchase cancelled.');
                for(var i=0; i<homeModel.userRecord['tickets'].length; i++){
                    if(homeModel.userRecord['tickets'][i].name === eventname){
                        homeModel.userRecord['tickets'].splice(i,1);
                        break;
                    }
                }
                homeView.displayTickets();
            }else{
                view.serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
            }
        }
    },

    handleAnonPush: function(){
        console.log('BridgeIt U Anonymous Push Callback');
        homeModel.retrieveEvents();
        model.getNotifications("anonymous", function (data) {
            data.forEach(model.displayNotification);
        });
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

    retrieveRegionsDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
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
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Regions', jqxhr.status);
        }
    },

    retrieveRegionsFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 404){
            // 404 means the list is empty
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
    },

    locationSaveDone: function(location){
        return function(data, textStatus, jqxhr){
            if(jqxhr.status === 201){
                view.successAlert('<strong>' + location + '</strong> Location Saved');
            }else{
                view.serviceRequestUnexpectedStatusAlert('Save Location', jqxhr.status);
            }
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
        var lctnLabel = $('#crrntLctn');
        lctnLabel.html('');
        if(data.location){
            lctnLabel.html(data.location);
        }
    },

    ticketFail: function(jqxhr, textStatus, errorThrown){
        if(jqxhr.status === 401){
            // 401 unauthorized
            view.errorAlert('<strong>Unauthorized</strong> to make a purchase: status <strong>' + jqxhr.status + '</strong>');
        }else{
            view.requestFail(jqxhr, textStatus, errorThrown);
        }
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

    purchaseGetEventDone: function(data, textStatus, jqxhr){
        if( jqxhr.status === 200){
            $('#purchasePanel').addClass('panel-primary');
            $('#purchaseBttn').prop('disabled', false);
            document.getElementById('ticketQuantity').value = null;
            document.getElementById('ticketName').value = data.name;
            document.getElementById('ticketDetails').value = data.details;
        }else{
            view.serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
        }
    }

};

window.homeController = {

    initHomePage: function() {
        bridgeit.useServices({
                realm:"bridgeit.u",
                serviceBase:"http://dev.bridgeit.io"});

        $('#purchaseBttn').prop('disabled', true);
        $('#purchaseTcktFrm').submit(homeController.purchaseTicketSubmit);
        $('#loginModalForm').submit(controller.loginSubmit());
        $('#logoutNavbar').click(controller.logoutClick());
        $('#registerModalContent').hide();
        $('#register').click(homeView.toggleLoginRegister);
        $('#registerModalForm').submit(homeController.registerSubmit);

        // No Student token
        if(localStorage.bridgeitUToken === undefined){
            view.showLoginNavbar();
            homeView.hidePanels();
            // Anonymous token for viewing events
            if(util.tokenValid(localStorage.bridgeitUAnonymousToken, localStorage.bridgeitUAnonymousTokenExpires)){
                homeModel.retrieveEvents();
                controller.registerPushUsernameGroup('anonymous',localStorage.bridgeitUAnonymousToken);
            }else{
                homeController.anonymousLogin();
            }
            return;
        // Valid Student token - logged in
        } else if(util.tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            homeController.studentLoggedIn();
            controller.registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
        // Invalid Student token - log out
        }else{
            homeController.studentLogout('expired');
        }
        // Get student push notifications
        model.handlePush();
    },

    anonymousLogin: function(){
        // Automatic auth service login with anonymous user that only has bridgeit.doc.getDocument permission
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
            localStorage.bridgeitUAnonymousTokenExpires = data.expires_in;
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
            localStorage.bridgeitUTokenExpires = data.expires_in;
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
    },

    studentLoggedIn: function(){
        $('#purchaseTcktFrm')[0].reset();
        $('#purchasePanel').show('slow');
        $('#ticketsPanel').show('slow');
        $('#locationPanel').show();
        view.loggedIn(localStorage.bridgeitUUsername);
        homeModel.initializeStudent();
    },

    studentLogout: function(expired){
        localStorage.removeItem('bridgeitUToken');
        localStorage.removeItem('bridgeitUTokenExpires');
        localStorage.removeItem('bridgeitUUsername');
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
            // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
            // Login is required to retrieve a token so purchases can be made and notifications received
            localStorage.bridgeitUToken = data.token.access_token;
            localStorage.bridgeitUTokenExpires = data.token.expires_in;
            localStorage.bridgeitUUsername = $('#regUserName').val();
            controller.registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
            homeView.toggleLoginRegister();
            homeController.studentLoggedIn();
        }else{
            view.serviceRequestUnexpectedStatusAlert('Register', jqxhr.status);
        }
    },

    locationMapInit: function(lat, lon){
        window.map = new google.maps.Map(document.getElementById('map-canvas'), window.mapOptions);
        if(lat !== undefined && lon !== undefined){
            homeView.setMapPosition(lat, lon);
        }

        $.getJSON(window.regionsService  + '?access_token=' + localStorage.bridgeitUToken)
        .fail(homeView.retrieveRegionsFail)
        .done(homeView.retrieveRegionsDone);

        google.maps.event.addListener(window.map, 'click', function(event) {
            window.map.setCenter(event.latLng);
            homeView.placeMapMarker();

            if(util.tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
                // Check if user record exists in document service
                if(!homeModel.userRecord['_id']){
                    var postData = {};
                    // Ternary operator necessary in case user record does not exist in doc service
                    postData['_id'] = localStorage.bridgeitUUsername;
                    postData['type'] = 'u.student';
                    postData['location'] = '';
                    postData['tickets'] = [];
                    $.ajax({
                        url : window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken,
                        type: 'POST',
                        dataType : 'json',
                        contentType: 'application/json; charset=utf-8',
                        data : JSON.stringify(postData)
                    })
                    .fail(view.requestFail)
                    .done(homeModel.postUserDone(event));
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
        if(localStorage.bridgeitUToken === undefined){
            $('#loginModal').modal('show');
            return;
        }
        if(util.tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            $.getJSON( window.documentService + '/' + documentId + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
            .fail(view.requestServiceFail('document service'))
            .done(homeView.purchaseGetEventDone);
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
            var postData = {};
            // Ternary operator necessary in case user record does not exist in doc service
            postData['_id'] = (homeModel.userRecord['_id'] ? homeModel.userRecord['_id'] : localStorage.bridgeitUUsername);
            postData['type'] = (homeModel.userRecord['type'] ? homeModel.userRecord['type'] : 'u.student');
            postData['location'] = (homeModel.userRecord['location'] ? homeModel.userRecord['location'] : '');
            postData['tickets'] = (homeModel.userRecord['tickets'] ? homeModel.userRecord['tickets'] : []);
            var ticketArray = [];
            for(var i=0; i<form.ticketQuantity.value; i++){
                ticketArray.push({name:form.ticketName.value});
            }
            postData['tickets'] = postData['tickets'].concat(ticketArray);
            $.ajax({
                url : window.documentService + '/' + postData['_id'] + '?access_token=' + localStorage.bridgeitUToken,
                type: 'PUT',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(homeView.ticketFail)
            .done(homeModel.purchaseTicketDone(ticketArray, form.ticketName.value, form.ticketQuantity.value));
        }
    },

    cancelTicketPurchase: function(eventName){
        var postData = {};
        postData['_id'] = homeModel.userRecord['_id'];
        postData['type'] = homeModel.userRecord['type'];
        postData['location'] = homeModel.userRecord['location'];
        // slice gives us a new array
        postData['tickets'] = homeModel.userRecord['tickets'].slice(0);
        for(var i=0; i<postData['tickets'].length; i++){
            if(postData['tickets'][i].name === eventName){
                postData['tickets'].splice(i,1);
                break;
            }
        }
        $.ajax({
            url : window.documentService + '/' + postData['_id'] + '?access_token=' + localStorage.bridgeitUToken,
            type: 'PUT',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(homeView.ticketFail)
        .done(homeModel.ticketCancelDone(eventName));
    }

};