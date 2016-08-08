'use strict';

var express = require('express'),
    http = require('http'),
    request = require('request'),
    Telefam = require('telefam');

var app = express(),
    server = http.createServer(app).listen(80);

app.set('view engine', 'jade');

app.get('/', function (req, res) {
    res.send("ArchWiki Telefam Bot");
});

var Fam = new Telefam('<token>');

app.get('/getMe', function (req, res) {
    Fam.getMe(function (error, info) {
        res.send(info);
    });
});

app.get('/getUpdates', function (req, res) {
    Fam.getUpdates(function (error, updates) {
        res.send(updates);
    });
});

function grabSearch(query_id, query, callback) {
    request({
        url: "https://wiki.archlinux.org/api.php?action=opensearch&search=" + query + "&format=json",
        json: true
    }, function (error, response, body) {
        return callback(error, {
            "query_id": query_id,
            "query": query,
            "body": body
        });
    });
}

function organizeSearch(query_id, data, callback) {
    var articles = [];
    for (var i = 0; i < data[1].length; i++) {
        articles.push({
            "type": "article",
            "id": i + "",
            "title": escape(data[1][i]),
            "message_text": data[3][i]
        });

        if (i == (data.length - 1)) callback(query_id, articles);
    }
}

var lastUpdateId = 0;
setInterval(function () {
    Fam.getUpdates({
        options: {
            offset: lastUpdateId++
        }
    }, function (error, response) {
        if (error) throw error;
        
        if (response.result.length > 0)
            lastUpdateId = response.result[response.result.length - 1].update_id;

        for (var i = 0; i < response.result.length; i++) {
            if (response.result[i].inline_query != null) {
                grabSearch(response.result[i].inline_query.id, response.result[i].inline_query.query, function (error, response) {
                    if (error) throw error;

                    organizeSearch(response.query_id, response.body, function (query_id, articles) {
                        Fam.answerInlineQuery({
                            inline_query_id: query_id,
                            results: articles
                        }, function (error, response) {
                            if (response.ok == false) console.log(response);
                        });
                    });
                });
            }
        }
    });
}, 1000);