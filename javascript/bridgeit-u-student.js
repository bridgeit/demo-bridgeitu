window.ticketFlow = 'http://dev.bridgeit.io/code/bridgeit.u/ticket';
window.userRecord = {};
// gmap location
window.map = null;
window.mapOptions = {
    zoom: 15,
    maxZoom: 16,
    draggable: false,
    center: new google.maps.LatLng(51.07816,-114.135801),
    mapTypeId: google.maps.MapTypeId.ROADMAP
};
window.markers = [];
window.center = null;
window.counter = 0;
window.locations = ['Residence','Computer Science Building','Off Campus'];
window.randomLocation = (Math.floor(Math.random() * locations.length)) + 1;
window.currentLocation = 'You are here.';

function anonymousLogin(){
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
    .fail(requestFail)
    .done(anonymousLoginDone);
}

function anonymousLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        localStorage.bridgeitUAnonymousToken = data.access_token;
        localStorage.bridgeitUAnonymousTokenExpires = data.expires_in;
        retrieveEvents();
        registerPushUsernameGroup('anonymous');
    }else{
        serviceRequestUnexpectedStatusAlert('Anonymous Login', jqxhr.status);
    }
}

function studentLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made and notifications received
        localStorage.bridgeitUToken = data.access_token;
        localStorage.bridgeitUTokenExpires = data.expires_in;
        localStorage.bridgeitUUsername = $('#userName').val();
        registerPushUsernameGroup(localStorage.bridgeitUUsername);
        studentLoggedIn();
    }else{
        serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
    }
}

function studentLoggedIn(){
    $('#purchaseTcktFrm')[0].reset();
    $('#purchasePanel').show('slow');
    $('#ticketsPanel').show('slow');
    $('#locationPanel').show();
    uiLoggedIn(localStorage.bridgeitUUsername);
    initializeStudent();
}

function studentLogout(expired){
    localStorage.removeItem('bridgeitUToken');
    localStorage.removeItem('bridgeitUTokenExpires');
    localStorage.removeItem('bridgeitUUsername');
    $('#purchasePanel').hide();
    $('#ticketsPanel').hide();
    $('#locationPanel').hide();
    showLoginNavbar();
    $('#welcome').html('');
    if(expired){
        $('#loginModal').modal('show');
        loginErrorAlert('Session Expired');
    }
}

function retrieveEvents(){
    $.getJSON(window.documentService  + '?access_token=' + localStorage.bridgeitUAnonymousToken)
    .fail(retrieveEventsFail)
    .done(retrieveEventsDone);
}

function retrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html('');
        $.each(data, function(i, obj) {
            // Using Document Service to store users and notifications, this will skip them
            if(!obj.type){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<a href="#" class="list-group-item" onclick="purchaseTicket(\'' + obj._id + '\');">' + obj.name + '</a>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function initializeStudent(){
    $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
    .fail(initializeStudentFail)
    .done(initializeStudentDone);
}

function initializeStudentDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        window.userRecord = data;
        displayTickets();
        var lctnLabel = $('#crrntLctn');
        lctnLabel.html('');
        if(data.location){
            lctnLabel.html(data.location);
            window.currentLocation = data.location;
        }else{
            window.currentLocation = 'You are here.';
        }
        locationMapInit();
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
    }
}

function initializeStudentFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 404){
        // User Record doesn't exist.
        window.userRecord = {};
        window.userRecord['tickets'] = [];
        $('#evntTcktLst').html('');
        $('#crrntLctn').html('');
        window.currentLocation = 'You are here.';
        locationMapInit();
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

var locationSaveDone = function(location){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status === 201){
            successAlert('<strong>' + location + '</strong> Location Saved');
            window.userRecord['location'] = location;
            $('#crrntLctn').html(location);
        }else{
            serviceRequestUnexpectedStatusAlert('Save Location', jqxhr.status);
        }
    };
};

function purchaseTicket(documentId){
    // No token, prompt student to login
    if(!localStorage.bridgeitUToken){
        $('#loginModal').modal('show');
        return;
    }
    if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .fail(requestFail)
        .done(purchaseGetEventDone);
    }else{
        studentLogout('expired');
    }
}

function purchaseGetEventDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        $('#purchasePanel').addClass('panel-primary');
        $('#purchaseBttn').prop('disabled', false);
        document.getElementById('ticketQuantity').value = null;
        document.getElementById('ticketName').value = data.name;
        document.getElementById('ticketDetails').value = data.details;
        $('#purchaseTcktFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['access_token'] = localStorage.bridgeitUToken;
                postData['eventname'] = form.ticketName.value;
                postData['quantity'] = form.ticketQuantity.value;
                // Also submit user record to be updated in purchaseFlow
                var submittedUserRecord = {};
                // Ternary operator necessary in case user record does not exist in doc service
                submittedUserRecord['_id'] = (window.userRecord['_id'] ? window.userRecord['_id'] : localStorage.bridgeitUUsername);
                submittedUserRecord['type'] = (window.userRecord['type'] ? window.userRecord['type'] : 'u.student');
                submittedUserRecord['location'] = (window.userRecord['location'] ? window.userRecord['location'] : '');
                submittedUserRecord['tickets'] = (window.userRecord['tickets'] ? window.userRecord['tickets'] : []);
                var ticketArray = [];
                for(var i=0; i<form.ticketQuantity.value; i++){
                    ticketArray.push({name:form.ticketName.value});
                }
                submittedUserRecord['tickets'] = submittedUserRecord['tickets'].concat(ticketArray);
                postData['user_record'] = submittedUserRecord;
                $.ajax({
                    url : window.ticketFlow,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(ticketFail)
                .done(purchaseTicketDone(ticketArray));
            }
        }));
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
    }
}

function ticketFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 401){
        // 401 unauthorized
        errorAlert('<strong>Unauthorized</strong> to make a purchase: status <strong>' + jqxhr.status + '</strong>');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

var purchaseTicketDone = function(ticketArray){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status === 200){
            successAlert('<strong>' + data.quantity + ' ' + data.eventname + '</strong> ticket(s) purchased.');
            window.userRecord['tickets'] = window.userRecord['tickets'].concat(ticketArray);
            displayTickets();
            $('#purchaseTcktFrm')[0].reset();
            $('#purchasePanel').removeClass('panel-primary');
            $('#purchaseBttn').prop('disabled', true);
        }else{
            serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
        }
    }
};

function cancelTicketPurchase(eventName){
    var postData = {};
    postData['access_token'] = localStorage.bridgeitUToken;
    postData['eventname'] = eventName;
    // Also submit user record to be updated in purchaseCancelFlow
    var submittedUserRecord = {};
    submittedUserRecord['_id'] = window.userRecord['_id'];
    submittedUserRecord['type'] = window.userRecord['type'];
    submittedUserRecord['location'] = window.userRecord['location'];
    // slice gives us a new array
    submittedUserRecord['tickets'] = window.userRecord['tickets'].slice(0);
    for(var i=0; i<submittedUserRecord['tickets'].length; i++){
        if(submittedUserRecord['tickets'][i].name === eventName){
            submittedUserRecord['tickets'].splice(i,1);
            break;
        }
    }
    postData['user_record'] = submittedUserRecord;
    $.ajax({
        url : window.ticketFlow,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(postData)
    })
    .fail(ticketFail)
    .done(ticketCancelDone);
}

function ticketCancelDone(data, textStatus, jqxhr){
    if(jqxhr.status === 200){
        successAlert('<strong>' + data.eventname + '</strong> ticket purchase cancelled.');
        for(var i=0; i<window.userRecord['tickets'].length; i++){
            if(window.userRecord['tickets'][i].name === data.eventname){
                window.userRecord['tickets'].splice(i,1);
                break;
            }
        }
        displayTickets();
    }else{
        serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
    }
}

function displayTickets(){
    var $evntTcktLst = $('#evntTcktLst');
    $evntTcktLst.html('');
    for (var key in window.events) {
       if (window.events.hasOwnProperty(key) ){
           for (var i=0; i<window.userRecord.tickets.length; i++){
               if(window.userRecord.tickets[i].name === window.events[key]){
                   $evntTcktLst.append('<div class="list-group-item">' + window.userRecord.tickets[i].name + '<a title="Cancel Ticket Purchase" onclick="cancelTicketPurchase(\'' + window.userRecord.tickets[i].name + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a></div>');
               }
           }

       }
    }
}

function locationMapInit(){
    window.map = new google.maps.Map(document.getElementById('map-canvas'), window.mapOptions);
    navigator.geolocation.getCurrentPosition(geolocationSetPosition,geolocationError,{timeout:5000});

    google.maps.event.addListener(window.map, 'click', function(event) {
        var locationIndex = ((window.randomLocation + (window.counter++)) % 3) + 1;
        window.currentLocation = window.locations[locationIndex-1];
        window.map.setCenter(event.latLng);
        placeMapMarker();

        if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            var postData = {};
            // Ternary operator necessary in case user record does not exist in doc service
            postData['_id'] = (window.userRecord['_id'] ? window.userRecord['_id'] : localStorage.bridgeitUUsername);
            postData['type'] = (window.userRecord['type'] ? window.userRecord['type'] : 'u.student');
            postData['location'] = window.currentLocation;
            postData['tickets'] = (window.userRecord['tickets'] ? window.userRecord['tickets'] : []);
            $.ajax({
                url : window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken,
                type: 'POST',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(requestFail)
            .done(locationSaveDone(window.currentLocation));
        }else{
            studentLogout('expired');
        }
    });
    // TODO:  This call appears to prevent future calls to navigator.geolocation.getCurrentPosition from working in Chrome
    //        Investigate when needed.
    //navigator.geolocation.watchPosition(geolocationSetPosition);
}

function geolocationSetPosition(pos){
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    window.map.setCenter(new google.maps.LatLng(lat,lon) );
    placeMapMarker();
    google.maps.event.trigger(window.map, 'resize');
}

function geolocationError(){
    errorAlert('<strong>Geolocation</strong> problem setting map location.');
}

function placeMapMarker(){
    clearOverlays();
    window.markers.push(new google.maps.Marker({
      position: window.map.getCenter(),
      map: window.map,
      title: window.currentLocation
      })
    );
}

function clearOverlays() {
    for (var i = 0; i < window.markers.length; i++ ) {
        window.markers[i].setMap(null);
    }
    window.markers.length = 0;
}