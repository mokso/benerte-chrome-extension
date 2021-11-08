var apiUrl = "notset";

var userData = {
    "userid": null,
    "username": null,
    "basicauth": null,
    "beneapi": null
};

var needApiAuth = false;

document.addEventListener('DOMContentLoaded', function () {

    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const saveButton = document.getElementById('saveButton');
    const apiStatus = document.getElementById('apiStatus');
    const passwordArea = document.getElementById('passwordArea');

    loadConfig();
    saveButton.addEventListener("click", function() {
        userData.username = usernameInput.value;
        console.log("save button pressed, username: " + userData.username );
        InitBeneAPIConnection();
    });

    passwordInput.addEventListener("keypress", function onEvent(event) {
        if (event.key === "Enter") {
            saveButton.click();
        }
    });
});


function loadConfig() {
    
    console.log("Loading user data from localstorage...");
    chrome.storage.sync.get(['userid','username','basicauth','beneapi'], function (items) {
        if (items.userid != null) {
            userData.userid = items.userid;
        }
        else {
            console.log("userid not found");
            needApiAuth = true;
        }
        if (items.username != null) {
            userData.username = items.username;
            usernameInput.value = items.username;
        }
        else {
            needApiAuth = true;            
            console.log("username not found");
        }
        if (items.basicauth != null) {
            userData.basicauth = items.basicauth;
        }
        else {
            console.log("basicauth not found");
            needApiAuth = true;
        }
        if (items.beneapi != null) {
            userData.beneapi = items.beneapi;
        }
        else {
            console.log("beneapi not found");
            needApiAuth = true;
        }
        console.log("retrieved userdata: " + JSON.stringify(userData));

        if (needApiAuth) {
            apiStatus.textContent = "Not Authenticated";
            passwordArea.hidden=false;
        }
        else {
            apiStatus.textContent = "OK";
        }
    });
}

async function InitBeneAPIConnection() {
    await DiscoverAPI();
    await AuthenticateAPI(userData.username,passwordInput.value);
    await GetRTEToken();
}


async function DiscoverAPI() {
    var url = "https://discover.beneservices.com/api/user/?user=" + userData.username;
    console.log("fetching from url: " + url);
    let response = await fetch(url);
    let data = await response.json();
    if (data.length > 0) {
        apiAddress = data[0].apiEndpoint;
        console.log("api url is [" + apiAddress + "]");
        chrome.storage.sync.set({ "username": userData.username }, function () {
            console.log('Stored username = ' + userData.username);
        });
        chrome.storage.sync.set({ "beneapi": apiAddress }, function () {
            console.log('Stored beneapi = ' + apiAddress);
        });
        userData.beneapi = apiAddress;
        return apiAddress;
    }
    else {
        console.log("nothing found");
    }
}

async function AuthenticateAPI(username, password) {
    console.log("Authenticationg to BeneAPI as " + username);

    var url = userData.beneapi + "/authuser/" + username + "/";
    var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    var postData = { "UserName": username, "Password": password };
    let response = await fetch (url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(postData)
    });
    let data = await response.json();
    if (data.UserID) {
        userData.userid = data.UserID;
        userData.basicauth = window.btoa(username + ":" + data.SecretKey);
        console.log("authenticated succesfully");
        apiStatus.textContent = "Authenticated";
        SaveUserData();
    }
    else {
        console.log("authenticated failed :(");
    }
}

async function GetRTEToken() {
    console.log("Getting RTE token");
    var url = userData.beneapi + "token/" + userData.userid + "/rte/";
    var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + userData.basicauth
    }

    let response = await fetch (url, {
        method: "GET",
        headers: headers
    });
    if (response.ok) {
        let data = await response.json();
        console.log("RTE: " + JSON.stringify(data));
        return data;
    }
}

function SaveUserData() {
    console.log("Persisting userdata to localstorage...");
    chrome.storage.sync.set({ "username": userData.username }, function () {
        console.log('Stored username = ' + userData.username);
    });
    chrome.storage.sync.set({ "beneapi": userData.beneapi }, function () {
        console.log('Stored beneapi = ' + userData.beneapi);
    });
    chrome.storage.sync.set({ "basicauth": userData.basicauth }, function () {
        console.log('Stored beneapi = ' + userData.basicauth);
    });
    chrome.storage.sync.set({ "userid": userData.userid }, function () {
        console.log('Stored userid = ' + userData.userid);
    });
}
    

