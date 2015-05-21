var port = process.env.PORT || 3000,
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime');

var log = function (entry) {
    fs.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};

var debug = function (entry) {
    console.log(entry);
}

var send404 = function (response) {
    response.writeHead(404, {"Content-type": "text/plain"});
    response.write("404 not found");
    response.end();
};

var sendPage = function (response, filePath, fileContents) {
    response.writeHead(200, {"Content-type": mime.lookup(path.basename(filePath))});
    response.end(fileContents);
};

var serverWorking = function (response, absPath) {
    fs.exists(absPath, function (exists) {
        if (exists) {
            fs.readFile(absPath, function (err, data) {
                if (err) {
                    log("Error occured: " + err);
                    send404(response);
                } else {
                    sendPage(response, absPath, data);
                }
            });
        } else {
            log("Request for non-existent resource: " + absPath);
            send404(response);
        }
    })
};

var server = http.createServer(function (request, response) {
    var filePath;

    if ('GET' == request.method ) {
        if ('/' == request.url ) {
            filePath = "public/index.html";
        } else {
            filePath = "public" + request.url;
        }
    }

    var absPath = "./" + filePath;
    serverWorking(response, absPath);
});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log('Server running at http://127.0.0.1:' + port + '/');
