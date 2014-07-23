window.quickUser = 'http://dev.bridgeit.io/authadmin/bridgeit.u/quickuser';
window.ticketFlow = 'http://dev.bridgeit.io/code/bridgeit.u/ticket';
window.locationsService = 'http://dev.bridgeit.io/locate/bridgeit.u/locations';
window.regionsService = 'http://dev.bridgeit.io/locate/bridgeit.u/regions';
window.userRecord = {};
// gmap location
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
window.markers = [];

function initIndexPage() {
    bridgeit.useServices({
            realm:"bridgeit.u",
            serviceBase:"http://dev.bridgeit.io"});

    $('#purchaseBttn').prop('disabled', true);
    $('#purchaseTcktFrm').submit(purchaseTicketSubmit);
    $('#loginModalForm').submit(loginSubmit());
    $('#logoutNavbar').click(logoutClick());
    $('#registerModalContent').hide();
    $('#register').click(toggleLoginRegister);
    $('#registerModalForm').submit(registerSubmit);
    // Anonymous token for viewing events
    if(tokenValid(localStorage.bridgeitUAnonymousToken, localStorage.bridgeitUAnonymousTokenExpires)){
        retrieveEvents();
        registerPushUsernameGroup('anonymous',localStorage.bridgeitUAnonymousToken);
    }else{
        anonymousLogin();
    }
    // No Student token
    if(localStorage.bridgeitUToken === undefined){
        showLoginNavbar();
        $('#purchasePanel').hide();
        $('#ticketsPanel').hide();
        $('#locationPanel').hide();
    // Valid Student token - logged in
    } else if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        studentLoggedIn();
        registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
    // Invalid Student token - log out
    }else{
        studentLogout('expired');
    }
}

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
    .fail(requestServiceFail('auth service'))
    .done(anonymousLoginDone);
}

function anonymousLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        localStorage.bridgeitUAnonymousToken = data.access_token;
        localStorage.bridgeitUAnonymousTokenExpires = data.expires_in;
        retrieveEvents();
        registerPushUsernameGroup('anonymous',localStorage.bridgeitUAnonymousToken);
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
        registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
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
    // clear previous user notices
    removeNoticesInfoClass();
    $('#alertDiv').html('');
    if(expired){
        $('#loginModal').modal('show');
        loginErrorAlert('Session Expired');
    }
}

function toggleLoginRegister(event){
    $('#loginModalContent').toggle();
    $('#registerModalContent').toggle();
}

function registerSubmit(event){
    event.preventDefault();
    /* form element used to generically validate form elements (could also serialize the form if necessary)
    *  Also using form to create post data from form's elements
    */
    var form = this;
    if(validate(form) && confirmPassword(form.regPassWord.value, form.confirmPassWord.value)){
        var postData = { user: {username: form.regUserName.value,
                                password: form.regPassWord.value,
                                password_confirm: form.confirmPassWord.value} };
        $.ajax({
            url : window.quickUser,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(registerFail)
        .done(registerDone);
    }
}

function registerFail(jqxhr, textStatus, errorThrown){
    registerErrorAlert(textStatus);
}

function registerDone(data, textStatus, jqxhr){
    if( jqxhr.status === 201){
        // We don't retrieveEvents for non-admin because they have already been retrieved for viewing anonymously
        // Login is required to retrieve a token so purchases can be made and notifications received
        localStorage.bridgeitUToken = data.token.access_token;
        localStorage.bridgeitUTokenExpires = data.token.expires_in;
        localStorage.bridgeitUUsername = $('#regUserName').val();
        registerPushUsernameGroup(localStorage.bridgeitUUsername,localStorage.bridgeitUToken);
        toggleLoginRegister();
        studentLoggedIn();
    }else{
        serviceRequestUnexpectedStatusAlert('Register', jqxhr.status);
    }
}

function closeRegisterModal(){
    resetRegisterBody();
    toggleLoginRegister();
    resetLoginBody();
}

function resetRegisterBody(){
    resetForm('registerModalForm');
    $('#alertRegisterDiv').html('');
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
            if(obj.type === undefined){
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

function updateStudent(){
    $.getJSON( window.documentService + '/' + localStorage.bridgeitUUsername + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
    .fail(initializeStudentFail)
    .done(updateStudentDone);
}

function initializeStudentDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        window.userRecord = data;
        displayTickets();
        setCurrentLocationText(data);
        retrieveLocation();
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
    }
}

function updateStudentDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        window.userRecord = data;
        displayTickets();
        setCurrentLocationText(data);
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve User Record', jqxhr.status);
    }
}

function setCurrentLocationText(data){
    var lctnLabel = $('#crrntLctn');
    lctnLabel.html('');
    if(data.location){
        lctnLabel.html(data.location);
    }
}

function initializeStudentFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 404){
        // User Record doesn't exist.
        window.userRecord = {};
        window.userRecord['tickets'] = [];
        $('#evntTcktLst').html('');
        $('#crrntLctn').html('');
        locationMapInit();
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function retrieveLocation(){
    $.getJSON(window.locationsService  + '?access_token=' + localStorage.bridgeitUToken + '&results=one&query={"username":"' + localStorage.bridgeitUUsername + '"}&options={"sort":[["lastUpdated","desc"]]}')
    .fail(retrieveLocationFail)
    .done(retrieveLocationDone);
}

function retrieveLocationDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        locationMapInit(data['location']['geometry'].coordinates[1],data['location']['geometry'].coordinates[0]);
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Location', jqxhr.status);
    }
}

function retrieveLocationFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 404){
        // 404 means the list is empty
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
    locationMapInit();
}

var locationSaveDone = function(location){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status === 201){
            successAlert('<strong>' + location + '</strong> Location Saved');
        }else{
            serviceRequestUnexpectedStatusAlert('Save Location', jqxhr.status);
        }
    };
};

function purchaseTicket(documentId){
    // No token, prompt student to login
    if(localStorage.bridgeitUToken === undefined){
        $('#loginModal').modal('show');
        return;
    }
    if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + localStorage.bridgeitUToken + '&results=one')
        .fail(requestServiceFail('document service'))
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
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
    }
}

function purchaseTicketSubmit(event){
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

function locationMapInit(lat, lon){
    window.map = new google.maps.Map(document.getElementById('map-canvas'), window.mapOptions);
    if(lat !== undefined && lon !== undefined){
        setMapPosition(lat, lon);
    }

    $.getJSON(window.regionsService  + '?access_token=' + localStorage.bridgeitUToken)
    .fail(retrieveRegionsFail)
    .done(retrieveRegionsDone);

    google.maps.event.addListener(window.map, 'click', function(event) {
        window.map.setCenter(event.latLng);
        placeMapMarker();

        if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
            // Check if user record exists in document service
            if(!window.userRecord['_id']){
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
                .fail(requestFail)
                .done(postUserDone(event));
            }else{
                saveLocation(event);
            }
        }else{
            studentLogout('expired');
        }
    });
}

var postUserDone = function(event){
    return function(data, textStatus, jqxhr){
        if( jqxhr.status === 201){
            saveLocation(event);
        }else{
            serviceRequestUnexpectedStatusAlert('Post User', jqxhr.status);
        }
    }
};

function saveLocation(event){
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
    .fail(requestServiceFail('location service'))
    .done(locationSaveDone(postData['location']['properties'].label));
}

function retrieveRegionsDone(data, textStatus, jqxhr){
    if( jqxhr.status === 200){
        $.each(data, function(i, obj) {
            window.map.data.addGeoJson(obj.location);
        });
        window.map.data.forEach(function(feature){
            map.data.setStyle(function(feature) {
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
        serviceRequestUnexpectedStatusAlert('Retrieve Regions', jqxhr.status);
    }
}

function retrieveRegionsFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 404){
        // 404 means the list is empty
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function setMapPosition(lat,lon){
    window.map.setCenter(new google.maps.LatLng(lat,lon) );
    placeMapMarker();
    google.maps.event.trigger(window.map, 'resize');
}

function placeMapMarker(){
    clearOverlays();
    window.markers.push(new google.maps.Marker({
      position: window.map.getCenter(),
      map: window.map,
      title: 'You are here.'
      })
    );
}

function clearOverlays() {
    for (var i = 0; i < window.markers.length; i++ ) {
        window.markers[i].setMap(null);
    }
    window.markers.length = 0;
}