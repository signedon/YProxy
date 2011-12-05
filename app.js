
/**
 * Module dependencies.
 */

var express = require('express'),
    request = require('request'),
    http = require('http'),
    qs = require('querystring'),
    colors = require('colors'),
    _ = require('underscore'),
    idCache = {};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'tbh^#$@$#!@&*^^%$5s04v3905tp97gs9h3p5b76gg2(!$@#^' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes


app.get('/:vid', function(req, res, next){
  var videoId = encodeURIComponent(req.params.vid),
      token = '',
      allowedChars = '-_abcdefghijklmnopqrstuvwxyz0123456789',
      parsed;

  if (videoId.length !== 11){
    console.log('Wrong video ID (must be 11 chars). Aborting.'.bold.red);
    return next();
  }

  for (var i = 0; i < videoId.length; ++i){
    if (allowedChars.indexOf(videoId.charAt(i).toLowerCase()) === -1){
      console.log('"'.bold.red + videoId.bold.red + '" is not a valid YouTube video ID. Aborting.'.bold.red);
      return next();
    }
  }

  console.log('Requesting video ID'.bold.green, videoId.bold.green);

  if (!idCache[videoId]) {
    request.get('http://youtube.com/get_video_info?&video_id=' + videoId + '&el=detailpage&ps=default&eurl=&gl=US&hl=en', function (error, response, body) {
      parsed = qs.parse(body);

      var videos = decodeURIComponent(parsed.url_encoded_fmt_stream_map).split(','),
          videosLength,
          video = videos[0];

      videos = _.filter(videos, function(item){
        return item.indexOf('url=') === 0;
      });

      console.log('Found streams:'.bold.grey, videos.length.toString().grey);

      video = video.slice(4);
      video = video.slice(0, video.indexOf('&quality'));

      idCache[videoId] = video;
      console.log('Requesting stream'.bold.grey, video.grey);

      return streamer(video);
      //request.get(video).pipe(res);
    });
  } else {
    return streamer(idCache[videoId]);
  }

  function streamer(video) {
    try {
      var host = /^http\:\/\/(.+)\//.exec(video),
          path = video.slice(host[0].length - 1);
    } catch(e){
      console.log('errrrrrrrrrrrrr', e);
      return;
    }

    /*var originalHeaders = {};

    for(var h in req.headers){
      originalHeaders[h] = req.headers[h];
    }

    originalHeaders.range = req.headers.range;*/

    var options = {
      'hostname': host[1],
      'port': 80,
      'path': path,
      'method': 'GET'
    };

    var v_request = http.request(options, function(resp){
      for(var h in resp.headers){
        res.setHeader(h, resp.headers[h]);
      }

      res.connection.on('error', function(err){
        console.log('error:'.yellow, err);
      });

      res.connection.on('timeout', function(err){
        console.log('timeout:'.yellow, err);
      });

      res.connection.on('close', function(err){
        console.log('CONNECTION CLOSED'.yellow);
        resp.connection.destroy();
        //res.connection.destroy();
        //return;
      });

      res.on('end', function(err){
        console.log('CONNECTION ENDED'.yellow);
        resp.connection.destroy();
        res.end();
        //return;
      });

      resp.on('data', function(chunk){
        res.write(chunk);
      });

    });

    v_request.end();
  }

});


app.all('*', function(req, res){
  console.log(req.method.blue, req.url.blue);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
