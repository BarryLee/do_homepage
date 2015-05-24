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

var send304 = function (response) {
    response.writeHead(304);
    response.end();
};

var sendResponse = function (request, response, filePath, fileContents, stat) {
    var imsHeader = request.headers['if-modified-since'];
    var mtime = new Date(stat.mtime).toGMTString();
    if (imsHeader && mtime == imsHeader) {
        send304(response);
    } else {
        sendPage(response, filePath, fileContents, stat);
    }
};

var sendPage = function (response, filePath, fileContents, stat) {
    var header = constructHeader(filePath, stat);
    response.writeHead(200, header);
    response.end(fileContents);
};

var constructHeader = function (filePath, stat) {
    var header = {};

    var mimeType = mime.lookup(path.basename(filePath));

    if ('application/x-font-ttf' == mimeType) {
        header["Cache-Control"] = "max-age=31536000";
    } else if (0 == mimeType.indexOf('image/')) {
        header["Cache-Control"] = "max-age=7200";
    } else if ('text/css' == mimeType) {
        header["Cache-Control"] = "max-age=600";
    }

    header['Last-Modified'] = new Date(stat.mtime).toGMTString();

    header['Content-type'] = mimeType;

    return header;
};

var parallel = function (tasks, onComplete) {
    var results = {};
    var errors = [];
    var completed = 0;
    var numTasks = Object.keys(tasks).length;

    function fin(err) {
        if (err) {
            log("Error occured: " + err);
            errors.push(err);
        }
        completed++;
        if (completed >= numTasks) {
            onComplete(errors, results);
        }
    }

    for (var k in tasks) {
        tasks[k]((function (k, err, data) {
            return function (err, data) {
                if (err) {
                    fin(err);
                } else {
                    results[k] = data;
                    fin(null);
                }
            }
        })(k));
    }
};

var serverWorking = function (request, response, absPath) {
    fs.exists(absPath, function (exists) {
        if (exists) {
            parallel({
                'stat': function (cb) {
                        fs.stat(absPath, cb);
                    },
                'readFile': function (cb) {
                        fs.readFile(absPath, cb);
                    }
                },
                function (errors, results) {
                    if (errors.length) {
                        log("Error occured: " + errors[0]);
                        send404(response);
                    } else {
                        var fileContents = results['readFile'];
                        var stat = results['stat'];

                        sendResponse(request, response, absPath, fileContents, stat);
                    }
                }
            );
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
    serverWorking(request, response, absPath);
});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log('Server running at http://127.0.0.1:' + port + '/');
