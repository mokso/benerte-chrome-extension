var userData = {
    "userid": null,
    "username": null,
    "basicauth": null,
    "beneapi": null
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
    console.log("Roken expires" + Date(tokendata.exp));


    console.log("Starting rte connection");

    var connection = new signalR.HubConnectionBuilder()
    .withUrl(rteAddress, { accessTokenFactory: () => rteInfo.Token })
    .build();

    rteconn = connection;

    connection.start().then(function () {
        console.log("rte connected");
        AddSubscriptions();
    }).catch(function (err) {
        console.log(err.toString());
    });

    connection.on("MessageReceived", function (message) {
        var eventType = message.data.eventType;
        console.log("MessageReceived: " + JSON.stringify(message.data));
        chrome.notifications.create('', {
            title: "OMG! Event [" + eventType +"] recieved!",
            message: JSON.stringify(message.data),
            iconUrl: '/images/benebot.png',
            type: 'basic'
          });


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

function AddSubscriptions() {
    // Add some subs
    const eventlist = ["UserAvailability","UserSetting","UserCallInComing","UserCallInConnected","UserCallInDisconnected","UserCallOutGoing","UserCallOutConnected","UserCallOutDisconnected"];
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
