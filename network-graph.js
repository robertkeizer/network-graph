console.log( "Starting up.." );
var sys			= require( "sys" );
var fs			= require( "fs" );
var dns			= require( "dns" );
var http		= require( "http" );
var url			= require( "url" );
var io			= require( "socket.io" );
var pcap		= require( "pcap" );
var pcap_session	= pcap.createSession( "", "tcp port 80" );
console.log( "Listening on " + pcap_session.device_name );

var blacklistDnsCache = new Array();
blacklistDnsCache["192.168.1.100"] = 1;

var dnsCacheArray = new Array();
dnsCacheArray["127.0.0.1"] = "localhost";

pcap_session.on( "packet", function( raw_packet ){
	var packet	= pcap.decode.packet( raw_packet );
	if( typeof dnsCacheArray[packet.link.ip.daddr.toString()] == 'undefined' ){
		if( typeof blacklistDnsCache[packet.link.ip.daddr.toString()] == 'undefined' ){
			dns.reverse( packet.link.ip.daddr, function( err, domains ){
				if( !err ){
					for( var x=0; x<domains.length; x++ ){
						dnsCacheArray[packet.link.ip.daddr.toString()] = domains[x];
					}
				}else{
					blacklistDnsCache[packet.link.ip.daddr.toString()] = 1;
				}
			} );
		}else{
			//console.log( "Skipping blacklisted ip of " + packet.link.ip.daddr );
		}
	};

	if( typeof dnsCacheArray[packet.link.ip.daddr.toString()] != 'undefined' ){
		var nameToPass = dnsCacheArray[packet.link.ip.daddr.toString()];
	}else{
		var nameToPass = packet.link.ip.daddr.toString();
	}

	
} );

var httpPort = "8080";

console.log( "Starting HTTP server on port " + httpPort );

httpServer = http.createServer( function(req,res){

	var path = url.parse(req.url).pathname;

	switch( path ){
		case '/':
			res.writeHead( {'Content-Type': 'text/html'} );
			res.write( 'Try /view.html' );
			res.end();
		case '/view.html':
			fs.readFile(__dirname+path,function(err,data){
				if( err ){
					return send404( res );
				};
				res.writeHead( {'Content-Type': 'text/html'} );
				res.write( data, 'utf8' );
				res.end();
			} );
			break;
		default:
			send404(res);
	};
} );

var send404 = function( res ){
	res.writeHead(404);
	res.write('404');
	res.end();
}

httpServer.listen(httpPort);

var io = io.listen( httpServer )
var buffer = new Array();

io.on( 'connection', function( client ){
	client.on( 'message', function(message){
		var msg = { message: [client.sessionId, message] };
		buffer.push( msg );
		console.log( sys.inspect( msg ) );
	} );
	
	client.on( 'disconnect', function( ){
		client.broadcast( { announcement: client.sessionId + 'disconnected.' } );
	} );
} );

console.log( sys.inspect( io ) );
