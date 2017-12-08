var endpointUrl = 'https://graph.facebook.com/v2.11';

var pages = [
    ['{page-name}', '{page-id}', '{access-token}'],
]

var index = 0;
var pageName = pages[index][0];
var pageId = pages[index][1];
var pageAccessToken = pages[index][2];

var conversationUrl = endpointUrl + '/' + pageId + '/conversations?access_token=' + pageAccessToken;

function httpGetAsync(id, url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(id, xmlHttp);
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

var threadIds = [];
var saveThreadIds = function (id, response) {
    console.log(response);
    var jsonResponse = JSON.parse(response.response);
    jsonResponse.data.forEach(function (value) {
        threadIds.push(value.id);
    });

    if (jsonResponse.paging && jsonResponse.paging.next && jsonResponse.paging.next !== '') {
        var syncThreadIds = httpGetAsync(id, jsonResponse.paging.next, saveThreadIds);
    }
};

var syncThreadIds = httpGetAsync(pageId, conversationUrl, saveThreadIds);

var csvString = 'thread_id,message_id,message,sender,is_me,created_time\n';
var responseToCsv = function (id, response) {

    var jsonResponse = JSON.parse(response.response);
    var threadId = id;
    
    var messages;
    if (jsonResponse.messages) {
        messages = jsonResponse.messages;
    } else {
        messages = jsonResponse;
    }

    messages.data.forEach(function (data) {
        var messageId = data.id;
        var message = data.message.replace(/\"/g, '');
        var sender = data.from.id;
        var is_me = data.from.id === pageId ? true : false;
        var created_time = data.created_time;

        var csv = '"' + threadId + '","' + messageId + '","' + message + '","' + sender + '","' + is_me + '","' + created_time + '"' + '\n';
        csvString += csv;
    });

   if (messages.paging && messages.paging.next && messages.paging.next !== '') {
       var syncThread = httpGetAsync(threadId, messages.paging.next, responseToCsv);
   }
};

threadIds.forEach(function (threadId) {
    var threadUrl = endpointUrl + '/' + threadId + '/?fields=id,messages{message,from,created_time},senders&access_token=' + pageAccessToken;
    var syncThread = httpGetAsync(threadId, threadUrl, responseToCsv);
});

var filename = pageName + '-messages-' + new Date() + '.csv';
var a = window.document.createElement('a');
a.href = window.URL.createObjectURL(new Blob([csvString], {type: 'text/csv'}));
a.download = filename;

// Append anchor to body.
document.body.appendChild(a);
a.click();
