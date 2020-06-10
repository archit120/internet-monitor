
const hostname = '127.0.0.1'
const port = 8008

// const plottable = require('plottable')
const exec = require('child_process').exec;
const http = require('http')

var lre = new RegExp("Latency[^0-9]*([0-9.]*)");
var ure = new RegExp("Upload[^0-9]*([0-9.]*)");
var dre = new RegExp("Download[^0-9]*([0-9.]*)");

const serverId = 15697
const speedtest_delay_sec = 60
const ping_delay_sec = 5
const ping_timeout_ms = 500
const ping_dev_ignore = 0.2


var download_speeds = []
var upload_speeds = []
var latencies = []

function get_dt() {
  var today = new Date();
  return today;
  var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date + ' ' + time;
  return dateTime;
}

function exec_speedtest() {
  exec("speedtest -s " + String(serverId),
    function (error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      var dt = get_dt();

      setTimeout(exec_speedtest, speedtest_delay_sec * 1000)
      if (error !== null) {
        download_speeds.push({ x: dt, y: 0 })
        upload_speeds.push({ x: dt, y: 0 })
        latencies.push({ x: dt, y: 0 })

        return;
      }

      var outs = stdout.split('\n');
      var ds = 0;
      var us = 0;
      var latency = 0;
      outs.forEach(function (str) {
        var match = str.match(dre);
        if (match != null && match.length > 0)
          ds = Number(match[1])
        match = str.match(ure);
        if (match != null && match.length > 0)
          us = Number(match[1])
        match = str.match(lre);
        if (match != null && match.length > 0)
          latency = Number(match[1])
      });
      download_speeds.push({ x: dt, y: ds })
      upload_speeds.push({ x: dt, y: us })
      latencies.push({ x: dt, y: latency })

    });
}

exec_speedtest();

var fs = require('fs');


var server_ips = []
var server_ping = []
var server_map = {}
var server_regex = /\[([0-9]*\.[0-9]*)\]\s([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*).* ([\d.]*) ms/
fs.readFile('pinglist.txt', 'utf8', function (err, data) {
  if (err) throw err;
  var d2 = data.split("\n")
  d2.forEach(function (s) {
    server_ips.push(s);
    server_ping.push([]);
    server_map[s] = server_ips.length - 1;
  });
});

function ping_server() {
  exec("fping -t" + String(ping_timeout_ms) + " -c1 -D < pinglist.txt",
    function (error, stdout, stderr) {
      // console.log('stdout: ' + stdout);
      // console.log('stderr: ' + stderr);
      setTimeout(ping_server, ping_delay_sec * 1000);
      var dt = get_dt();
      var outs = stdout.split("\n");
      server_ping.forEach(function (a) {
        a.push({ x: dt, y: 0 })
      })
      outs.forEach(function (str) {
        var match = str.match(server_regex);
        if (match == null || match.length != 4)
          return;
        var ss = server_ping[server_map[match[2]]];
        ss[ss.length - 1] = { x: dt, y: Number(match[3]) }

      });
    });
}


ping_server();

var ping_data = []

var result = { download_speeds: download_speeds, upload_speeds: upload_speeds, latencies: latencies, ping_data: ping_data }

var index_html = "";
function getRandomColor() {
  var letters = '0123456789ABCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

fs.readFile("index.html", 'utf8', function (err, data) {
  index_html = data;
});


const color = require('color')


function reducePing()
{
  var cdt = get_dt();
  for (var i = 0; i < server_ips.length; i++) {
    var nsping = [server_ping[i][0]];
    var pushed = []
    pushed[0]=1
    for(var x=1; x<server_ping[i].length;x++)
    {
      if(Math.abs(server_ping[i][x]['y']-server_ping[i][x-1]['y'])/server_ping[i][x]['y'] > ping_dev_ignore)
      {
        if(!pushed[x-1])
          nsping.push(server_ping[i][x-1]);
        nsping.push(server_ping[i][x]);
        pushed[x-1]=1;
        pushed[x]=1;
      }
    }
    server_ping[i] = nsping
  }
}

const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.writeHeader(200, { "Content-Type": "text/html" });
  ping_data = []
  for (var i = 0; i < server_ips.length; i++) {
    var cl = getRandomColor();
    reducePing();
    ping_data.push(
      {
        labels: server_ping[i].map(function (x) { return x['x']; }),
        label: server_ips[i],
        backgroundColor: color(cl).alpha(0.5).rgb().string(),
        borderColor: cl,
        data: server_ping[i],
        type: 'line',
        pointRadius: 5,
        fill: false,
        lineTension: 0,
        borderWidth: 2
      }
    );
  }
  result = { download_speeds: download_speeds, upload_speeds: upload_speeds, latencies: latencies, ping_data: ping_data }
  var retval = index_html.replace("REPLACE_WITH_DATA", JSON.stringify(result));
  res.write(retval)
  res.end();
})




server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})