var userData = {
    "userid": null,
    "username": null,
    "basicauth": null,
    "beneapi": null,
    "queues": null
};

var rte = null

var rteconn;



const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], function (result) {
        if (result[key] === undefined) {
          reject();
        } else {
          resolve(result[key]);
        }
      });
    });
  };



async function getData() {
    console.log("Loading user data from localstorage...");
    let userid = await readLocalStorage('userid');
    let username = await readLocalStorage('username');
    let basicauth = await readLocalStorage('basicauth');
    let beneapi = await readLocalStorage('beneapi');
    userData = {
        "userid": userid,
        "username": username,
        "basicauth": basicauth,
        "beneapi": beneapi
    };
    let rteInfo = await GetRTEToken();
    rte = rteInfo;
    rteAddress="https://" + rteInfo.WSSEndpoint;

    // Get expiration 
    var tokendata = JSON.parse(atob(rteInfo.Token.split(".")[1]));
    console.log(tokendata);
    console.log("Token expires" + Date(tokendata.exp));


    console.log("Starting rte connection");

    var connection = new signalR.HubConnectionBuilder()
    .withUrl(rteAddress, { accessTokenFactory: () => rteInfo.Token })
    .build();

    rteconn = connection;

    connection.start().then(function () {
        console.log("rte connected");
        GetAvailableSubscriptions();
        //AddSubscriptions();
    }).catch(function (err) {
        console.log(err.toString());
    });

    connection.on("MessageReceived", function (message) {
        ProcessRteMessage(message.data);
    });

    connection.on("SubscribeDetails", function (message) {
        console.log("Subscription result: " + JSON.stringify(message));
    });

    connection.on("UnsubscribeDetails", function (message) {
        console.log("Unsubscription result: " + JSON.stringify(message));
    });

    connection.on("UnsubscribeAllDetails", function (message) {
        console.log("Unsubscribe All result: " + JSON.stringify(message));
    });

    connection.on("AvailableSubscriptions", function (message) {
        console.log("Events list: " + JSON.stringify(message));

    });

}

getData();


// BeneAPI functions
async function GetUserQueues() {
    console.log("Getting Queues ");
    var url = userData.beneapi + "queues/?OnlyForUser=" + userData.userid;
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
        console.log("Queues: " + JSON.stringify(data));
        userData.queues = data;
    }
}


function AddSubscriptions() {
    // Add some subs
    const eventlist = ["UserAvailability","UserStatus"];
    //["UserAvailability","UserSetting","UserStatus","UserCallInComing","UserCallOutGoing","QueueCallInUserAllocated"];
    //,"UserContactCard","QueueCallInComing","QueueCallInArrived","QueueCallInUserAllocated","QueueCallInUserConnected","QueueCallInUserCancelled","QueueCallInOverflow","QueueCallInTransferStarted","QueueCallInTransferConnected","QueueCallInTransferCancelled","QueueCallInDisconnected","UserCallInArrived","UserCallInUserAllocated","UserCallInUserConnected","UserCallInUserCancelled","UserCallInOverflow","UserCallInTransferStarted","UserCallInTransferConnected","UserCallInTransferCancelled","UserCallInUserOverflow","QueueStatus","CallbackCreated","CallbackUpdated","CallbackClosed","UserAlert","UserQueueAlert","UserAction","UserActionMobileCall","CallbackChanged","UserCallbackChanged","UserWrapUpEnabled","UserWrapUpStarted","UserWrapUpTerminated","UserWrapUpRequestTerminate","UserConfigurationSetNextCLI"
    
    var subscriptions = new Array();
    
    eventlist.forEach(item => subscriptions.push({EntityId: userData.userid, EventName: item}));
    
    console.log("subscribing to " + JSON.stringify(subscriptions));
    chrome.notifications.create('', {
        title: 'Just wanted to notify you',
        message: 'Creating some RTE-subscriptions',
        iconUrl: '/images/benebot.png',
        type: 'basic'
      });

    rteconn.invoke("Subscribe", subscriptions)
        .catch(function (err) {
            return console.error(err.toString());
        })
}

async function AddQueueSubscriptions(){
    var queueSubs = new Array();    
    userData.queues.forEach(item => queueSubs.push({EntityId: item.Id, EventName: "QueueCallInUserAllocated"}));
    rteconn.invoke("Subscribe", queueSubs)
        .catch(function (err) {
            return console.error(err.toString());
        })
}

function GetAvailableSubscriptions() {
    rteconn.invoke("AvailableSubscriptions").then(function (payload) {
        console.log("Available subscriptions " + JSON.stringify(payload));
    }).catch(function (err) {
        return console.error(err.toString());
    });
    /*
    rteconn.invoke("AvailableSubscriptions")
        .catch(function (err) {
            return console.error(err.toString());
        })
        */
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

function ProcessRteMessage(message) {
    // Eventtypes currently numeric, but going to change to textual form
    var eventType = message.eventType;
    console.log("Processing message: " + JSON.stringify(message));

    switch(eventType) {
        //UserAvailability = 1,
        case 1:
            HandleUserAvailability(message);
            break;

        //UserCallInComing = 10,
        case 10:
            HandleUserCallInComing(message);
            break;
        // QueueCallInUserAllocated = 102
        case 102:
            break;
        //QueueStatus = 140
        case  140:
            break;
        //UserStatus = 141
        case 141:
            break;
        default:
            console.log("No idea what to do with eventtype "+ eventType);
    }
}

function HandleUserCallInComing(message) {
    var caller = message.callerNumber;

    chrome.notifications.create('', {
        title: "Incoming direct call",
        message: "Caller: " + caller ,
        iconUrl: '/images/benebot.png',
        type: 'basic'
    });

    // open tab and search google with caller number
    var newURL = "http://google.com/?q="+caller;
    chrome.tabs.create({ 
        url: newURL 
    });
}

function HandleUserAvailability(message) {
    const rtf = new Intl.RelativeTimeFormat('en');
    var ava = message.availability;
    var note = message.note;

    // end time is UTC even not suffixed with Z. Fix coming, but workaround until then
    var endTimeString = message.endTime;
    if (!endTimeString.endsWith("Z")) {
        endTimeString = endTimeString + "Z"
    }
    var endTime = new Date(endTimeString);
    var now = new Date();

    if (endTime > new Date(9999,01,01)) {
        endString = ".";
    }
    else {
        endString = ". This ends " + formatEndTime(endTime, "en")
    }

    chrome.notifications.create('', {
        title: "Your availabilty changed!",
        message: "Your availability is now " + ava + " " + endString,
        iconUrl: '/images/benebot.png',
        type: 'basic'
    });
}

function formatEndTime(value, locale) {
    const date = new Date(value);
    const formatter = new Intl.RelativeTimeFormat(locale);

    const deltaDays = (date.getTime() - Date.now()) / (1000 * 3600 * 24);
    if (deltaDays > 0.9) {
        return formatter.format(Math.round(deltaDays), 'days');
    }

    const deltaHours = (date.getTime() - Date.now()) / (1000 * 3600);
    if (deltaHours > 0.9) {
        return formatter.format(Math.round(deltaHours), 'hours');
    }

    const deltaMins = (date.getTime() - Date.now()) / (1000 * 60);
    return formatter.format(Math.round(deltaMins), 'minutes');
  }